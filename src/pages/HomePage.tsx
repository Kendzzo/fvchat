import { useState, useEffect, useMemo } from 'react';
import { usePosts } from '@/hooks/usePosts';
import { useFriendships } from '@/hooks/useFriendships';
import { useAuth } from '@/hooks/useAuth';
import { AvatarBadge } from '@/components/avatar/AvatarBadge';
import { CommentSection } from '@/components/CommentSection';
import { Heart, X, Plus, MessageCircle, MoreHorizontal, ImageOff, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

// Emoji placeholders for friends without avatars
const FRIEND_EMOJIS = ['🎮', '🎨', '🛹', '⚽', '🎸', '🎯', '🌟', '🦋', '🚀', '🎭'];

export default function HomePage() {
  const { profile } = useAuth();
  const { posts, isLoading: postsLoading, toggleLike } = usePosts();
  const { friends, isLoading: friendsLoading } = useFriendships();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'publicaciones' | 'desafios'>('publicaciones');
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null);

  // Listen for home reset event
  useEffect(() => {
    const handleHomeReset = () => {
      setSelectedFriendId(null);
      setOpenCommentsPostId(null);
      setActiveTab('publicaciones');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('vfc-home-reset', handleHomeReset);
    return () => window.removeEventListener('vfc-home-reset', handleHomeReset);
  }, []);

  // Get friends with recent posts
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

    if (diffMins < 1) return 'ahora mismo';
    if (diffMins < 60) return `hace ${diffMins} min`;
    if (diffHours < 24) return `alrededor de ${diffHours} horas`;
    if (diffDays === 1) return 'ayer';
    return `hace ${diffDays} días`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600/20 via-background to-background pb-20">
      {/* Header with Tabs */}
      <div className="bg-gradient-to-r from-purple-700 to-purple-500 px-4 pt-4 pb-0">
        <div className="flex">
          <button
            onClick={() => setActiveTab('publicaciones')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-white font-semibold transition-all ${
              activeTab === 'publicaciones' ? 'opacity-100' : 'opacity-60'
            }`}
          >
            <ImageOff className="w-5 h-5" />
            Publicaciones
          </button>
          <button
            onClick={() => {
              setActiveTab('desafios');
              navigate('/app/challenges');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-white font-semibold transition-all ${
              activeTab === 'desafios' ? 'opacity-100' : 'opacity-60'
            }`}
          >
            <Trophy className="w-5 h-5" />
            Desafíos
          </button>
        </div>
        {/* Tab indicator */}
        <div className="flex">
          <div className={`h-1 transition-all duration-300 ${
            activeTab === 'publicaciones' 
              ? 'w-1/2 bg-white rounded-full' 
              : 'w-0'
          }`} />
        </div>
      </div>

      {/* Stories Row */}
      <div className="bg-gradient-to-b from-purple-200/80 to-purple-100/50 px-4 py-5 overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {/* Tu historia */}
          <button 
            onClick={() => navigate('/app/publish')}
            className="flex flex-col items-center gap-2 min-w-[80px]"
          >
            <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center shadow-md">
              <Plus className="w-8 h-8 text-gray-500" />
            </div>
            <span className="text-sm font-medium text-gray-700">Tu historia</span>
          </button>

          {/* Friends Stories */}
          {friendsLoading ? (
            <>
              {[1, 2, 3].map(i => (
                <div key={i} className="flex flex-col items-center gap-2 min-w-[80px]">
                  <Skeleton className="w-20 h-20 rounded-full" />
                  <Skeleton className="w-16 h-4" />
                </div>
              ))}
            </>
          ) : friendsWithPosts.length > 0 ? (
            friendsWithPosts.map(({ friend }, index) => friend && (
              <button
                key={friend.id}
                onClick={() => setSelectedFriendId(
                  selectedFriendId === friend.id ? null : friend.id
                )}
                className={`flex flex-col items-center gap-2 min-w-[80px] transition-opacity ${
                  selectedFriendId && selectedFriendId !== friend.id ? 'opacity-50' : ''
                }`}
              >
                <div className={`w-20 h-20 rounded-full bg-white/90 flex items-center justify-center shadow-md ${
                  selectedFriendId === friend.id ? 'ring-4 ring-primary' : ''
                }`}>
                  {friend.avatar_snapshot_url ? (
                    <img 
                      src={friend.avatar_snapshot_url} 
                      alt={friend.nick}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl">{FRIEND_EMOJIS[index % FRIEND_EMOJIS.length]}</span>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700 truncate max-w-[80px]">
                  {friend.nick}
                </span>
              </button>
            ))
          ) : (
            // Placeholder friends when no real friends
            <>
              {['Amigo1', 'Amigo2', 'Amigo3'].map((name, i) => (
                <div key={name} className="flex flex-col items-center gap-2 min-w-[80px] opacity-50">
                  <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center shadow-md">
                    <span className="text-4xl">{FRIEND_EMOJIS[i]}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">{name}</span>
                </div>
              ))}
            </>
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
          <div className="text-center py-12 text-muted-foreground">
            {selectedFriendId ? (
              <p>Este amigo aún no tiene publicaciones</p>
            ) : (
              <p>No hay publicaciones. ¡Sé el primero en publicar!</p>
            )}
          </div>
        ) : (
          filteredPosts.map(post => (
            <article key={post.id} className="bg-white rounded-3xl overflow-hidden shadow-sm">
              {/* Post Header */}
              <div className="p-4 flex items-center gap-3">
                <div className="p-0.5 rounded-full bg-gradient-to-r from-purple-500 via-teal-400 to-teal-500">
                  <div className="w-12 h-12 rounded-full bg-white p-0.5">
                    {post.author?.avatar_snapshot_url ? (
                      <img 
                        src={post.author.avatar_snapshot_url} 
                        alt={post.author?.nick}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-purple-900 flex items-center justify-center">
                        <svg className="w-6 h-6 text-teal-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-teal-600">@{post.author?.nick}</p>
                  <p className="text-sm text-gray-500">
                    {formatTimeAgo(post.created_at)}
                  </p>
                </div>
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <MoreHorizontal className="w-6 h-6" />
                </button>
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
              {post.text && !post.content_url && (
                <div className="px-4 py-6 bg-gradient-to-br from-purple-100 to-teal-50">
                  <p className="text-lg text-center">{post.text}</p>
                </div>
              )}
              {post.text && post.content_url && (
                <div className="px-4 py-2">
                  <p className="text-sm text-gray-700">{post.text}</p>
                </div>
              )}

              {/* Post Actions */}
              <div className="p-4">
                <div className="flex items-center gap-6">
                  {/* Like button */}
                  <button
                    onClick={() => toggleLike(post.id)}
                    className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors"
                  >
                    <Heart
                      className={`w-6 h-6 ${post.isLiked ? 'fill-red-500 text-red-500' : ''}`}
                    />
                    <span className="font-medium">{post.likes_count}</span>
                  </button>

                  {/* Comments button */}
                  <button
                    onClick={() => setOpenCommentsPostId(prev => prev === post.id ? null : post.id)}
                    className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors"
                  >
                    <MessageCircle className="w-6 h-6" />
                    <span className="font-medium">{post.comments_count || 0}</span>
                  </button>
                </div>

                {/* Comments Section */}
                {openCommentsPostId === post.id && (
                  <CommentSection postId={post.id} postAuthorId={post.author_id} />
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}