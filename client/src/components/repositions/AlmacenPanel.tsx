import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Pause } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Reposition {
  id: number;
  folio: string;
  type: 'repocision' | 'reproceso';
  solicitanteNombre: string;
  solicitanteArea: string;
  modeloPrenda: string;
  tela: string;
  color: string;
  tipoPieza: string;
  consumoTela?: number;
  urgencia: 'urgente' | 'intermedio' | 'poco_urgente';
  currentArea: string;
  status: string;
  createdAt: string;
  isPaused?: boolean;
  pauseReason?: string;
}

const statusColors = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  aprobado: 'bg-green-100 text-green-800',
  rechazado: 'bg-red-100 text-red-800',
  en_proceso: 'bg-blue-100 text-blue-800',
  completado: 'bg-gray-100 text-gray-800'
};

const urgencyColors = {
  urgente: 'bg-red-100 text-red-800',
  intermedio: 'bg-yellow-100 text-yellow-800',
  poco_urgente: 'bg-green-100 text-green-800'
};

export function AlmacenPanel() {
  const [selectedReposition, setSelectedReposition] = useState<number | null>(null);
  const [pauseDialog, setPauseDialog] = useState(false);
  const [pauseReason, setPauseReason] = useState('');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: repositions = [], isLoading, error, refetch } = useQuery({
    queryKey: ["repositions", "almacen"],
    queryFn: async () => {
      const response = await fetch('/api/almacen/repositions');
      if (!response.ok) throw new Error('Failed to fetch repositions');
      return response.json();
    },
    refetchInterval: 5000, // Refetch every 5 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });


  const pauseMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const response = await fetch(`/api/almacen/repositions/${id}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      if (!response.ok) throw new Error('Failed to pause reposition');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/almacen/repositions'] });
      setPauseDialog(false);
      setPauseReason('');
      setSelectedReposition(null);
      toast({ title: "Éxito", description: "Reposición pausada correctamente" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo pausar la reposición", variant: "destructive" });
    }
  });

  const resumeMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/almacen/repositions/${id}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to resume reposition');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/almacen/repositions'] });
      toast({ title: "Éxito", description: "Reposición reanudada correctamente" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo reanudar la reposición", variant: "destructive" });
    }
  });


  const handlePause = () => {
    if (!selectedReposition || !pauseReason.trim()) return;

    pauseMutation.mutate({
      id: selectedReposition,
      reason: pauseReason.trim()
    });
  };

  const handleResume = (id: number) => {
    resumeMutation.mutate(id);
  };


  const openPauseDialog = (reposition: Reposition) => {
    setSelectedReposition(reposition.id);
    setPauseDialog(true);
  };

  if (isLoading) {
    return <div className="text-center py-8">Cargando reposiciones...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Panel de Almacén</h1>
        <div className="text-sm text-gray-600">
          Total: {repositions.length} reposiciones
        </div>
      </div>

      <div className="grid gap-4">
        {repositions.map((reposition) => (
          <Card key={reposition.id} className={`${reposition.isPaused ? 'border-red-300 bg-red-50' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {reposition.folio}
                    {reposition.isPaused && <AlertTriangle className="w-5 h-5 text-red-500" />}
                  </CardTitle>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{reposition.type}</Badge>
                    <Badge className={statusColors[reposition.status as keyof typeof statusColors]}>
                      {reposition.status}
                    </Badge>
                    <Badge className={urgencyColors[reposition.urgencia]}>
                      {reposition.urgencia}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Solicitante:</span>
                    <p>{reposition.solicitanteNombre} ({reposition.solicitanteArea})</p>
                  </div>
                  <div>
                    <span className="font-medium">Modelo:</span>
                    <p>{reposition.modeloPrenda}</p>
                  </div>
                  <div>
                    <span className="font-medium">Tela:</span>
                    <p>{reposition.tela} - {reposition.color}</p>
                  </div>
                  <div>
                    <span className="font-medium">Tipo de Pieza:</span>
                    <p>{reposition.tipoPieza}</p>
                  </div>
                  {reposition.consumoTela && (
                    <div>
                      <span className="font-medium">Consumo de Tela:</span>
                      <p>{reposition.consumoTela} metros</p>
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Área Actual:</span>
                    <p>{reposition.currentArea}</p>
                  </div>
                  <div>
                    <span className="font-medium">Creado:</span>
                    <p>{new Date(reposition.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {reposition.isPaused && reposition.pauseReason && (
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-sm font-medium text-red-800">Pausado por:</p>
                    <p className="text-sm text-red-700">{reposition.pauseReason}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {reposition.isPaused ? (
                    <Button
                      onClick={() => handleResume(reposition.id)}
                      disabled={resumeMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {resumeMutation.isPending ? 'Reanudando...' : 'Reanudar'}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => openPauseDialog(reposition)}
                      disabled={pauseMutation.isPending}
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Pausar
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pause Dialog */}
      <Dialog open={pauseDialog} onOpenChange={(open) => {
        setPauseDialog(open);
        if (!open) {
          setPauseReason('');
          setSelectedReposition(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pausar Reposición</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Al pausar esta reposición, se detendrá temporalmente su procesamiento. 
              Debes explicar el motivo de la pausa.
            </p>
            <div>
              <Label htmlFor="pause-reason">Motivo de la pausa *</Label>
              <Textarea
                id="pause-reason"
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                placeholder="Ejemplo: Falta de material específico, problema con maquinaria, etc..."
                required
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPauseDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handlePause}
              disabled={!pauseReason.trim() || pauseReason.trim().length < 10}
              className="bg-red-600 hover:bg-red-700"
            >
              Pausar Reposición
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}