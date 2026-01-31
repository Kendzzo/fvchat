import { useAuth } from '@/hooks/useAuth';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { useAdminModeration } from '@/hooks/useAdminModeration';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Check, X, Users, Clock, Shield, AlertTriangle, 
  Ban, Bell, Eye, RefreshCw, Filter, Sticker, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function AdminPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { pendingUsers, allUsers, isLoading: usersLoading, approveUser, revokeApproval } = useAdminUsers();
  const { 
    events, 
    notifications, 
    usersWithStrikes, 
    isLoading: moderationLoading,
    fetchModerationEvents,
    suspendUser,
    liftSuspension,
    dismissNotification
  } = useAdminModeration();

  const [dateFilter, setDateFilter] = useState<'today' | '7days' | undefined>(undefined);
  const [severityFilter, setSeverityFilter] = useState<string | undefined>(undefined);
  const [isSeedingStickers, setIsSeedingStickers] = useState(false);

  const isLoading = authLoading || usersLoading || moderationLoading;

  const handleSeedStickers = async () => {
    setIsSeedingStickers(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-stickers', {
        body: { count: 20 }
      });
      
      if (error) {
        toast.error(`Error al generar stickers: ${error.message}`);
      } else {
        toast.success(`Stickers generados: ${data?.generated || 0}`);
        console.log('[Admin] Seed stickers result:', data);
      }
    } catch (err) {
      console.error('[Admin] Error seeding stickers:', err);
      toast.error('Error al generar stickers');
    } finally {
      setIsSeedingStickers(false);
    }
  };

  if (authLoading) {
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

  const handleSuspend = async (userId: string, nick: string) => {
    const { error } = await suspendUser(userId);
    if (error) {
      toast.error(`Error: ${error.message}`);
    } else {
      toast.success(`${nick} suspendido por 24h`);
    }
  };

  const handleLiftSuspension = async (userId: string, nick: string) => {
    const { error } = await liftSuspension(userId);
    if (error) {
      toast.error(`Error: ${error.message}`);
    } else {
      toast.success(`Suspensión levantada para ${nick}`);
    }
  };

  const handleDismissNotification = async (notificationId: string) => {
    const { error } = await dismissNotification(notificationId);
    if (error) {
      toast.error(`Error: ${error.message}`);
    } else {
      toast.success('Notificación marcada como resuelta');
    }
  };

  const applyFilters = () => {
    fetchModerationEvents({ dateRange: dateFilter, severity: severityFilter });
  };

  const maskEmail = (email: string) => {
    const [user, domain] = email.split('@');
    if (!domain) return email;
    return `${user.slice(0, 2)}***@${domain}`;
  };

  const maskText = (text: string) => {
    // Mask phone numbers and emails in text
    return text
      .replace(/\d{9}/g, '***')
      .replace(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g, '***')
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, '[email]');
  };

  const approvedUsers = allUsers.filter(u => u.parent_approved);
  const queuedNotifications = notifications.filter(n => n.status === 'queued');

  const getSeverityColor = (severity: string | null) => {
    switch (severity) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-orange-500';
      case 'low': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const navigate = useNavigate();

  const handleCloseAdmin = () => {
    navigate('/app/profile');
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">Panel de Administración</h1>
          </div>
          <Button 
            variant="outline" 
            onClick={handleCloseAdmin}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Cerrar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-muted-foreground" />
                <span className="text-2xl font-bold">{allUsers.length}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Total</p>
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
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-2xl font-bold">{events.length}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Eventos mod.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-destructive" />
                <span className="text-2xl font-bold">
                  {usersWithStrikes.filter(u => u.status === 'suspended').length}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Suspendidos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-orange-500" />
                <span className="text-2xl font-bold">{queuedNotifications.length}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Avisos pend.</p>
            </CardContent>
          </Card>
        </div>

        {/* Sticker Seed Tool */}
        <Card className="border-secondary/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sticker className="w-6 h-6 text-secondary" />
                <div>
                  <h3 className="font-semibold">Generar Stickers IA</h3>
                  <p className="text-sm text-muted-foreground">
                    Crea stickers automáticamente para el catálogo
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleSeedStickers}
                disabled={isSeedingStickers}
                className="gap-2"
              >
                {isSeedingStickers ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Sticker className="w-4 h-4" />
                    Generar 20 Stickers
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="moderation" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="moderation">Moderación</TabsTrigger>
            <TabsTrigger value="users">Usuarios</TabsTrigger>
            <TabsTrigger value="pending">Pendientes</TabsTrigger>
            <TabsTrigger value="notifications">Avisos Tutor</TabsTrigger>
          </TabsList>

          {/* Moderation Events Tab */}
          <TabsContent value="moderation">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Eventos de Moderación
                  </span>
                  <div className="flex gap-2">
                    <select 
                      className="text-sm border rounded px-2 py-1"
                      value={dateFilter || ''}
                      onChange={(e) => setDateFilter(e.target.value as 'today' | '7days' || undefined)}
                    >
                      <option value="">Todos</option>
                      <option value="today">Hoy</option>
                      <option value="7days">7 días</option>
                    </select>
                    <select 
                      className="text-sm border rounded px-2 py-1"
                      value={severityFilter || ''}
                      onChange={(e) => setSeverityFilter(e.target.value || undefined)}
                    >
                      <option value="">Severidad</option>
                      <option value="high">Alta</option>
                      <option value="medium">Media</option>
                      <option value="low">Baja</option>
                    </select>
                    <Button size="sm" variant="outline" onClick={applyFilters}>
                      <Filter className="w-4 h-4 mr-1" />
                      Filtrar
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground text-center py-4">Cargando...</p>
                ) : events.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No hay eventos de moderación
                  </p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {events.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                      >
                        <div className={`w-2 h-2 rounded-full mt-2 ${getSeverityColor(event.severity)}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">@{event.user_nick}</span>
                            <Badge variant="outline" className="text-xs">{event.surface}</Badge>
                            {event.categories?.map((cat: string) => (
                              <Badge key={cat} variant="secondary" className="text-xs">{cat}</Badge>
                            ))}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {maskText(event.text_snippet)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(event.created_at).toLocaleString('es-ES')}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              const user = usersWithStrikes.find(u => u.nick === event.user_nick);
                              if (user && user.status !== 'suspended') {
                                handleSuspend(user.id, user.nick);
                              }
                            }}
                            className="text-xs"
                          >
                            <Ban className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users with Strikes Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Usuarios y Strikes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground text-center py-4">Cargando...</p>
                ) : usersWithStrikes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No hay usuarios
                  </p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {usersWithStrikes.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">@{user.nick}</span>
                            {user.strikes_24h > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {user.strikes_24h} strikes
                              </Badge>
                            )}
                            {user.status === 'suspended' ? (
                              <Badge className="bg-red-500 text-xs">Suspendido</Badge>
                            ) : (
                              <Badge className="bg-green-500 text-xs">Activo</Badge>
                            )}
                          </div>
                          {user.suspended_until && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Hasta: {new Date(user.suspended_until).toLocaleString('es-ES')}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {user.status === 'suspended' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleLiftSuspension(user.id, user.nick)}
                              className="gap-1"
                            >
                              <Check className="w-4 h-4" />
                              Levantar
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleSuspend(user.id, user.nick)}
                              className="gap-1"
                            >
                              <Ban className="w-4 h-4" />
                              Suspender
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending Users Tab */}
          <TabsContent value="pending">
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
                            Tutor: {maskEmail(user.tutor_email)}
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
            <Card className="mt-4">
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
                  <div className="space-y-3 max-h-64 overflow-y-auto">
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
                            Tutor: {maskEmail(user.tutor_email)}
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
          </TabsContent>

          {/* Tutor Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-orange-500" />
                  Avisos a Tutor
                </CardTitle>
              </CardHeader>
              <CardContent>
                {notifications.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No hay notificaciones
                  </p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">@{notification.user_nick}</span>
                            <Badge 
                              variant={notification.type === 'suspension' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {notification.type}
                            </Badge>
                            <Badge 
                              variant="outline"
                              className={`text-xs ${
                                notification.status === 'queued' ? 'border-orange-500 text-orange-500' :
                                notification.status === 'sent' ? 'border-green-500 text-green-500' :
                                notification.status === 'failed' ? 'border-red-500 text-red-500' :
                                'border-gray-500 text-gray-500'
                              }`}
                            >
                              {notification.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Tutor: {maskEmail(notification.tutor_email)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(notification.created_at).toLocaleString('es-ES')}
                          </p>
                          {notification.error && (
                            <p className="text-xs text-destructive mt-1">
                              Error: {notification.error}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {notification.status === 'queued' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDismissNotification(notification.id)}
                                className="text-xs"
                              >
                                Resolver
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled
                                className="text-xs"
                                title="Email no configurado"
                              >
                                <RefreshCw className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
