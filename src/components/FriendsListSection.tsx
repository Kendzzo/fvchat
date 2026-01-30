import { useState, useEffect } from "react";
import { Users, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProfilePhoto } from "./ProfilePhoto";
import { FriendRequestButton } from "./FriendRequestButton";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

interface Friend {
  id: string;
  nick: string;
  avatar_snapshot_url: string | null;
  profile_photo_url: string | null;
}

interface FriendsListSectionProps {
  userId: string;
  isOwnProfile?: boolean;
}

export function FriendsListSection({ userId, isOwnProfile = false }: FriendsListSectionProps) {
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchFriends = async () => {
      if (!userId) return;

      try {
        setIsLoading(true);

        // Get all approved friendships for this user
        const { data: friendships, error } = await supabase
          .from("friendships")
          .select("sender_id, receiver_id")
          .eq("status", "approved")
          .eq("tutor_approved", true)
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

        if (error) {
          console.error("Error fetching friendships:", error);
          return;
        }

        // Extract friend IDs
        const friendIds = (friendships || []).map((f) =>
          f.sender_id === userId ? f.receiver_id : f.sender_id
        );

        if (friendIds.length === 0) {
          setFriends([]);
          return;
        }

        // Fetch friend profiles
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, nick, avatar_snapshot_url, profile_photo_url")
          .in("id", friendIds);

        if (profilesError) {
          console.error("Error fetching friend profiles:", profilesError);
          return;
        }

        setFriends(profiles || []);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFriends();
  }, [userId]);

  const displayedFriends = showAll ? friends : friends.slice(0, 6);

  if (isLoading) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Amigos</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Skeleton className="w-14 h-14 rounded-full" />
              <Skeleton className="w-16 h-3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Amigos</h3>
          <span className="text-sm text-muted-foreground ml-auto">0</span>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">
          {isOwnProfile ? "Aún no tienes amigos" : "Este usuario aún no tiene amigos"}
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-semibold">Amigos</h3>
        <span className="text-sm text-muted-foreground ml-auto">{friends.length}</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {displayedFriends.map((friend) => (
          <div
            key={friend.id}
            className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-card/50 transition-colors cursor-pointer"
            onClick={() => navigate(`/u/${friend.id}`)}
          >
            <ProfilePhoto
              url={friend.profile_photo_url || friend.avatar_snapshot_url}
              nick={friend.nick}
              size="md"
            />
            <span className="text-xs text-muted-foreground truncate max-w-full">
              @{friend.nick}
            </span>
            {!isOwnProfile && (
              <div onClick={(e) => e.stopPropagation()}>
                <FriendRequestButton targetUserId={friend.id} targetNick={friend.nick} />
              </div>
            )}
          </div>
        ))}
      </div>

      {friends.length > 6 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-4 py-2 text-sm text-primary flex items-center justify-center gap-1 hover:underline"
        >
          {showAll ? "Ver menos" : `Ver todos (${friends.length})`}
          <ChevronRight className={`w-4 h-4 transition-transform ${showAll ? "rotate-90" : ""}`} />
        </button>
      )}
    </div>
  );
}
