import { useAuth } from '@/hooks/useAuth';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Users, Clock, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { pendingUsers, allUsers, isLoading, approveUser, revokeApproval } = useAdminUsers();

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleApprove = async (userId: string, nick: string) => {
    const { error } = await approveUser(userId);
    if (error) {
      toast.error(`Error al aprobar: ${error.message}`);
    } else {
      toast.success(`Usuario ${nick} aprobado`);
    }
  };

  const handleRevoke = async (userId: string, nick: string) => {
    const { error } = await revokeApproval(userId);
    if (error) {
      toast.error(`Error al revocar: ${error.message}`);
    } else {
      toast.success(`Aprobación revocada para ${nick}`);
    }
  };

  const approvedUsers = allUsers.filter(u => u.parent_approved);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold">Panel de Administración</h1>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-muted-foreground" />
                <span className="text-2xl font-bold">{allUsers.length}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Total usuarios</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-500" />
                <span className="text-2xl font-bold">{pendingUsers.length}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Pendientes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-2xl font-bold">{approvedUsers.length}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Aprobados</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              Usuarios Pendientes de Aprobación
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No hay usuarios pendientes
              </p>
            ) : (
              <div className="space-y-3">
                {pendingUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user.nick}</span>
                        <Badge variant="secondary">{user.age_group}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Tutor: {user.tutor_email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Registrado: {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(user.id, user.nick)}
                      className="gap-1"
                    >
                      <Check className="w-4 h-4" />
                      Aprobar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approved Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              Usuarios Aprobados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {approvedUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No hay usuarios aprobados
              </p>
            ) : (
              <div className="space-y-3">
                {approvedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user.nick}</span>
                        <Badge variant="secondary">{user.age_group}</Badge>
                        <Badge className="bg-green-500">Aprobado</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Tutor: {user.tutor_email}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRevoke(user.id, user.nick)}
                      className="gap-1"
                    >
                      <X className="w-4 h-4" />
                      Revocar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
