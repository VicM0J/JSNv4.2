import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, ArrowRight, Clock, X, Plus } from "lucide-react";
import { type OrderHistory, type Area } from "@shared/schema";

interface OrderHistoryModalProps {
  open: boolean;
  onClose: () => void;
  orderId: number;
}

export function OrderHistoryModal({ open, onClose, orderId }: OrderHistoryModalProps) {
  const { data: order } = useQuery<OrderHistory>({
    queryKey: ["/api/orders", orderId],
    enabled: !!orderId,
  });

  const { data: history = [], isLoading } = useQuery<OrderHistory[]>({
    queryKey: ["/api/orders", orderId, "history"],
    enabled: !!orderId,
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <Plus className="text-white" size={16} />;
      case 'transfer_created':
        return <ArrowRight className="text-white" size={16} />;
      case 'transfer_accepted':
        return <CheckCircle className="text-white" size={16} />;
      case 'transfer_rejected':
        return <X className="text-white" size={16} />;
      case 'completed':
        return <CheckCircle className="text-white" size={16} />;
      default:
        return <Clock className="text-white" size={16} />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'bg-green-500';
      case 'transfer_created':
        return 'bg-blue-500';
      case 'transfer_accepted':
        return 'bg-green-500';
      case 'transfer_rejected':
        return 'bg-red-500';
      case 'completed':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getAreaDisplayName = (area: string) => {
    const names: Record<string, string> = {
      corte: 'Corte',
      bordado: 'Bordado',
      ensamble: 'Ensamble',
      plancha: 'Plancha/Empaque',
      calidad: 'Calidad',
      envios: 'Envíos',
      admin: 'Admin'
    };
    return names[area] || area;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cargando historial...</DialogTitle>
          </DialogHeader>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Historial del Pedido #{order?.orderId}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {history.map((event, index) => (
            <div key={event.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className={`w-10 h-10 ${getActionColor(event.action)} rounded-full flex items-center justify-center`}>
                {getActionIcon(event.action)}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-800">
                      {event.action === 'created' && 'Pedido Creado'}
                      {event.action === 'transfer_created' && 'Transferencia Enviada'}
                      {event.action === 'transfer_accepted' && 'Transferencia Aceptada'}
                      {event.action === 'transfer_rejected' && 'Transferencia Rechazada'}
                      {event.action === 'completed' && 'Pedido Finalizado'}
                      {!['created', 'transfer_created', 'transfer_accepted', 'transfer_rejected', 'completed'].includes(event.action) && event.action}
                    </h4>
                    <p className="text-sm text-gray-600">{event.description}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDate(event.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    {event.fromArea && event.toArea && (
                      <Badge variant="outline" className="text-xs">
                        {getAreaDisplayName(event.fromArea)} → {getAreaDisplayName(event.toArea)}
                      </Badge>
                    )}
                    {event.pieces && (
                      <Badge variant="secondary" className="text-xs">
                        {event.pieces} piezas
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {history.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay historial disponible para este pedido
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
