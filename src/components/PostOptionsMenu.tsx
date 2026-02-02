import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal, Pencil, Trash2, BarChart3, User, VolumeX, Flag, Ban, Trophy, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { usePostActions } from "@/hooks/usePostActions";
import { Post } from "@/hooks/usePosts";

interface PostOptionsMenuProps {
  post: Post;
}

const REPORT_REASONS = [
  { id: "inappropriate", label: "Contenido inapropiado" },
  { id: "bullying", label: "Bullying / acoso" },
  { id: "spam", label: "Spam" },
  { id: "other", label: "Otro" },
];

export function PostOptionsMenu({ post }: PostOptionsMenuProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { deletePost, updatePostText, muteUser, blockUser, reportPost, isLoading } = usePostActions();

  const [open, setOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [editText, setEditText] = useState(post.text || "");
  const [selectedReportReason, setSelectedReportReason] = useState<string | null>(null);

  const isOwnPost = user?.id === post.author_id;
  const isChallenge = post.challenge_id || post.is_challenge_entry;

  // Handler for viewing challenge
  const handleViewChallenge = useCallback(() => {
    navigate("/app/challenges");
    setOpen(false);
  }, [navigate]);

  // Handler for viewing profile
  const handleViewProfile = useCallback(() => {
    navigate(`/u/${post.author_id}`);
    setOpen(false);
  }, [navigate, post.author_id]);

  // Handler for edit text
  const handleEditText = useCallback(() => {
    setEditText(post.text || "");
    setShowEditDialog(true);
    setOpen(false);
  }, [post.text]);

  const handleSaveEdit = useCallback(async () => {
    await updatePostText(post.id, editText);
    setShowEditDialog(false);
  }, [post.id, editText, updatePostText]);

  // Handler for delete
  const handleDeleteClick = useCallback(() => {
    setShowDeleteDialog(true);
    setOpen(false);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    await deletePost(post.id);
    setShowDeleteDialog(false);
  }, [post.id, deletePost]);

  // Handler for stats
  const handleShowStats = useCallback(() => {
    setShowStatsDialog(true);
    setOpen(false);
  }, []);

  // Handler for mute user
  const handleMuteUser = useCallback(async () => {
    await muteUser(post.author_id);
    setOpen(false);
  }, [post.author_id, muteUser]);

  // Handler for report
  const handleReportClick = useCallback(() => {
    setSelectedReportReason(null);
    setShowReportDialog(true);
    setOpen(false);
  }, []);

  const handleConfirmReport = useCallback(async () => {
    if (!selectedReportReason) return;
    const reason = REPORT_REASONS.find((r) => r.id === selectedReportReason)?.label || "Otro";
    await reportPost(post.id, post.author_id, reason);
    setShowReportDialog(false);
  }, [post.id, post.author_id, selectedReportReason, reportPost]);

  // Handler for block
  const handleBlockClick = useCallback(() => {
    setShowBlockDialog(true);
    setOpen(false);
  }, []);

  const handleConfirmBlock = useCallback(async () => {
    await blockUser(post.author_id);
    setShowBlockDialog(false);
  }, [post.author_id, blockUser]);

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-56 z-[999] bg-white border border-gray-200 shadow-xl rounded-xl"
          onClick={(e) => e.stopPropagation()}
          sideOffset={8}
        >
          {/* Challenge option - always first if applicable */}
          {isChallenge && (
            <>
              <DropdownMenuItem
                onClick={handleViewChallenge}
                className="flex items-center gap-3 py-3 cursor-pointer text-black"
              >
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-amber-600" />
                </div>
                <span className="font-medium">Ver desafío</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {/* Own post options */}
          {isOwnPost ? (
            <>
              {/* Edit text - only if post has text */}
              {post.text && (
                <DropdownMenuItem
                  onClick={handleEditText}
                  className="flex items-center gap-3 py-3 cursor-pointer text-black"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Pencil className="w-4 h-4 text-blue-600" />
                  </div>
                  <span>Editar texto</span>
                </DropdownMenuItem>
              )}

              {/* Delete post */}
              <DropdownMenuItem
                onClick={handleDeleteClick}
                className="flex items-center gap-3 py-3 cursor-pointer text-red-600 focus:text-red-600"
              >
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </div>
                <span>Eliminar publicación</span>
              </DropdownMenuItem>

              {/* Stats */}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleShowStats}
                className="flex items-center gap-3 py-3 cursor-pointer text-black"
              >
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-purple-600" />
                </div>
                <span>Ver estadísticas</span>
              </DropdownMenuItem>
            </>
          ) : (
            /* Other user's post options */
            <>
              {/* View profile */}
              <DropdownMenuItem
                onClick={handleViewProfile}
                className="flex items-center gap-3 py-3 cursor-pointer text-black"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <span>Ver perfil</span>
              </DropdownMenuItem>

              {/* Mute user */}
              <DropdownMenuItem
                onClick={handleMuteUser}
                disabled={isLoading}
                className="flex items-center gap-3 py-3 cursor-pointer text-black"
              >
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                  <VolumeX className="w-4 h-4 text-orange-600" />
                </div>
                <span>Silenciar usuario</span>
              </DropdownMenuItem>

              {/* Report */}
              <DropdownMenuItem
                onClick={handleReportClick}
                className="flex items-center gap-3 py-3 cursor-pointer text-black"
              >
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Flag className="w-4 h-4 text-yellow-600" />
                </div>
                <span>Reportar publicación</span>
              </DropdownMenuItem>

              {/* Block user */}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleBlockClick}
                disabled={isLoading}
                className="flex items-center gap-3 py-3 cursor-pointer text-red-600 focus:text-red-600"
              >
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <Ban className="w-4 h-4 text-red-600" />
                </div>
                <span>Bloquear usuario</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar publicación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La publicación será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block Confirmation Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Bloquear a @{post.author?.nick}?</AlertDialogTitle>
            <AlertDialogDescription>
              No podrás ver sus publicaciones ni mensajes. Esta acción se puede deshacer desde ajustes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmBlock} className="bg-red-600 hover:bg-red-700">
              Bloquear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reportar publicación</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <p className="text-sm text-gray-500">¿Por qué quieres reportar esta publicación?</p>
            <div className="space-y-2">
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason.id}
                  onClick={() => setSelectedReportReason(reason.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    selectedReportReason === reason.id
                      ? "border-purple-500 bg-purple-50 text-purple-700"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {reason.label}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmReport}
              disabled={!selectedReportReason || isLoading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Enviar reporte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Text Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar texto</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="Escribe algo..."
              className="min-h-[100px]"
              maxLength={500}
            />
            <p className="text-xs text-gray-400 mt-2 text-right">{editText.length}/500</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isLoading} className="bg-purple-600 hover:bg-purple-700">
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
        <DialogContent className="bg-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Estadísticas</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Me gusta</span>
              <span className="text-2xl font-bold text-purple-600">{post.likes_count}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Comentarios</span>
              <span className="text-2xl font-bold text-purple-600">{post.comments_count || 0}</span>
            </div>
            {isChallenge && (
              <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
                <span className="text-amber-700">Participación en desafío</span>
                <Trophy className="w-6 h-6 text-amber-500" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowStatsDialog(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
