import { useState, useEffect, useMemo } from "react";
import { usePosts } from "@/hooks/usePosts";
import { useFriendships } from "@/hooks/useFriendships";
import { useAuth } from "@/hooks/useAuth";
import { CommentSection } from "@/components/CommentSection";
import { PostStickerRenderer } from "@/components/PostStickerRenderer";
import { Badge } from "@/components/ui/badge";
import { Heart, X, Plus, MessageCircle, MoreHorizontal, Swords } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import vfcLogo from "@/assets/vfc-logo.png";

// Emoji placeholders for friends without avatars
const FRIEND_EMOJIS = ["🎮", "🎨", "🛹", "⚽", "🎸", "🎯", "🌟", "🦋", "🚀", "🎭"];
export default function HomePage() {
  const { profile } = useAuth();
  const { posts, isLoading: postsLoading, toggleLike } = usePosts();
  const { friends, isLoading: friendsLoading } = useFriendships();
  const navigate = useNavigate();
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null);

  // Listen for home reset event
  useEffect(() => {
    const handleHomeReset = () => {
      setSelectedFriendId(null);
      setOpenCommentsPostId(null);
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    };
    window.addEventListener("vfc-home-reset", handleHomeReset);
    return () => window.removeEventListener("vfc-home-reset", handleHomeReset);
  }, []);

  // Get friends with recent posts
  const friendsWithPosts = useMemo(() => {
    if (!friends.length || !posts.length) return [];
    const friendPostMap = new Map<
      string,
      {
        friend: (typeof friends)[0]["friend"];
        latestPostDate: Date;
      }
    >();
    for (const post of posts) {
      const friendInfo = friends.find((f) => f.friend?.id === post.author_id);
      if (friendInfo?.friend) {
        const existing = friendPostMap.get(post.author_id);
        const postDate = new Date(post.created_at);
        if (!existing || postDate > existing.latestPostDate) {
          friendPostMap.set(post.author_id, {
            friend: friendInfo.friend,
            latestPostDate: postDate,
          });
        }
      }
    }
    return Array.from(friendPostMap.values())
      .sort((a, b) => b.latestPostDate.getTime() - a.latestPostDate.getTime())
      .slice(0, 10);
  }, [friends, posts]);

  // Filter posts by selected friend
  const filteredPosts = useMemo(() => {
    if (!selectedFriendId) return posts;
    return posts.filter((post) => post.author_id === selectedFriendId);
  }, [posts, selectedFriendId]);
  const selectedFriend = useMemo(() => {
    if (!selectedFriendId) return null;
    return friendsWithPosts.find((f) => f.friend?.id === selectedFriendId)?.friend;
  }, [selectedFriendId, friendsWithPosts]);
  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffMins < 1) return "ahora mismo";
    if (diffMins < 60) return `hace ${diffMins} min`;
    if (diffHours < 24) return `alrededor de ${diffHours} horas`;
    if (diffDays === 1) return "ayer";
    return `hace ${diffDays} días`;
  };
  return (
    <div className="min-h-screen pb-20 bg-purple-50">
      {/* Header - Dark purple with logo and title */}
      <div className="sticky top-0 z-40">
        {/* Main header bar */}
        <div className="bg-gradient-to-b from-[#2d1b4e] to-[#251542] px-4 pt-3 pb-2 py-[5px]">
          <div className="flex items-center gap-3 ml-[10px]">
            {/* VFC Logo */}
            <img src={vfcLogo} alt="VFC" className="h-10 w-auto object-contain" />
            {/* Title */}
            <span className="text-white text-xl font-semibold tracking-wide ml-[20px]">Publicaciones</span>
          </div>
        </div>

        {/* Green indicator line */}
        <div className="bg-[#251542] px-4 pb-1"></div>
      </div>

      {/* Stories Row - Light purple background #e8e6ff */}
      <div
        className="px-4 py-4 overflow-x-auto bg-purple-50"
        style={{
          backgroundColor: "#e8e6ff",
        }}
      >
        <div className="flex gap-5 min-w-max">
          {/* Tu historia */}
          <button onClick={() => navigate("/app/publish")} className="flex flex-col items-center gap-2 min-w-[72px]">
            <div className="w-[68px] h-[68px] rounded-full p-[3px] bg-gradient-to-br from-purple-400 via-purple-500 to-teal-400">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <Plus className="w-7 h-7 text-gray-600" strokeWidth={2.5} />
              </div>
            </div>
            <span className="font-bold text-base text-black">Tu historia</span>
          </button>

          {/* Friends Stories */}
          {friendsLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col items-center gap-2 min-w-[72px]">
                  <Skeleton className="w-[68px] h-[68px] rounded-full" />
                  <Skeleton className="w-12 h-3" />
                </div>
              ))}
            </>
          ) : friendsWithPosts.length > 0 ? (
            friendsWithPosts.map(
              ({ friend }, index) =>
                friend && (
                  <button
                    key={friend.id}
                    onClick={() => setSelectedFriendId(selectedFriendId === friend.id ? null : friend.id)}
                    className={`flex flex-col items-center gap-2 min-w-[72px] transition-opacity ${selectedFriendId && selectedFriendId !== friend.id ? "opacity-50" : ""}`}
                  >
                    <div
                      className={`w-[68px] h-[68px] rounded-full p-[3px] bg-gradient-to-br from-purple-400 via-purple-500 to-teal-400 ${selectedFriendId === friend.id ? "ring-2 ring-purple-600 ring-offset-2" : ""}`}
                    >
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                        {friend.profile_photo_url ? (
                          <img
                            src={friend.profile_photo_url}
                            alt={friend.nick}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl">{FRIEND_EMOJIS[index % FRIEND_EMOJIS.length]}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gray-700 truncate max-w-[68px]">{friend.nick}</span>
                  </button>
                ),
            )
          ) : (
            // Placeholder friends when no real friends
            <>
              {["Amigo1", "Amigo2", "Amigo3", "Amigo4"].map((name, i) => (
                <div key={name} className="flex flex-col items-center gap-2 min-w-[72px]">
                  <div className="w-[68px] h-[68px] rounded-full p-[3px] bg-gradient-to-br from-purple-400 via-purple-500 to-teal-400">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                      <span className="text-2xl">{FRIEND_EMOJIS[i]}</span>
                    </div>
                  </div>
                  <span className="font-medium text-sm text-black">{name}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Filter Banner */}
      {selectedFriend && (
        <div className="bg-purple-100 px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-purple-800">
            Viendo publicaciones de <strong>@{selectedFriend.nick}</strong>
          </span>
          <button
            onClick={() => setSelectedFriendId(null)}
            className="flex items-center gap-1 text-sm text-purple-600 hover:underline"
          >
            <X className="w-4 h-4" />
            Quitar filtro
          </button>
        </div>
      )}

      {/* Feed */}
      <div className="space-y-4 p-4 min-h-[60vh] bg-purple-50 pt-0 pb-0">
        {postsLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-3xl p-4 space-y-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="w-24 h-4" />
                    <Skeleton className="w-32 h-3" />
                  </div>
                </div>
                <Skeleton className="w-full h-64 rounded-2xl" />
              </div>
            ))}
          </>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white/80 rounded-3xl">
            {selectedFriendId ? (
              <p>Este amigo aún no tiene publicaciones</p>
            ) : (
              <p>No hay publicaciones. ¡Sé el primero en publicar!</p>
            )}
          </div>
        ) : (
          filteredPosts.map((post) => (
            <article key={post.id} className="bg-white rounded-3xl overflow-hidden shadow-sm">
              {/* Post Header - Instagram style */}
              <div className="p-3 flex items-center gap-3 mb-0">
                <div className="p-0.5 rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-teal-400">
                  <div className="w-11 h-11 rounded-full bg-white p-0.5">
                    {post.author?.avatar_snapshot_url ? (
                      <img
                        src={post.author.avatar_snapshot_url}
                        alt={post.author?.nick}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-purple-900 flex items-center justify-center">
                        <svg className="w-5 h-5 text-teal-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-black text-xl">@{post.author?.nick}</p>
                    {/* Challenge badge */}
                    {(post.challenge_id || post.is_challenge_entry) && (
                      <Badge
                        variant="secondary"
                        className="text-xs px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0"
                      >
                        <Swords className="w-3 h-3 mr-1" />
                        DESAFÍO
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 ml-[5px]">{formatTimeAgo(post.created_at)}</p>
                </div>
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>

              {/* Post Content */}
              {post.content_url && (post.type === "photo" || post.type === "image") && (
                <div className="relative">
                  <img src={post.content_url} alt="Publicación" className="w-full aspect-square object-cover" />
                  <PostStickerRenderer postId={post.id} />
                </div>
              )}
              {post.content_url && post.type === "video" && (
                <video src={post.content_url} controls className="w-full aspect-video" />
              )}
              {post.text && !post.content_url && (
                <div className="px-4 py-8 bg-gradient-to-br from-purple-100 to-teal-50">
                  <p className="text-lg text-center text-gray-800">{post.text}</p>
                </div>
              )}
              {post.text && post.content_url && (
                <div className="px-4 py-2">
                  <p className="text-gray-700 text-lg">
                    <span className="font-bold mr-1">@{post.author?.nick}</span>
                    {post.text}
                  </p>
                </div>
              )}

              {/* Post Actions - Instagram style */}
              <div className="px-4 py-3">
                <div className="flex items-center gap-4">
                  {/* Like button */}
                  <button
                    onClick={() => toggleLike(post.id)}
                    className="flex items-center gap-1 text-gray-700 hover:text-red-500 transition-colors"
                  >
                    <Heart className={`w-6 h-6 ${post.isLiked ? "fill-red-500 text-red-500" : ""}`} />
                  </button>

                  {/* Comments button */}
                  <button
                    onClick={() => setOpenCommentsPostId((prev) => (prev === post.id ? null : post.id))}
                    className="flex items-center gap-1 text-gray-700 hover:text-purple-600 transition-colors"
                  >
                    <MessageCircle className="w-6 h-6" />
                  </button>
                </div>

                {/* Likes count */}
                {post.likes_count > 0 && (
                  <p className="mt-2 text-sm font-semibold text-gray-900">{post.likes_count} Me gusta</p>
                )}

                {/* Comments count */}
                {post.comments_count && post.comments_count > 0 && (
                  <button
                    onClick={() => setOpenCommentsPostId((prev) => (prev === post.id ? null : post.id))}
                    className="text-sm text-gray-500 mt-1"
                  >
                    Ver los {post.comments_count} comentarios
                  </button>
                )}

                {/* Comments Section */}
                {openCommentsPostId === post.id && <CommentSection postId={post.id} postAuthorId={post.author_id} />}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
