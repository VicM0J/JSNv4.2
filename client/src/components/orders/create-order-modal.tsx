import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";
import Swal from 'sweetalert2';


interface CreateOrderModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateOrderModal({ open, onClose }: CreateOrderModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    folio: "",
    clienteHotel: "",
    noSolicitud: "",
    noHoja: "",
    modelo: "",
    tipoPrenda: "",
    color: "",
    tela: "",
    totalPiezas: "",
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const formDataToSend = new FormData();
      
      // Agregar datos del formulario
      Object.keys(data).forEach(key => {
        if (key === 'totalPiezas') {
          formDataToSend.append(key, parseInt(data[key]).toString());
        } else {
          formDataToSend.append(key, data[key]);
        }
      });

      // Agregar archivos
      selectedFiles.forEach((file, index) => {
        formDataToSend.append(`documents`, file);
      });

      const res = await fetch("/api/orders", {
        method: "POST",
        body: formDataToSend,
      });

      if (!res.ok) {
        throw new Error("Error al crear el pedido");
      }

      return await res.json();
    },
    onSuccess: () => {
  Swal.fire({
    title: '¡Pedido creado!',
    text: 'El pedido ha sido creado exitosamente.',
    icon: 'success',
    confirmButtonText: 'Aceptar',
    customClass: {
      popup: 'font-sans',
    }
  });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      onClose();
      setFormData({
        folio: "",
        clienteHotel: "",
        noSolicitud: "",
        noHoja: "",
        modelo: "",
        tipoPrenda: "",
        color: "",
        tela: "",
        totalPiezas: "",
      });
      setSelectedFiles([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear pedido",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createOrderMutation.mutate(formData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Pedido</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="folio">Folio *</Label>
              <Input
                id="folio"
                placeholder="Ejp: 2025-001"
                value={formData.folio}
                onChange={(e) => handleChange('folio', e.target.value)}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="clienteHotel">Cliente/Hotel *</Label>
              <Input
                id="clienteHotel"
                placeholder="Nombre del hotel"
                value={formData.clienteHotel}
                onChange={(e) => handleChange('clienteHotel', e.target.value)}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="noSolicitud">No. Solicitud *</Label>
              <Input
                id="noSolicitud"
                placeholder="JN-SOL-MM-AA-XXX"
                value={formData.noSolicitud}
                onChange={(e) => handleChange('noSolicitud', e.target.value)}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="noHoja">No. Hoja</Label>
              <Input
                id="noHoja"
                placeholder="N° Hoja pedido"
                value={formData.noHoja}
                onChange={(e) => handleChange('noHoja', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="modelo">Modelo *</Label>
              <Input
                id="modelo"
                placeholder="Modelo de la prenda"
                value={formData.modelo}
                onChange={(e) => handleChange('modelo', e.target.value)}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="tipoPrenda">Tipo de Prenda *</Label>
              <Select value={formData.tipoPrenda} onValueChange={(value) => handleChange('tipoPrenda', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="camisa">Camisa</SelectItem>
                  <SelectItem value="blusa">Blusa</SelectItem>
                  <SelectItem value="pantalon">Pantalón</SelectItem>
                  <SelectItem value="short">Short</SelectItem>
                  <SelectItem value="falda">Falda</SelectItem>
                  <SelectItem value="vestido">Vestido</SelectItem>
                  <SelectItem value="saco">Saco</SelectItem>
                  <SelectItem value="chaleco">Chaleco</SelectItem>
                  <SelectItem value="mandil">Mandil</SelectItem>
                  <SelectItem value="fajo">Fajo</SelectItem>  
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="color">Color *</Label>
              <Input
                id="color"
                placeholder="Color de la tela"
                value={formData.color}
                onChange={(e) => handleChange('color', e.target.value)}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="tela">Tela *</Label>
              <Input
                id="tela"
                placeholder="Nombre de tela"
                value={formData.tela}
                onChange={(e) => handleChange('tela', e.target.value)}
                required
              />
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="totalPiezas">Total de Piezas *</Label>
              <Input
                id="totalPiezas"
                type="number"
                min="1"
                placeholder="Cantidad total"
                value={formData.totalPiezas}
                onChange={(e) => handleChange('totalPiezas', e.target.value)}
                required
              />
            </div>

            <div className="md:col-span-2">
              <FileUpload
                onFileSelect={setSelectedFiles}
                label="Documentos del Pedido"
                description="Adjunta documentos relacionados con el pedido (PDF, XML)"
                maxFiles={5}
                maxSize={10}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createOrderMutation.isPending}>
              {createOrderMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Pedido
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
