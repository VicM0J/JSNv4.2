import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, CheckCircle, Info, Clock, Bell, Package, RefreshCw, Plus, X, XCircle, Trash2 } from "lucide-react";
import { type Transfer } from "@shared/schema";
import clsx from "clsx";

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingTransfers = [] } = useQuery<Transfer[]>({
    queryKey: ["/api/transfers/pending"],
    enabled: open,
  });

  const { data: repositionNotifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
    enabled: open,
    refetchInterval: 2000, // Refrescar cada 2 segundos cuando el panel está abierto
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/notifications");
      const allNotifications = await res.json();
      // Filtrar solo notificaciones de reposiciones no leídas
      return allNotifications.filter((n: any) => 
        !n.read && (
          n.type?.includes('reposition') || 
          n.type?.includes('completion') ||
          n.type === 'new_reposition' ||
          n.type === 'reposition_transfer' ||
          n.type === 'reposition_approved' ||
          n.type === 'reposition_rejected' ||
          n.type === 'reposition_completed' ||
          n.type === 'reposition_deleted' ||
          n.type === 'completion_approval_needed'
        )
      );
    },
  });

  const acceptTransferMutation = useMutation({
    mutationFn: async (transferId: number) => {
      const res = await apiRequest("POST", `/api/transfers/${transferId}/accept`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Transferencia aceptada",
        description: "La transferencia ha sido aceptada exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transfers/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al aceptar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectTransferMutation = useMutation({
    mutationFn: async (transferId: number) => {
      const res = await apiRequest("POST", `/api/transfers/${transferId}/reject`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Transferencia rechazada",
        description: "La transferencia ha sido rechazada",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transfers/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al rechazar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markNotificationReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const res = await apiRequest("POST", `/api/repositions/${notificationId}/read`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const getAreaDisplayName = (area: string) => {
    const names: Record<string, string> = {
      corte: "Corte",
      bordado: "Bordado",
      ensamble: "Ensamble",
      plancha: "Plancha/Empaque",
      calidad: "Calidad",
      envios: "Envíos",
      admin: "Admin",
      diseño: "Diseño",
    };
    return names[area] || area;
  };

  const formatDate = (dateInput: string | Date) => {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `Hace ${diffDays} día${diffDays > 1 ? "s" : ""} - ${date.toLocaleString('es-ES', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'America/Mexico_City'
      })}`;
    } else if (diffHours > 0) {
      return `Hace ${diffHours} hora${diffHours > 1 ? "s" : ""} - ${date.toLocaleString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'America/Mexico_City'
      })}`;
    } else {
      return `Hace unos minutos - ${date.toLocaleString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'America/Mexico_City'
      })}`;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'transfer':
        return <ArrowRight className="w-4 h-4 text-blue-600" />;
      case 'order_completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'order_created':
        return <Plus className="w-4 h-4 text-purple-600" />;
      case 'new_reposition':
      case 'reposition_created':
        return <Plus className="w-4 h-4 text-purple-600" />;
      case 'reposition_approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'reposition_rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'reposition_completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'reposition_deleted':
        return <Trash2 className="w-4 h-4 text-red-600" />;
      case 'reposition_transfer':
        return <ArrowRight className="w-4 h-4 text-blue-600" />;
      case 'transfer_processed':
        return <RefreshCw className="w-4 h-4 text-blue-600" />;
      case 'reposition_received':
        return <Package className="w-4 h-4 text-green-600" />;
      case 'completion_approval_needed':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-96 bg-white/60 backdrop-blur-lg border-l border-gray-200 dark:bg-gray-900/70 dark:border-gray-700 transition-all">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between text-xl font-semibold text-gray-800 dark:text-white">
            <div className="flex items-center gap-2">
              <Bell className="text-indigo-600" size={20} />
              Notificaciones
            </div>
            {(pendingTransfers.length + repositionNotifications.length) > 0 && (
              <Badge variant="destructive">{pendingTransfers.length + repositionNotifications.length}</Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6 overflow-y-auto h-full pb-24 custom-scroll">
          {repositionNotifications.length > 0 && (
            <>
              <p className="text-sm font-medium text-gray-500">Reposiciones</p>
              {repositionNotifications.map((notification: any) => (
                <div
                  key={notification.id}
                  className="bg-white/80 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md rounded-xl p-4 transition-all duration-300 ease-out hover:shadow-xl animate-fade-in cursor-pointer"
                  onClick={() => markNotificationReadMutation.mutate(notification.id)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-100">
                        {notification.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        {notification.repositionId && (
                          <Badge variant="outline" className="text-xs">
                            Reposición #{notification.repositionId}
                          </Badge>
                        )}
                        <p className="text-xs text-gray-500">{formatDate(notification.createdAt)}</p>
                      </div>
                      {notification.type === 'completion_approval_needed' && (
                        <div className="mt-2 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                          <p className="text-xs text-yellow-800 font-medium">
                            Solicitud de finalización pendiente de aprobación
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <hr className="border-t border-gray-300 dark:border-gray-600" />
            </>
          )}

          {pendingTransfers.length > 0 && (
            <>
              <p className="text-sm font-medium text-gray-500">Transferencias Pendientes</p>
              {pendingTransfers.map((transfer) => (
                <div
                  key={transfer.id}
                  className="bg-white/80 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md rounded-xl p-4 transition-all duration-300 ease-out hover:shadow-xl animate-fade-in"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-9 h-9 bg-yellow-100 rounded-full flex items-center justify-center">
                      <ArrowRight className="text-yellow-600" size={18} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-100">
                        {transfer.pieces} piezas desde {getAreaDisplayName(transfer.fromArea)}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(transfer.createdAt)}</p>
                      <div className="flex items-center space-x-2 mt-3">
                        <Button
                          size="sm"
                          className="rounded-full"
                          onClick={() => acceptTransferMutation.mutate(transfer.id)}
                          disabled={acceptTransferMutation.isPending}
                        >
                          Aceptar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="rounded-full"
                          onClick={() => rejectTransferMutation.mutate(transfer.id)}
                          disabled={rejectTransferMutation.isPending}
                        >
                          Rechazar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          <hr className="border-t border-gray-300 dark:border-gray-600" />

          <p className="text-sm font-medium text-gray-500">Sistema</p>

          <div className="bg-blue-50 border border-blue-200 dark:border-blue-400 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
                <Info className="text-blue-600" size={18} />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">Sistema Actualizado</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  Nuevas funcionalidades disponibles
                </p>
                <p className="text-xs text-gray-500 mt-2">Hace 1 día</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 dark:border-green-400 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="text-green-600" size={18} />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">Bienvenido a JASANA</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  Sistema de gestión listo para usar
                </p>
                <p className="text-xs text-gray-500 mt-2">Hace 2 días</p>
              </div>
            </div>
          </div>

          {pendingTransfers.length === 0 && repositionNotifications.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Clock size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No hay notificaciones pendientes</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}