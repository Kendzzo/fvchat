import { useState, useEffect } from 'react';
import { useComments } from '@/hooks/useComments';
import { useModeration } from '@/hooks/useModeration';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, MessageCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { ModerationWarning } from '@/components/ModerationWarning';
import { SuspensionBanner } from '@/components/SuspensionBanner';
import { ProfilePhoto } from '@/components/ProfilePhoto';

interface CommentSectionProps {
  postId: string;
  postAuthorId: string;
}

export function CommentSection({
  postId,
  postAuthorId
}: CommentSectionProps) {
  const { user, profile } = useAuth();
  const { comments, isLoading, addComment, deleteComment } = useComments(postId);
  const { checkContent, isChecking, suspensionInfo, formatSuspensionTime, checkSuspension } = useModeration();
  
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [moderationError, setModerationError] = useState<{ reason: string; strikes?: number } | null>(null);

  // Check suspension on mount
  useEffect(() => {
    checkSuspension();
  }, [checkSuspension]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting || isChecking) return;

    setModerationError(null);
    
    // Check content with moderation
    const result = await checkContent(newComment, 'comment');
    
    if (!result.allowed) {
      setModerationError({ reason: result.reason || 'Contenido no permitido', strikes: result.strikes });
      return;
    }

    setIsSubmitting(true);
    const { error } = await addComment(newComment);
    setIsSubmitting(false);
    
    if (error) {
      toast.error(error.message);
    } else {
      setNewComment('');
    }
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await deleteComment(commentId);
    if (error) {
      toast.error(error.message);
    }
  };

  const isSuspended = suspensionInfo.suspended && suspensionInfo.until && suspensionInfo.until > new Date();

  if (!isExpanded) {
    return (
      <button onClick={() => setIsExpanded(true)} className="text-muted-foreground hover:text-foreground transition-colors gap-0 text-base items-start justify-center flex flex-row ml-[10px] py-0 mt-[2px]">
        <MessageCircle className="mx-[20px] w-[25px] h-[25px] mr-[9px]" />
        <span>{comments.length} comentarios</span>
      </button>
    );
  }

  return (
    <div className="border-t pt-3 mt-3 space-y-3">
      <button onClick={() => setIsExpanded(false)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <MessageCircle className="ml-[60px] w-[20px] h-[20px]" />
        <span>{comments.length} comentarios</span>
      </button>

      {/* Suspension Banner */}
      {isSuspended && suspensionInfo.until && (
        <div className="mx-4">
          <SuspensionBanner until={suspensionInfo.until} formatTime={formatSuspensionTime} />
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {isLoading ? (
          <p className="text-sm text-muted-foreground ml-[20px]">Cargando...</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay comentarios</p>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="flex gap-2 group">
              <ProfilePhoto 
                url={comment.author?.avatar_snapshot_url}
                nick={comment.author?.nick || ''}
                size="xs"
                showBorder={false}
              />
              <div className="flex-1 px-2 py-1 bg-zinc-100 rounded mx-[10px] ml-0 mr-[30px]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium ml-[2px]">{comment.author?.nick}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comment.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  {user?.id === comment.author_id && (
                    <button onClick={() => handleDelete(comment.id)} className="opacity-0 group-hover:opacity-100 text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="text-secondary-foreground mr-0 text-base ml-[4px]">{comment.text}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Moderation Warning */}
      {moderationError && (
        <div className="mx-4">
          <ModerationWarning 
            reason={moderationError.reason} 
            strikes={moderationError.strikes}
            onDismiss={() => setModerationError(null)}
          />
        </div>
      )}

      {/* Add Comment Form */}
      <form onSubmit={handleSubmit} className="gap-2 flex-row flex items-start justify-center mr-[30px]">
        <Input 
          value={newComment} 
          onChange={e => {
            setNewComment(e.target.value);
            setModerationError(null);
          }} 
          placeholder={isSuspended ? "Cuenta bloqueada temporalmente" : "Escribe un comentario..."} 
          className="flex-1 h-8 text-sm" 
          maxLength={200}
          disabled={isSuspended}
        />
        <Button 
          type="submit" 
          size="sm" 
          disabled={!newComment.trim() || isSubmitting || isChecking || isSuspended} 
          className="h-8 w-8 p-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}