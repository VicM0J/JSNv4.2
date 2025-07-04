import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { type Order, type Area } from "@shared/schema";
import Swal from 'sweetalert2';

interface TransferModalProps {
  open: boolean;
  onClose: () => void;
  orderId: number;
}

export function TransferModal({ open, onClose, orderId }: TransferModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [transferData, setTransferData] = useState({
    toArea: "" as Area,
    pieces: "",
    notes: "",
  });

  const { data: order } = useQuery<Order>({
    queryKey: ["/api/orders", orderId],
    enabled: !!orderId,
  });

  const { data: orderPieces = [], isLoading: isLoadingPieces } = useQuery({
    queryKey: [`/api/orders/${orderId}/pieces`],
    enabled: !!orderId,
  });

  const createTransferMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/transfers", {
        orderId,
        toArea: data.toArea,
        pieces: parseInt(data.pieces),
        notes: data.notes,
      });
      return await res.json();
    },
    onSuccess: () => {
        Swal.fire({
  title: '¡Transferencia enviada!',
  text: 'El pedido ha sido transferido para aprobación.',
  imageUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cGF0aCBkPSJNMjUgNDIgTDI1IDIgTTI1IDIgTDEwIDE3IE0yNSAyIEw0MCAxNyIgc3Ryb2tlPSIjMDA4OEZGIiBzdHJva2Utd2lkdGg9IjQiIGZpbGw9Im5vbmUiPgogICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT0ic3Ryb2tlLWRhc2hhcnJheSIgdmFsdWVzPSIyIDUgMiA1OzIgNSAyIDUiIGR1cj0iMXMiIHJlcGVhdENvdW50PSJpbmRlZmluaXRlIiAvPgogIDwvcGF0aD4KPC9zdmc+',
  imageWidth: 80,
  imageHeight: 80,
  imageAlt: 'Flecha animada hacia arriba',
  showConfirmButton: false,
  timer: 2000,
  customClass: {
    popup: 'font-sans',
  },
});


      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}/pieces`] });
      queryClient.invalidateQueries({ queryKey: ["/api/transfers/pending"] });
      onClose();
      setTransferData({
        toArea: "" as Area,
        pieces: "",
        notes: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al transferir",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const availablePieces = getCurrentAreaPieces();
    const requestedPieces = parseInt(transferData.pieces);
    
    if (requestedPieces > availablePieces) {
      toast({
        title: "Error en transferencia",
        description: `No puedes transferir ${requestedPieces} piezas. Solo tienes ${availablePieces} disponibles en ${user?.area ? getAreaDisplayName(user.area) : 'tu área'}.`,
        variant: "destructive",
      });
      return;
    }
    
    createTransferMutation.mutate(transferData);
  };

  const getNextAreas = (): Area[] => {
    if (!user) return [];
    
    const areaFlow: Record<Area, Area[]> = {
      corte: ['bordado', 'ensamble', 'plancha', 'calidad', 'envios'],
      bordado: ['ensamble', 'plancha', 'calidad', 'envios'],
      ensamble: ['plancha', 'calidad', 'envios'],
      plancha: ['calidad', 'envios'],
      calidad: ['envios'],
      envios: [],
      admin: ['bordado', 'ensamble', 'plancha', 'calidad', 'envios'],
    };
    
    return areaFlow[user.area] || [];
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

  const getCurrentAreaPieces = () => {
    const piecesArr = orderPieces as Array<any>;
    if (!user || !piecesArr.length) return 0;
    const currentAreaPieces = piecesArr.find((p: any) => p.area === user.area);
    console.log('User area:', user.area, 'Order pieces:', piecesArr, 'Found pieces:', currentAreaPieces);
    return currentAreaPieces?.pieces || 0;
  };

  const nextAreas = getNextAreas();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir Pedido</DialogTitle>
        </DialogHeader>

        {isLoadingPieces && (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Cargando piezas disponibles...</span>
          </div>
        )}
        
        {!isLoadingPieces && (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
            <div>
              <Label>Folio del Pedido</Label>
              <Input value={order?.folio || ""} readOnly className="bg-gray-50" />
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Piezas disponibles en {user?.area ? getAreaDisplayName(user.area) : 'tu área'}:</strong> {getCurrentAreaPieces()}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Total del pedido: {order?.totalPiezas || 0} piezas
              </p>
            </div>

            {getCurrentAreaPieces() === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  No tienes piezas disponibles en tu área para este pedido.
                </p>
              </div>
            )}
            
            <div>
              <Label>Transferir a</Label>
              <Select 
                value={transferData.toArea} 
                onValueChange={(value: Area) => setTransferData(prev => ({ ...prev, toArea: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar área..." />
                </SelectTrigger>
                <SelectContent>
                  {nextAreas.map(area => (
                    <SelectItem key={area} value={area}>
                      {getAreaDisplayName(area)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Cantidad a transferir</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    min="1"
                    max={getCurrentAreaPieces()}
                    value={transferData.pieces}
                    onChange={(e) => setTransferData(prev => ({ ...prev, pieces: e.target.value }))}
                    required
                  />
                  <span className="text-sm text-gray-500">
                    de {getCurrentAreaPieces()} disponibles en {user?.area ? getAreaDisplayName(user.area) : ''}
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  Total del pedido: {order?.totalPiezas || 0} piezas
                </div>
              </div>
            </div>
            
            <div>
              <Label>Notas (opcional)</Label>
              <Textarea
                rows={3}
                placeholder="Agregar comentarios sobre la transferencia..."
                value={transferData.notes}
                onChange={(e) => setTransferData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createTransferMutation.isPending || getCurrentAreaPieces() === 0}
            >
              {createTransferMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Transferir
            </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
