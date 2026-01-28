import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Friendship {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "approved" | "rejected";
  tutor_approved: boolean;
  created_at: string;
  friend?: {
    id: string;
    nick: string;
    avatar_data: Record<string, unknown>;
    age_group: string;
    avatar_snapshot_url?: string | null;
    profile_photo_url?: string | null;
  };
}

export function useFriendships() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFriendships = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Get all friendships where user is sender or receiver
      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      if (error) {
        console.error("Error fetching friendships:", error);
        return;
      }

      // Separate approved friends and pending requests
      const approvedFriends: Friendship[] = [];
      const pending: Friendship[] = [];

      for (const friendship of data || []) {
        const friendId = friendship.sender_id === user.id ? friendship.receiver_id : friendship.sender_id;

        // Fetch friend profile including avatar_snapshot_url
        const { data: friendData } = await supabase
          .from("profiles")
          .select("id, nick, avatar_data, age_group, avatar_snapshot_url, profile_photo_url")
          .eq("id", friendId)
          .maybeSingle();

        const friendshipWithProfile = {
          ...friendship,
          friend: friendData,
        } as Friendship;

        if (friendship.status === "approved" && friendship.tutor_approved) {
          approvedFriends.push(friendshipWithProfile);
        } else if (friendship.status === "pending" && friendship.receiver_id === user.id) {
          pending.push(friendshipWithProfile);
        }
      }

      setFriends(approvedFriends);
      setPendingRequests(pending);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const sendFriendRequest = async (receiverId: string) => {
    if (!user) return { error: new Error("No autenticado") };

    try {
      const { data, error: insertError } = await supabase
        .from("friendships")
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          status: "pending",
          tutor_approved: false,
        })
        .select()
        .single();

      if (insertError) {
        return { error: new Error(insertError.message) };
      }

      return { data, error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const acceptFriendRequest = async (friendshipId: string) => {
    if (!user) return { error: new Error("No autenticado") };

    try {
      // For development, auto-approve tutor
      const { error: updateError } = await supabase
        .from("friendships")
        .update({
          status: "approved",
          tutor_approved: true, // Auto-approve for development
        })
        .eq("id", friendshipId)
        .eq("receiver_id", user.id);

      if (updateError) {
        return { error: new Error(updateError.message) };
      }

      await fetchFriendships();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const rejectFriendRequest = async (friendshipId: string) => {
    if (!user) return { error: new Error("No autenticado") };

    try {
      const { error: updateError } = await supabase
        .from("friendships")
        .update({ status: "rejected" })
        .eq("id", friendshipId)
        .eq("receiver_id", user.id);

      if (updateError) {
        return { error: new Error(updateError.message) };
      }

      await fetchFriendships();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const removeFriend = async (friendshipId: string) => {
    if (!user) return { error: new Error("No autenticado") };

    try {
      const { error: deleteError } = await supabase.from("friendships").delete().eq("id", friendshipId);

      if (deleteError) {
        return { error: new Error(deleteError.message) };
      }

      await fetchFriendships();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const searchUsers = async (query: string) => {
    if (!user || query.length < 2) return [];

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nick, avatar_data, age_group")
        .neq("id", user.id)
        .ilike("nick", `%${query}%`)
        .limit(10);

      if (error) {
        console.error("Error searching users:", error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error("Error:", err);
      return [];
    }
  };

  useEffect(() => {
    fetchFriendships();

    // Subscribe to friendship updates
    const channel = supabase
      .channel("friendships-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friendships",
        },
        () => {
          fetchFriendships();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    friends,
    pendingRequests,
    isLoading,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    searchUsers,
    refreshFriendships: fetchFriendships,
  };
}
