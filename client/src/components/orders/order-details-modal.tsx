import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { type Order } from "@shared/schema";


type Area = 'corte' | 'bordado' | 'ensamble' | 'plancha' | 'calidad' | 'envios' | 'admin';
import { Loader2, Package, MapPin, Calendar, User } from "lucide-react";

interface OrderDetailsModalProps {
  open: boolean;
  onClose: () => void;
  orderId: number;
}

export function OrderDetailsModal({ open, onClose, orderId }: OrderDetailsModalProps) {
  const { data: order, isLoading: isLoadingOrder } = useQuery<Order>({
    queryKey: ["/api/orders", orderId],
    enabled: !!orderId,
  });

  const { data: orderPieces = [], isLoading: isLoadingPieces } = useQuery<Array<{ id: number; area: Area; pieces: number }>>({
    queryKey: [`/api/orders/${orderId}/pieces`],
    enabled: !!orderId,
  });

  const { data: history = [], isLoading: isLoadingHistory } = useQuery<Array<any>>({
    queryKey: [`/api/orders/${orderId}/history`],
    enabled: !!orderId,
  });

  const getAreaDisplayName = (area: Area) => {
    const names: Record<Area, string> = {
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

  const getAreaBadgeColor = (area: Area) => {
    const colors: Record<Area, string> = {
      corte: "bg-green-100 text-green-800",
      bordado: "bg-blue-100 text-blue-800",
      ensamble: "bg-purple-100 text-purple-800",
      plancha: "bg-orange-100 text-orange-800",
      calidad: "bg-pink-100 text-pink-800",
      envios: "bg-purple-100 text-purple-800",
      admin: "bg-gray-100 text-gray-800",
    };
    return colors[area] || "bg-gray-100 text-gray-800";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isLoading = isLoadingOrder || isLoadingPieces || isLoadingHistory;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Detalles del Pedido</span>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Cargando detalles...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Información General */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span>Información General</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">{order?.folio}</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Cliente/Hotel:</span> {order?.clienteHotel}</div>
                      <div><span className="font-medium">No. Solicitud:</span> {order?.noSolicitud}</div>
                      <div><span className="font-medium">No. Hoja:</span> {order?.noHoja}</div>
                      <div><span className="font-medium">Modelo:</span> {order?.modelo}</div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Tipo de Prenda:</span> {order?.tipoPrenda}</div>
                    <div><span className="font-medium">Color:</span> {order?.color}</div>
                    <div><span className="font-medium">Tela:</span> {order?.tela}</div>
                    <div><span className="font-medium">Total Piezas:</span> {order?.totalPiezas}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 mt-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Estado:</span>
                    <Badge className={order?.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {order?.status === 'completed' ? 'Finalizado' : 'En Proceso'}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Área Actual:</span>
                    <Badge className={getAreaBadgeColor(order?.currentArea as Area)}>
                      {getAreaDisplayName(order?.currentArea as Area)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Distribución de Piezas */}
            <Card>
              <CardHeader>
                <CardTitle>Distribución de Piezas por Área</CardTitle>
              </CardHeader>
              <CardContent>
                {orderPieces.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {orderPieces.map((piece: any) => (
                      <div key={piece.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Badge className={getAreaBadgeColor(piece.area)}>
                            {getAreaDisplayName(piece.area)}
                          </Badge>
                        </div>
                        <span className="font-semibold">{piece.pieces} piezas</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No hay distribución de piezas disponible</p>
                )}
              </CardContent>
            </Card>

            {/* Historial del Pedido */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Ruta del Pedido</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {history.length > 0 ? (
                  <div className="space-y-4">
                    {history.map((item: any, index: number) => (
                      <div key={item.id} className="flex items-start space-x-4 relative">
                        {index < history.length - 1 && (
                          <div className="absolute left-4 top-8 w-0.5 h-12 bg-gray-200"></div>
                        )}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          item.action === 'created' ? 'bg-green-100 text-green-600' :
                          item.action === 'transfer_accepted' ? 'bg-blue-100 text-blue-600' :
                          item.action === 'completed' ? 'bg-purple-100 text-purple-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {item.action === 'created' ? <Package className="h-4 w-4" /> :
                           item.action === 'transfer_accepted' ? <MapPin className="h-4 w-4" /> :
                           item.action === 'completed' ? <Calendar className="h-4 w-4" /> :
                           <User className="h-4 w-4" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                {item.action === 'created' && 'Creado'}
                                {item.action === 'transfer_accepted' && 'Transferido'}
                                {item.action === 'completed' && 'Finalizado'}
                                {item.action === 'transfer_requested' && 'Transferencia Solicitada'}
                                {item.fromArea && item.toArea && `: ${getAreaDisplayName(item.fromArea)} → ${getAreaDisplayName(item.toArea)}`}
                                {item.action === 'created' && `: ${getAreaDisplayName(order?.currentArea as Area)}`}
                              </p>
                              <p className="text-sm text-gray-600">{item.description}</p>
                              {item.pieces && (
                                <p className="text-xs text-gray-500">{item.pieces} piezas</p>
                              )}
                            </div>
                            <span className="text-sm text-gray-500">
                              {formatDate(item.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No hay historial disponible</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}