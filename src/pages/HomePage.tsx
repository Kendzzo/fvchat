import { useState, useEffect, useMemo } from 'react';
import { usePosts } from '@/hooks/usePosts';
import { useFriendships } from '@/hooks/useFriendships';
import { useAuth } from '@/hooks/useAuth';
import { AvatarBadge } from '@/components/avatar/AvatarBadge';
import { CommentSection } from '@/components/CommentSection';
import { Heart, X, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const { profile } = useAuth();
  const { posts, isLoading: postsLoading, toggleLike } = usePosts();
  const { friends, isLoading: friendsLoading } = useFriendships();
  const navigate = useNavigate();
  
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);

  // Listen for home reset event (when user taps Home in bottom nav)
  useEffect(() => {
    const handleHomeReset = () => {
      setSelectedFriendId(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('vfc-home-reset', handleHomeReset);
    return () => window.removeEventListener('vfc-home-reset', handleHomeReset);
  }, []);

  // Get friends with recent posts, ordered by latest post
  const friendsWithPosts = useMemo(() => {
    if (!friends.length || !posts.length) return [];

    const friendPostMap = new Map<string, { friend: typeof friends[0]['friend'], latestPostDate: Date }>();

    for (const post of posts) {
      const friendInfo = friends.find(f => f.friend?.id === post.author_id);
      if (friendInfo?.friend) {
        const existing = friendPostMap.get(post.author_id);
        const postDate = new Date(post.created_at);
        if (!existing || postDate > existing.latestPostDate) {
          friendPostMap.set(post.author_id, {
            friend: friendInfo.friend,
            latestPostDate: postDate
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
    return posts.filter(post => post.author_id === selectedFriendId);
  }, [posts, selectedFriendId]);

  const selectedFriend = useMemo(() => {
    if (!selectedFriendId) return null;
    return friendsWithPosts.find(f => f.friend?.id === selectedFriendId)?.friend;
  }, [selectedFriendId, friendsWithPosts]);

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  return (
    <div className="pb-20">
      {/* Friend Stories Row */}
      <div className="px-4 py-3 border-b overflow-x-auto">
        <div className="flex gap-3 min-w-max">
          {/* My Story */}
          <button 
            onClick={() => navigate('/app/publish')}
            className="flex flex-col items-center gap-1 min-w-[64px]"
          >
            <div className="relative">
              <AvatarBadge
                avatarUrl={profile?.avatar_snapshot_url}
                nick={profile?.nick || ''}
                size="lg"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                <Plus className="w-3 h-3 text-primary-foreground" />
              </div>
            </div>
            <span className="text-xs text-muted-foreground truncate max-w-[64px]">Tu historia</span>
          </button>

          {/* Friends Stories */}
          {friendsLoading ? (
            <>
              {[1, 2, 3].map(i => (
                <div key={i} className="flex flex-col items-center gap-1 min-w-[64px]">
                  <Skeleton className="w-14 h-14 rounded-full" />
                  <Skeleton className="w-12 h-3" />
                </div>
              ))}
            </>
          ) : (
            friendsWithPosts.map(({ friend }) => friend && (
              <button
                key={friend.id}
                onClick={() => setSelectedFriendId(
                  selectedFriendId === friend.id ? null : friend.id
                )}
                className={`flex flex-col items-center gap-1 min-w-[64px] transition-opacity ${
                  selectedFriendId && selectedFriendId !== friend.id ? 'opacity-50' : ''
                }`}
              >
                <AvatarBadge
                  avatarUrl={friend.avatar_snapshot_url}
                  nick={friend.nick}
                  size="lg"
                  showBorder={selectedFriendId === friend.id}
                />
                <span className="text-xs text-muted-foreground truncate max-w-[64px]">
                  {friend.nick}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Filter Banner */}
      {selectedFriend && (
        <div className="bg-primary/10 px-4 py-2 flex items-center justify-between">
          <span className="text-sm">
            Viendo publicaciones de <strong>@{selectedFriend.nick}</strong>
          </span>
          <button
            onClick={() => setSelectedFriendId(null)}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <X className="w-4 h-4" />
            Quitar filtro
          </button>
        </div>
      )}

      {/* Feed */}
      <div className="space-y-4 p-4">
        {postsLoading ? (
          <>
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="w-24 h-4" />
                    <Skeleton className="w-16 h-3" />
                  </div>
                </div>
                <Skeleton className="w-full h-48 rounded-lg" />
              </div>
            ))}
          </>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {selectedFriendId ? (
              <p>Este amigo aún no tiene publicaciones</p>
            ) : (
              <p>No hay publicaciones. ¡Sé el primero en publicar!</p>
            )}
          </div>
        ) : (
          filteredPosts.map(post => (
            <article key={post.id} className="bg-card rounded-xl overflow-hidden shadow-sm">
              {/* Post Header */}
              <div className="p-4 flex items-center gap-3">
                <AvatarBadge
                  avatarUrl={post.author?.avatar_snapshot_url}
                  nick={post.author?.nick || ''}
                  size="sm"
                  showBorder={false}
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">{post.author?.nick}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTimeAgo(post.created_at)}
                  </p>
                </div>
              </div>

              {/* Post Content */}
              {post.content_url && (post.type === 'photo' || post.type === 'image') && (
                <img
                  src={post.content_url}
                  alt="Publicación"
                  className="w-full aspect-square object-cover"
                />
              )}
              {post.content_url && post.type === 'video' && (
                <video
                  src={post.content_url}
                  controls
                  className="w-full aspect-video"
                />
              )}
              {post.text && (
                <div className="px-4 py-2">
                  <p className="text-sm">{post.text}</p>
                </div>
              )}

              {/* Post Actions */}
              <div className="p-4 pt-2">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className="flex items-center gap-1 text-sm hover:text-primary transition-colors"
                  >
                    <Heart
                      className={`w-5 h-5 ${post.isLiked ? 'fill-red-500 text-red-500' : ''}`}
                    />
                    <span>{post.likes_count}</span>
                  </button>
                </div>

                {/* Comments */}
                <CommentSection postId={post.id} postAuthorId={post.author_id} />
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
