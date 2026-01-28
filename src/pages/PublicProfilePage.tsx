import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ProfilePhoto } from '@/components/ProfilePhoto';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Heart, Users, FileImage, CheckCircle, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
interface PublicProfile {
  id: string;
  nick: string;
  age_group: string;
  avatar_snapshot_url: string | null;
  parent_approved: boolean;
}
interface ProfileStats {
  postsCount: number;
  friendsCount: number;
  likesTotal: number;
}
export default function PublicProfilePage() {
  const {
    userId
  } = useParams<{
    userId: string;
  }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats>({
    postsCount: 0,
    friendsCount: 0,
    likesTotal: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }
      try {
        // Fetch profile
        const {
          data: profileData,
          error: profileError
        } = await supabase.from('profiles').select('id, nick, age_group, avatar_snapshot_url, parent_approved').eq('id', userId).maybeSingle();
        if (profileError || !profileData) {
          setNotFound(true);
          setIsLoading(false);
          return;
        }
        setProfile(profileData);

        // Fetch stats in parallel
        const [postsRes, friendsRes] = await Promise.all([
        // Posts count + total likes
        supabase.from('posts').select('likes_count').eq('author_id', userId),
        // Friends count (approved friendships)
        supabase.from('friendships').select('id', {
          count: 'exact',
          head: true
        }).eq('status', 'approved').eq('tutor_approved', true).or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)]);
        const postsData = postsRes.data || [];
        const postsCount = postsData.length;
        const likesTotal = postsData.reduce((sum, post) => sum + (post.likes_count || 0), 0);
        const friendsCount = friendsRes.count || 0;
        setStats({
          postsCount,
          friendsCount,
          likesTotal
        });
      } catch (err) {
        console.error('Error fetching public profile:', err);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [userId]);
  if (isLoading) {
    return <div className="min-h-screen bg-background p-4">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="w-32 h-6" />
        </div>
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="w-24 h-24 rounded-full" />
          <Skeleton className="w-32 h-6" />
          <Skeleton className="w-24 h-4" />
        </div>
        <div className="flex justify-around mt-8">
          <Skeleton className="w-16 h-16" />
          <Skeleton className="w-16 h-16" />
          <Skeleton className="w-16 h-16" />
        </div>
      </div>;
  }
  if (notFound) {
    return <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-lg text-muted-foreground mb-4">Usuario no encontrado</p>
        <Button onClick={() => navigate(-1)} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
      </div>;
  }
  return <div className="min-h-screen bg-purple-50">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Perfil</h1>
      </div>

      {/* Profile Info */}
      <div className="flex flex-col items-center py-8 px-4 border-transparent bg-primary-foreground">
        <ProfilePhoto url={profile?.avatar_snapshot_url} nick={profile?.nick || ''} size="xl" />
        <h2 className="mt-4 text-xl font-bold text-secondary-foreground">@{profile?.nick}</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Grupo de edad: {profile?.age_group}
        </p>

        {/* Approval badge */}
        <div className={`mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${profile?.parent_approved ? 'bg-green-500/20 text-green-600' : 'bg-yellow-500/20 text-yellow-600'}`}>
          {profile?.parent_approved ? <>
              <CheckCircle className="w-4 h-4" />
              <span>Cuenta aprobada</span>
            </> : <>
              <Clock className="w-4 h-4" />
              <span>Pendiente de aprobación</span>
            </>}
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-around py-6 border-t border-b mx-4">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <FileImage className="w-5 h-5 text-primary" />
          </div>
          <span className="font-bold text-secondary-foreground text-4xl">{stats.postsCount}</span>
          <span className="text-xs text-muted-foreground">Publicaciones</span>
        </div>

        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mb-2">
            <Users className="w-5 h-5 text-secondary" />
          </div>
          <span className="font-bold text-secondary-foreground text-4xl">{stats.friendsCount}</span>
          <span className="text-xs text-muted-foreground">Amigos</span>
        </div>

        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
            <Heart className="w-5 h-5 text-red-500" />
          </div>
          <span className="font-bold text-secondary-foreground text-4xl">{stats.likesTotal}</span>
          <span className="text-xs text-muted-foreground">Likes</span>
        </div>
      </div>

      {/* Back button */}
      <div className="p-4">
        <Button onClick={() => navigate(-1)} variant="outline" className="w-full">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
      </div>
    </div>;
}