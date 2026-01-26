import { useState } from 'react';
import { useComments } from '@/hooks/useComments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, MessageCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
interface CommentSectionProps {
  postId: string;
  postAuthorId: string;
}
export function CommentSection({
  postId,
  postAuthorId
}: CommentSectionProps) {
  const {
    user,
    profile
  } = useAuth();
  const {
    comments,
    isLoading,
    addComment,
    deleteComment
  } = useComments(postId);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;
    setIsSubmitting(true);
    const {
      error
    } = await addComment(newComment);
    setIsSubmitting(false);
    if (error) {
      toast.error(error.message);
    } else {
      setNewComment('');
    }
  };
  const handleDelete = async (commentId: string) => {
    const {
      error
    } = await deleteComment(commentId);
    if (error) {
      toast.error(error.message);
    }
  };
  if (!isExpanded) {
    return <button onClick={() => setIsExpanded(true)} className="text-muted-foreground hover:text-foreground transition-colors gap-0 text-base items-start justify-center flex flex-row ml-[10px]">
        <MessageCircle className="mx-[20px] w-[25px] h-[25px] mr-[9px]" />
        <span>{comments.length} comentarios</span>
      </button>;
  }
  return <div className="border-t pt-3 mt-3 space-y-3">
      <button onClick={() => setIsExpanded(false)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <MessageCircle className="ml-[60px] w-[20px] h-[20px]" />
        <span>{comments.length} comentarios</span>
      </button>

      {/* Comments List */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {isLoading ? <p className="text-sm text-muted-foreground ml-[20px]">Cargando...</p> : comments.length === 0 ? <p className="text-sm text-muted-foreground">No hay comentarios</p> : comments.map(comment => <div key={comment.id} className="flex gap-2 group">
              <Avatar className="w-6 h-6">
                <AvatarFallback className="text-xs">
                  {comment.author?.nick?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 px-2 py-1 bg-zinc-100 rounded mx-[10px] ml-0 mr-[30px]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium ml-[2px]">{comment.author?.nick}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comment.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
                  </span>
                  {user?.id === comment.author_id && <button onClick={() => handleDelete(comment.id)} className="opacity-0 group-hover:opacity-100 text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>}
                </div>
                <p className="text-secondary-foreground mr-0 text-base ml-[4px]">{comment.text}</p>
              </div>
            </div>)}
      </div>

      {/* Add Comment Form - MVP: Always enabled */}
      <form onSubmit={handleSubmit} className="gap-2 flex-row flex items-start justify-center mr-[30px]">
        <Input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Escribe un comentario..." className="flex-1 h-8 text-sm" maxLength={200} />
        <Button type="submit" size="sm" disabled={!newComment.trim() || isSubmitting} className="h-8 w-8 p-0">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>;
}