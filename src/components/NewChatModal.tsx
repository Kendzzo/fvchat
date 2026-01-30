import { useState } from "react";
import { motion } from "framer-motion";
import { Search, MessageSquarePlus, Loader2, Users, AlertCircle } from "lucide-react";
import { useFriendships, Friendship } from "@/hooks/useFriendships";
import { useAuth } from "@/hooks/useAuth";
import type { Chat } from "@/hooks/useChats";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
interface NewChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChatCreated: (chat: Chat) => void;
  chats: any[]; // o Chat[] si lo importas
  createChat: (participantIds: string[], isGroup?: boolean, name?: string) => Promise<any>;
}
export function NewChatModal({ open, onOpenChange, onChatCreated, chats, createChat }: NewChatModalProps) {
  const { user, canInteract } = useAuth();
  const { friends, isLoading: friendsLoading } = useFriendships();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState<string | null>(null);

  // Filter friends by search query
  const filteredFriends = friends.filter((f) =>
    (f.friend?.nick || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const handleSelectFriend = async (friendship: Friendship) => {
    if (!user || !friendship.friend) return;
    setIsCreating(friendship.id);
    const otherUserId = friendship.friend.id;

    // Check if direct chat already exists
    const existingChat = chats.find(
      (chat) =>
        !chat.is_group &&
        chat.participant_ids.length === 2 &&
        chat.participant_ids.includes(user.id) &&
        chat.participant_ids.includes(otherUserId),
    );

    if (existingChat) {
      // Close modal first, then navigate
      onOpenChange(false);
      // Small delay to allow modal to close before navigation
      setTimeout(() => {
        onChatCreated(existingChat);
      }, 100);
      setIsCreating(null);
      return;
    }

    // Create new chat - wait for the full response
    const { data, error } = await createChat([otherUserId], false);

    if (error) {
      toast.error(`Error al crear chat: ${error.message}`);
      setIsCreating(null);
      return;
    }

    if (data) {
      // Close modal first
      onOpenChange(false);
      toast.success(`Chat con @${friendship.friend.nick} creado`);
      // Small delay to allow modal to close and state to update
      setTimeout(() => {
        onChatCreated(data);
      }, 100);
    }
    setIsCreating(null);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5" />
            Nuevo chat
          </DialogTitle>
        </DialogHeader>

        {!canInteract ? (
          <div className="py-6 text-center">
            <AlertCircle className="w-12 h-12 text-warning mx-auto mb-3" />
            <p className="text-muted-foreground">Cuenta pendiente de aprobación parental</p>
            <p className="text-sm text-muted-foreground mt-2">
              No puedes crear chats hasta que tu tutor apruebe tu cuenta.
            </p>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar amigo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2 mt-2">
              {friendsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {searchQuery ? "No se encontraron amigos" : "No tienes amigos aún"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">Añade amigos desde tu perfil para poder chatear</p>
                </div>
              ) : (
                filteredFriends.map((friendship) => (
                  <motion.button
                    key={friendship.id}
                    whileHover={{
                      scale: 1.02,
                    }}
                    whileTap={{
                      scale: 0.98,
                    }}
                    onClick={() => handleSelectFriend(friendship)}
                    disabled={isCreating === friendship.id}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-card/80 border transition-colors disabled:opacity-50 border-white"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary p-0.5">
                      <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-lg">
                        {(friendship.friend?.avatar_data as any)?.emoji || "👤"}
                      </div>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-sm">@{friendship.friend?.nick || "Usuario"}</p>
                      <p className="text-xs text-muted-foreground">{friendship.friend?.age_group} años</p>
                    </div>
                    {isCreating === friendship.id && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                  </motion.button>
                ))
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
