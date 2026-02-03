import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ModerationEvent {
  id: string;
  user_id: string;
  surface: "chat" | "post" | "comment";
  text_snippet: string;
  allowed: boolean;
  categories: string[];
  severity: "low" | "medium" | "high" | null;
  reason: string;
  created_at: string;
  user_nick?: string;
}

export interface TutorNotification {
  id: string;
  tutor_email: string;
  user_id: string;
  type: "strike_limit" | "suspension" | "warning";
  status: "queued" | "sent" | "failed" | "dismissed";
  payload: Record<string, unknown>;
  created_at: string;
  sent_at: string | null;
  error: string | null;
  user_nick?: string;
}

export interface UserWithStrikes {
  id: string;
  nick: string;
  suspended_until: string | null;
  strikes_24h: number;
  status: "active" | "suspended";
  language_infractions_count: number;
}

export function useAdminModeration() {
  const { isAdmin } = useAuth();
  const [events, setEvents] = useState<ModerationEvent[]>([]);
  const [notifications, setNotifications] = useState<TutorNotification[]>([]);
  const [usersWithStrikes, setUsersWithStrikes] = useState<UserWithStrikes[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchModerationEvents = useCallback(
    async (filters?: { dateRange?: "today" | "7days"; userId?: string; category?: string; severity?: string }) => {
      if (!isAdmin) return;

      try {
        let query = supabase
          .from("moderation_events")
          .select("*")
          .eq("allowed", false)
          .order("created_at", { ascending: false })
          .limit(100);

        if (filters?.dateRange === "today") {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          query = query.gte("created_at", today.toISOString());
        } else if (filters?.dateRange === "7days") {
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          query = query.gte("created_at", weekAgo.toISOString());
        }

        if (filters?.userId) {
          query = query.eq("user_id", filters.userId);
        }

        if (filters?.severity) {
          query = query.eq("severity", filters.severity);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching moderation events:", error);
          return;
        }

        // Fetch user nicks
        if (data && data.length > 0) {
          const userIds = [...new Set(data.map((e) => e.user_id))];
          const { data: profiles } = await supabase.from("profiles").select("id, nick").in("id", userIds);

          const nickMap = new Map(profiles?.map((p) => [p.id, p.nick]) || []);

          const eventsWithNicks = data.map((event) => ({
            ...event,
            categories: event.categories || [],
            user_nick: nickMap.get(event.user_id) || "Unknown",
          })) as ModerationEvent[];

          // Filter by category if specified
          if (filters?.category) {
            setEvents(eventsWithNicks.filter((e) => e.categories.includes(filters.category!)));
          } else {
            setEvents(eventsWithNicks);
          }
        } else {
          setEvents([]);
        }
      } catch (err) {
        console.error("Error:", err);
      }
    },
    [isAdmin],
  );

  const fetchTutorNotifications = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const { data, error } = await supabase
        .from("tutor_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching notifications:", error);
        return;
      }

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((n) => n.user_id))];
        const { data: profiles } = await supabase.from("profiles").select("id, nick").in("id", userIds);

        const nickMap = new Map(profiles?.map((p) => [p.id, p.nick]) || []);

        setNotifications(
          data.map((n) => ({
            ...n,
            user_nick: nickMap.get(n.user_id) || "Unknown",
          })) as TutorNotification[],
        );
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error("Error:", err);
    }
  }, [isAdmin]);

  const fetchUsersWithStrikes = useCallback(async () => {
    if (!isAdmin) return;

    try {
      // Get all profiles
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, nick, suspended_until, language_infractions_count")
        .order("nick");

      if (error) {
        console.error("Error fetching profiles:", error);
        return;
      }

      if (!profiles) {
        setUsersWithStrikes([]);
        return;
      }

      // Get strike counts for each user
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: strikeCounts } = await supabase
        .from("moderation_events")
        .select("user_id")
        .eq("allowed", false)
        .gte("created_at", twentyFourHoursAgo);

      const strikeMap = new Map<string, number>();
      strikeCounts?.forEach((s) => {
        strikeMap.set(s.user_id, (strikeMap.get(s.user_id) || 0) + 1);
      });

      const usersData: UserWithStrikes[] = profiles.map((p) => {
        const now = new Date();
        const isSuspended = p.suspended_until && new Date(p.suspended_until) > now;

        return {
          id: p.id,
          nick: p.nick,
          suspended_until: p.suspended_until,
          strikes_24h: strikeMap.get(p.id) || 0,
          status: isSuspended ? "suspended" : "active",
          language_infractions_count: (p as any).language_infractions_count ?? 0,
        };
      });

      // Sort by strikes (descending) then by suspended status
      usersData.sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === "suspended" ? -1 : 1;
        }
        return b.strikes_24h - a.strikes_24h;
      });

      setUsersWithStrikes(usersData);
    } catch (err) {
      console.error("Error:", err);
    }
  }, [isAdmin]);

  const suspendUser = useCallback(
    async (userId: string) => {
      if (!isAdmin) return { error: new Error("No autorizado") };

      try {
        const suspendedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const { error } = await supabase
          .from("profiles")
          .update({ suspended_until: suspendedUntil.toISOString() })
          .eq("id", userId);

        if (error) {
          return { error: new Error(error.message) };
        }

        await fetchUsersWithStrikes();
        return { error: null };
      } catch (err) {
        return { error: err as Error };
      }
    },
    [isAdmin, fetchUsersWithStrikes],
  );

  const liftSuspension = useCallback(
    async (userId: string) => {
      if (!isAdmin) return { error: new Error("No autorizado") };

      try {
        const { error } = await supabase
          .from("profiles")
          .update({
            suspended_until: null,
            language_infractions_count: 0,
            strikes_reset_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (error) {
          return { error: new Error(error.message) };
        }

        await fetchUsersWithStrikes();
        return { error: null };
      } catch (err) {
        return { error: err as Error };
      }
    },
    [isAdmin, fetchUsersWithStrikes],
  );

  const dismissNotification = useCallback(
    async (notificationId: string) => {
      if (!isAdmin) return { error: new Error("No autorizado") };

      try {
        const { error } = await supabase
          .from("tutor_notifications")
          .update({ status: "dismissed" })
          .eq("id", notificationId);

        if (error) {
          return { error: new Error(error.message) };
        }

        await fetchTutorNotifications();
        return { error: null };
      } catch (err) {
        return { error: err as Error };
      }
    },
    [isAdmin, fetchTutorNotifications],
  );

  useEffect(() => {
    if (isAdmin) {
      setIsLoading(true);
      Promise.all([fetchModerationEvents(), fetchTutorNotifications(), fetchUsersWithStrikes()]).finally(() =>
        setIsLoading(false),
      );
    }
  }, [isAdmin, fetchModerationEvents, fetchTutorNotifications, fetchUsersWithStrikes]);

  return {
    events,
    notifications,
    usersWithStrikes,
    isLoading,
    fetchModerationEvents,
    fetchTutorNotifications,
    fetchUsersWithStrikes,
    suspendUser,
    liftSuspension,
    dismissNotification,
  };
}
