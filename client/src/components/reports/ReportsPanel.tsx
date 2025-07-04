
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Download, FileText, BarChart3, Calendar, Filter } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ReportsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function ReportsPanel({ open, onClose }: ReportsPanelProps) {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [filters, setFilters] = useState({
    area: '',
    status: '',
    urgency: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: reportData } = useQuery({
    queryKey: ['/api/reports/data', reportType, dateRange, filters],
    enabled: !!reportType && open,
    queryFn: async () => {
      const params = new URLSearchParams({
        type: reportType,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        area: filters.area,
        status: filters.status,
        urgency: filters.urgency
      });
      const response = await apiRequest('GET', `/api/reports/data?${params}`);
      return response.json();
    }
  });

  const handleGenerateReport = async (format: 'excel' | 'pdf') => {
    if (!reportType) {
      toast({
        title: "Error",
        description: "Selecciona un tipo de reporte",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const params = new URLSearchParams({
        type: reportType,
        format,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        area: filters.area,
        status: filters.status,
        urgency: filters.urgency
      });

      const response = await apiRequest('GET', `/api/reports/generate?${params}`);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-${reportType}-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Reporte generado",
        description: "El reporte se ha descargado exitosamente"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al generar el reporte",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToOneDrive = async () => {
    if (!reportType) {
      toast({
        title: "Error",
        description: "Selecciona un tipo de reporte",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const params = new URLSearchParams({
        type: reportType,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        area: filters.area,
        status: filters.status,
        urgency: filters.urgency
      });

      const response = await apiRequest('POST', `/api/reports/onedrive?${params}`);
      const result = await response.json();

      toast({
        title: "Guardado en OneDrive",
        description: `Reporte guardado exitosamente: ${result.fileName}`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al guardar en OneDrive",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const reportTypes = [
    { value: 'repositions', label: 'Reporte de Reposiciones' },
    { value: 'orders', label: 'Reporte de Órdenes' },
    { value: 'transfers', label: 'Reporte de Transferencias' },
    { value: 'productivity', label: 'Reporte de Productividad' }
  ];

  const areas = [
    { value: '', label: 'Todas las áreas' },
    { value: 'patronaje', label: 'Patronaje' },
    { value: 'corte', label: 'Corte' },
    { value: 'bordado', label: 'Bordado' },
    { value: 'ensamble', label: 'Ensamble' },
    { value: 'plancha', label: 'Plancha' },
    { value: 'calidad', label: 'Calidad' },
    { value: 'operaciones', label: 'Operaciones' }
  ];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-96 max-w-full">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BarChart3 className="text-blue-600" size={20} />
            Generador de Reportes
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Tipo de Reporte */}
          <div>
            <Label>Tipo de Reporte</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un tipo de reporte" />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rango de Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Fecha Inicio</Label>
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div>
              <Label>Fecha Fin</Label>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>

          {/* Filtros */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Filter size={16} />
              <Label>Filtros</Label>
            </div>
            
            <div>
              <Label>Área</Label>
              <Select value={filters.area} onValueChange={(value) => setFilters(prev => ({ ...prev, area: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por área" />
                </SelectTrigger>
                <SelectContent>
                  {areas.map(area => (
                    <SelectItem key={area.value} value={area.value}>
                      {area.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Vista previa de datos */}
          {reportData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Vista Previa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total de registros:</span>
                    <Badge variant="outline">{reportData.total || 0}</Badge>
                  </div>
                  {reportData.summary && Object.entries(reportData.summary).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span>{key}:</span>
                      <Badge variant="outline">{value as string}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botones de acción */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                onClick={() => handleGenerateReport('excel')}
                disabled={isGenerating}
                className="flex-1"
              >
                <FileText className="w-4 h-4 mr-2" />
                Excel
              </Button>
              <Button
                onClick={() => handleGenerateReport('pdf')}
                disabled={isGenerating}
                variant="outline"
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
            
            <Button
              onClick={handleSaveToOneDrive}
              disabled={isGenerating}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Guardar en OneDrive
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
