
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, ArrowRight, History, CheckCircle, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type Order, type Area } from "@shared/schema";
import Swal from 'sweetalert2';

interface OrdersTableProps {
  searchTerm: string;
  onTransferOrder: (orderId: number) => void;
  onViewHistory: (orderId: number) => void;
  onViewDetails: (orderId: number) => void;
}

export function OrdersTable({ searchTerm, onTransferOrder, onViewHistory, onViewDetails }: OrdersTableProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const trashIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" class="animate-bounce text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" width="48" height="48">
  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
</svg>
`;
  const { data: orders = [], isLoading, error, refetch } = useQuery({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/orders');
      return response.json();
    },
    refetchInterval: 5000, // Refetch every 5 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  const completeOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await apiRequest("POST", `/api/orders/${orderId}/complete`);
      return await res.json();
    },
   onSuccess: () => {
  Swal.fire({
    title: '¡Pedido finalizado!',
    text: 'El pedido ha sido marcado como completado exitosamente.',
    icon: 'success',
    confirmButtonText: 'Aceptar',
    customClass: {
      popup: 'font-sans',
    },
    backdrop: `
      rgba(0,0,123,0.4)
      url("https://sweetalert2.github.io/images/nyan-cat.gif")
      left top
      no-repeat
    `,
    timer: 2500,
    timerProgressBar: true,
    showClass: {
      popup: 'animate__animated animate__fadeInDown'
    },
    hideClass: {
      popup: 'animate__animated animate__fadeOutUp'
    }
  });

  queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
  queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
},

    onError: (error: Error) => {
      toast({
        title: "Error al finalizar pedido",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteOrderMutation = useMutation({
  mutationFn: async (orderId: number) => {
    const res = await apiRequest("DELETE", `/api/orders/${orderId}`);

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Error ${res.status}: ${errorText}`);
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return await res.json();
    }


    return null;
  },
  onSuccess: () => {
    Swal.fire({
          title: "Pedido eliminado",
          html: `
            <div class="flex flex-col items-center space-y-4">
              ${trashIconSvg}
              <p>El pedido ha sido eliminado permanentemente</p>
            </div>
          `,
          icon: undefined,
          showConfirmButton: true,
          confirmButtonText: "Aceptar",
          timer: 2500,
          customClass: {
            popup: "font-sans",
          },
        });
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
  },
  onError: (error: Error) => {
    toast({
      title: "Error al eliminar pedido",
      description: error.message,
      variant: "destructive",
    });
  },
});


  const getAreaBadgeColor = (area: Area) => {
    const colors: Record<Area, string> = {
      corte: "bg-green-100 text-green-800",
      bordado: "bg-blue-100 text-blue-800",
      ensamble: "bg-purple-100 text-purple-800",
      plancha: "bg-orange-100 text-orange-800",
      calidad: "bg-pink-100 text-pink-800",
      envios: "bg-purple-100 text-purple-800",
      almacen: "bg-indigo-100 text-indigo-800",
      admin: "bg-gray-100 text-gray-800",
    };
    return colors[area] || "bg-gray-100 text-gray-800";
  };

  const getStatusBadgeColor = (status: string) => {
    return status === 'completed' 
      ? "bg-green-100 text-green-800"
      : "bg-yellow-100 text-yellow-800";
  };

  const getAreaDisplayName = (area: Area) => {
    const names: Record<Area, string> = {
      corte: 'Corte',
      bordado: 'Bordado',
      ensamble: 'Ensamble',
      plancha: 'Plancha/Empaque',
      calidad: 'Calidad',
      envios: 'Envíos',
      almacen: 'Almacén',
      admin: 'Admin'
    };
    return names[area] || area;
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchTerm === "" || 
      order.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.clienteHotel.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesArea = areaFilter === "all" || order.currentArea === areaFilter;
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;

    return matchesSearch && matchesArea && matchesStatus;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Pedidos Recientes</CardTitle>
          <div className="flex space-x-2">
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Áreas</SelectItem>
                <SelectItem value="corte">Corte</SelectItem>
                <SelectItem value="bordado">Bordado</SelectItem>
                <SelectItem value="ensamble">Ensamble</SelectItem>
                <SelectItem value="plancha">Plancha/Empaque</SelectItem>
                <SelectItem value="calidad">Calidad</SelectItem>
                <SelectItem value="envios">Envíos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Estados</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="completed">Finalizados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio</TableHead>
                <TableHead>Cliente/Hotel</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Área Actual</TableHead>
                <TableHead>Piezas</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="font-medium">{order.folio}</div>
                    <div className="text-sm text-gray-500">{order.noSolicitud}</div>
                  </TableCell>
                  <TableCell>{order.clienteHotel}</TableCell>
                  <TableCell>
                    <div className="font-medium">{order.modelo}</div>
                    <div className="text-sm text-gray-500">
                      {order.tipoPrenda} - {order.color}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getAreaBadgeColor(order.currentArea)}>
                      {getAreaDisplayName(order.currentArea)}
                    </Badge>
                  </TableCell>
                  <TableCell>{order.totalPiezas}</TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeColor(order.status)}>
                      {order.status === 'completed' ? 'Finalizado' : 'En Proceso'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onViewDetails(order.id)}
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {order.status === 'active' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onTransferOrder(order.id)}
                          title="Transferir"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      )}

                      {user?.area === 'envios' && order.status === 'active' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => completeOrderMutation.mutate(order.id)}
                          disabled={completeOrderMutation.isPending}
                          title="Finalizar pedido"
                          className="text-green-600 hover:text-green-700"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}

                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onViewHistory(order.id)}
                        title="Ver historial"
                      >
                        <History className="h-4 w-4" />
                      </Button>

                      {user?.area === 'admin' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            Swal.fire({
                              title: '¿Eliminar pedido?',
                              text: 'Esta acción no se puede deshacer.',
                              icon: 'warning',
                              showCancelButton: true,
                              confirmButtonText: 'Sí, eliminar',
                              cancelButtonText: 'Cancelar',
                              confirmButtonColor: '#e3342f',
                              cancelButtonColor: '#6c757d',
                              customClass: {
                                popup: 'font-sans',
                              },
                            }).then((result) => {
                              if (result.isConfirmed) {
                                deleteOrderMutation.mutate(order.id);
                              }
                            });
                          }}
                          disabled={deleteOrderMutation.isPending}
                          title="Eliminar pedido"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
