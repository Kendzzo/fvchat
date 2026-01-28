import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Post {
  id: string;
  author_id: string;
  type: "photo" | "video" | "text" | "audio" | "image";
  content_url: string | null;
  text: string | null;
  privacy: "friends_only" | "same_age_group";
  likes_count: number;
  is_challenge_entry: boolean;
  challenge_id: string | null;
  created_at: string;
  author?: {
    nick: string;
    profile_photo_url?: string | null;
  };
  isLiked?: boolean;
  comments_count?: number;
}

export function usePosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from("posts")
        .select(
          `
          *,
          author:profiles!posts_author_id_fkey(nick, profile_photo_url)
        `,
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (fetchError) {
        console.error("Error fetching posts:", fetchError);
        setError(fetchError.message);
        return;
      }

      // Get comments count for each post
      const postsWithCounts = await Promise.all(
        (data || []).map(async (post) => {
          const { count } = await supabase
            .from("comments")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id);

          return {
            ...post,
            comments_count: count || 0,
            isLiked: false, // TODO: Check if user liked this post
          } as Post;
        }),
      );

      setPosts(postsWithCounts);
    } catch (err) {
      console.error("Error:", err);
      setError("Error al cargar publicaciones");
    } finally {
      setIsLoading(false);
    }
  };

  const createPost = async (postData: {
    type: Post["type"];
    content_url?: string;
    text?: string;
    privacy: Post["privacy"];
    is_challenge_entry?: boolean;
    challenge_id?: string;
  }) => {
    if (!user) return { error: new Error("No autenticado") };

    try {
      const { data, error: insertError } = await supabase
        .from("posts")
        .insert({
          author_id: user.id,
          ...postData,
        })
        .select()
        .single();

      if (insertError) {
        return { error: new Error(insertError.message) };
      }

      await fetchPosts();
      return { data, error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const toggleLike = async (postId: string) => {
    setPosts(
      posts.map((post) => {
        if (post.id === postId) {
          const newLikeCount = post.isLiked ? post.likes_count - 1 : post.likes_count + 1;

          // Update in database
          supabase.from("posts").update({ likes_count: newLikeCount }).eq("id", postId).then();

          return {
            ...post,
            isLiked: !post.isLiked,
            likes_count: newLikeCount,
          };
        }
        return post;
      }),
    );
  };

  const deletePost = async (postId: string) => {
    if (!user) return { error: new Error("No autenticado") };

    try {
      const { error: deleteError } = await supabase.from("posts").delete().eq("id", postId);

      if (deleteError) {
        return { error: new Error(deleteError.message) };
      }

      setPosts(posts.filter((p) => p.id !== postId));
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [user]);

  return {
    posts,
    isLoading,
    error,
    createPost,
    toggleLike,
    deletePost,
    refreshPosts: fetchPosts,
  };
}
