import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Search, Check, Loader2, X, ArrowRight } from "lucide-react";
import { useFriendships, Friendship } from "@/hooks/useFriendships";
import { useAuth } from "@/hooks/useAuth";
import type { Chat } from "@/hooks/useChats";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ProfilePhoto } from "@/components/ProfilePhoto";

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupCreated: (chat: Chat) => void;
  createChat: (participantIds: string[], isGroup?: boolean, name?: string) => Promise<any>;
}

export function CreateGroupModal({ 
  open, 
  onOpenChange, 
  onGroupCreated, 
  createChat 
}: CreateGroupModalProps) {
  const { user } = useAuth();
  const { friends, isLoading: friendsLoading } = useFriendships();
  const [step, setStep] = useState<"select" | "name">("select");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Filter friends by search query
  const filteredFriends = friends.filter((f) =>
    (f.friend?.nick || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleNext = () => {
    if (selectedFriends.length < 1) {
      toast.error("Selecciona al menos 1 amigo");
      return;
    }
    setStep("name");
  };

  const handleBack = () => {
    setStep("select");
  };

  const handleCreate = async () => {
    if (!user) return;
    
    const trimmedName = groupName.trim();
    if (!trimmedName) {
      toast.error("Escribe un nombre para el grupo");
      return;
    }

    if (selectedFriends.length < 1) {
      toast.error("Selecciona al menos 1 amigo");
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await createChat(selectedFriends, true, trimmedName);

      if (error) {
        toast.error(`Error al crear grupo: ${error.message}`);
        return;
      }

      if (data) {
        toast.success(`Grupo "${trimmedName}" creado`);
        onOpenChange(false);
        resetModal();
        setTimeout(() => {
          onGroupCreated(data);
        }, 100);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const resetModal = () => {
    setStep("select");
    setSelectedFriends([]);
    setGroupName("");
    setSearchQuery("");
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetModal();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {step === "select" ? "Nuevo grupo" : "Nombre del grupo"}
          </DialogTitle>
        </DialogHeader>

        {step === "select" ? (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar amigos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Selected count */}
            {selectedFriends.length > 0 && (
              <div className="text-sm text-primary font-medium">
                {selectedFriends.length} amigo{selectedFriends.length !== 1 ? "s" : ""} seleccionado{selectedFriends.length !== 1 ? "s" : ""}
              </div>
            )}

            {/* Friends list */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px] max-h-[300px]">
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
                </div>
              ) : (
                filteredFriends.map((friendship) => {
                  const isSelected = selectedFriends.includes(friendship.friend?.id || "");
                  
                  return (
                    <motion.button
                      key={friendship.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => friendship.friend?.id && toggleFriend(friendship.friend.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                        isSelected 
                          ? "bg-primary/10 border-primary" 
                          : "bg-card hover:bg-card/80 border-border"
                      }`}
                    >
                      <ProfilePhoto
                        url={(friendship.friend as any)?.profile_photo_url}
                        nick={friendship.friend?.nick || "Usuario"}
                        size="md"
                      />
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-sm">@{friendship.friend?.nick || "Usuario"}</p>
                        <p className="text-xs text-muted-foreground">{friendship.friend?.age_group} años</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected 
                          ? "bg-primary border-primary" 
                          : "border-border"
                      }`}>
                        {isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
                      </div>
                    </motion.button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <Button
              onClick={handleNext}
              disabled={selectedFriends.length < 1}
              className="w-full"
            >
              Siguiente
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </>
        ) : (
          <>
            {/* Group name input */}
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
                  <Users className="w-10 h-10 text-white" />
                </div>
              </div>
              
              <Input
                type="text"
                placeholder="Nombre del grupo..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="text-center text-lg"
                maxLength={30}
                autoFocus
              />
              
              <p className="text-xs text-muted-foreground text-center">
                {selectedFriends.length + 1} miembros (tú y {selectedFriends.length} amigo{selectedFriends.length !== 1 ? "s" : ""})
              </p>
            </div>

            {/* Footer */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1"
              >
                Atrás
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!groupName.trim() || isCreating}
                className="flex-1"
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Crear grupo"
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
