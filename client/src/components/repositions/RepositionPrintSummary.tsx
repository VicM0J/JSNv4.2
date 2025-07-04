
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer, X } from 'lucide-react';

interface RepositionPrintSummaryProps {
  repositionId: number;
  onClose: () => void;
}

export function RepositionPrintSummary({ repositionId, onClose }: RepositionPrintSummaryProps) {
  const { data: reposition, isLoading } = useQuery({
    queryKey: ['reposition', repositionId],
    queryFn: async () => {
      const response = await fetch(`/api/repositions/${repositionId}`);
      if (!response.ok) throw new Error('Failed to fetch reposition');
      return response.json();
    }
  });

  const { data: pieces = [], isLoading: isLoadingPieces } = useQuery({
    queryKey: ['reposition-pieces', repositionId],
    queryFn: async () => {
      const response = await fetch(`/api/repositions/${repositionId}/pieces`);
      if (!response.ok) return [];
      return response.json();
    }
  });

  const handlePrint = () => {
    // Asegurar que los datos estén cargados antes de imprimir
    if (!reposition || isLoading) {
      alert('Los datos aún se están cargando. Por favor espera un momento.');
      return;
    }
    
    // Agregar un pequeño delay para asegurar que el DOM esté completamente renderizado
    setTimeout(() => {
      window.print();
    }, 100);
  };

  if (isLoading || isLoadingPieces) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <div>Cargando datos para impresión...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!reposition) return null;

  // Calcular cantidad total de piezas
  const totalCantidad = pieces.reduce((total: number, piece: any) => {
    const cantidad = typeof piece.cantidad === 'number' ? piece.cantidad : parseInt(piece.cantidad) || 0;
    return total + cantidad;
  }, 0);

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="p-4 space-y-3 print:p-0">
            {/* Header - Solo visible en pantalla */}
            <div className="flex justify-between items-center print:hidden">
              <h2 className="text-lg font-bold text-purple-800">
                Resumen para Ensamble
              </h2>
              <div className="flex gap-2">
                <Button 
                  onClick={handlePrint} 
                  className="bg-purple-600 hover:bg-purple-700" 
                  size="sm"
                  disabled={isLoading || isLoadingPieces || !reposition}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  {(isLoading || isLoadingPieces) ? 'Cargando...' : 'Imprimir'}
                </Button>
                <Button variant="outline" onClick={onClose} size="sm">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Contenido imprimible */}
            <div className="print:mt-0">
              <Card className="print:shadow-none print:border-0">
                <CardHeader className="text-center print:pb-1 pb-3">
                  <CardTitle className="text-lg font-bold print:text-sm">
                    RESUMEN DE {reposition.type === 'reproceso' ? 'REPROCESO' : 'REPOSICIÓN'} - ÁREA DE ENSAMBLE
                  </CardTitle>
                  <div className="text-base font-semibold text-gray-700 print:text-xs">
                    Folio: {reposition.folio}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3 print:space-y-1 print:p-2">
                  {/* Información principal en formato ultra compacto */}
                  <div className="grid grid-cols-1 gap-2 print:gap-1">
                    {/* Información principal según tipo */}
                    {reposition.type === 'reproceso' ? (
                      <>
                        {/* Para Reprocesos */}
                        <div className="print:mb-1">
                          <span className="font-semibold text-xs print:text-xs">Descripción del Suceso:</span>
                          <div className="mt-1 p-1 border border-gray-300 rounded text-xs print:text-xs print:p-0.5 min-h-8">
                            {reposition.descripcionSuceso || ''}
                          </div>
                        </div>

                        <div className="print:mb-1">
                          <span className="font-semibold text-xs print:text-xs">¿Qué se debe volver a hacer?:</span>
                          <div className="mt-1 p-1 border border-gray-300 rounded text-xs print:text-xs print:p-0.5 min-h-12">
                            {reposition.volverHacer || ''}
                          </div>
                        </div>

                        <div className="print:mb-1">
                          <span className="font-semibold text-xs print:text-xs">Materiales Implicados:</span>
                          <div className="mt-1 p-1 border border-gray-300 rounded text-xs print:text-xs print:p-0.5 min-h-8">
                            {reposition.materialesImplicados || ''}
                          </div>
                        </div>

                        {reposition.observaciones && (
                          <div className="print:mb-1">
                            <span className="font-semibold text-xs print:text-xs">Otras Observaciones:</span>
                            <div className="mt-1 p-1 border border-gray-300 rounded text-xs print:text-xs print:p-0.5 min-h-8">
                              {reposition.observaciones}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Para Reposiciones */}
                        <div className="grid grid-cols-2 gap-2 print:gap-1">
                          <div>
                            <span className="font-semibold text-xs print:text-xs">No. Solicitud:</span>
                            <div className="text-sm border-b border-dotted border-gray-400 min-h-5 pt-1 print:text-xs print:min-h-3">
                              {reposition.noSolicitud}
                            </div>
                          </div>
                          <div>
                            <span className="font-semibold text-xs print:text-xs">Modelo Prenda:</span>
                            <div className="text-sm border-b border-dotted border-gray-400 min-h-5 pt-1 print:text-xs print:min-h-3">
                              {reposition.modeloPrenda}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 print:gap-1">
                          <div>
                            <span className="font-semibold text-xs print:text-xs">Color:</span>
                            <div className="text-sm border-b border-dotted border-gray-400 min-h-5 pt-1 print:text-xs print:min-h-3">
                              {reposition.color}
                            </div>
                          </div>
                          <div>
                            <span className="font-semibold text-xs print:text-xs">Cantidad Total:</span>
                            <div className="text-sm border-b border-dotted border-gray-400 min-h-5 pt-1 print:text-xs print:min-h-3">
                              {totalCantidad} piezas
                            </div>
                          </div>
                        </div>

                        {/* Detalles de tallas solo para reposiciones */}
                        {pieces.length > 0 && (
                          <div className="print:mb-1">
                            <span className="font-semibold text-xs print:text-xs">Detalle por Talla:</span>
                            <div className="mt-1 text-xs grid grid-cols-4 gap-1 print:grid-cols-6 print:text-xs">
                              {pieces.map((piece: any) => (
                                <div key={piece.id} className="text-center border border-gray-300 p-0.5 rounded print:p-0">
                                  <div className="font-semibold print:text-xs">{piece.talla}</div>
                                  <div className="print:text-xs">{typeof piece.cantidad === 'number' ? piece.cantidad : parseInt(piece.cantidad) || 0}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Detalles de daño solo para reposiciones */}
                        <div className="print:mb-1">
                          <span className="font-semibold text-xs print:text-xs">Detalles de Daño:</span>
                          <div className="mt-1 p-1 border border-gray-300 rounded text-xs print:text-xs print:p-0.5">
                            <div className="print:mb-0"><strong>Causante:</strong> {reposition.causanteDano}</div>
                            <div><strong>Descripción:</strong> {reposition.descripcionSuceso}</div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Observaciones ultra compacto - solo para reposiciones */}
                    {reposition.type !== 'reproceso' && (
                      <div className="print:mb-1">
                        <span className="font-semibold text-xs print:text-xs">Observaciones:</span>
                        <div className="mt-1 p-1 border border-gray-300 rounded min-h-6 text-xs print:text-xs print:min-h-4 print:p-0.5">
                          {reposition.observaciones || 'Ninguna'}
                        </div>
                      </div>
                    )}

                    {/* Campos manuales más compactos */}
                    <div className="grid grid-cols-2 gap-2 print:gap-1 print:mb-1">
                      <div>
                        <span className="font-semibold text-xs print:text-xs">Fecha/Hora Inicio:</span>
                        <div className="border-b border-gray-400 min-h-5 pt-1 text-xs print:min-h-3 print:text-xs">
                          ___/___/____ ___:___
                        </div>
                      </div>
                      <div>
                        <span className="font-semibold text-xs print:text-xs">Fecha/Hora Fin:</span>
                        <div className="border-b border-gray-400 min-h-5 pt-1 text-xs print:min-h-3 print:text-xs">
                          ___/___/____ ___:___
                        </div>
                      </div>
                    </div>

                    {/* Información adicional en líneas más compactas */}
                    <div className="text-xs text-gray-600 print:text-xs print:mb-1">
                      <div className="grid grid-cols-2 gap-1 print:gap-0.5">
                        <div><strong>Solicitante:</strong> {reposition.solicitanteNombre}</div>
                        <div><strong>Área:</strong> {reposition.solicitanteArea}</div>
                        <div><strong>Urgencia:</strong> {reposition.urgencia}</div>
                        <div><strong>Causante:</strong> {reposition.causanteDano}</div>
                      </div>
                    </div>

                    {/* Nombres más compactos */}
                    <div className="mt-3 pt-2 border-t print:mt-1 print:pt-1">
                      <div className="grid grid-cols-2 gap-4 print:gap-2">
                        <div className="text-center">
                          <div className="border-b border-gray-400 mb-1 min-h-5 print:min-h-3"></div>
                          <span className="text-xs print:text-xs">Nombre Operario</span>
                        </div>
                        <div className="text-center">
                          <div className="border-b border-gray-400 mb-1 min-h-5 print:min-h-3"></div>
                          <span className="text-xs print:text-xs">Nombre Supervisor</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Estilos de impresión optimizados para media hoja carta ultra compacta */}
      <style jsx>{`
        @media print {
          @page {
            margin: 0.2in;
            size: letter;
          }
          
          body * {
            visibility: hidden;
          }
          
          .fixed.inset-0.bg-black.bg-opacity-50 * {
            visibility: visible;
          }
          
          .fixed.inset-0.bg-black.bg-opacity-50 {
            position: static !important;
            background: white !important;
            height: 50vh !important;
            max-height: 50vh !important;
          }
          
          .print\\:block {
            display: block !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:mt-0 {
            margin-top: 0 !important;
          }
          
          .print\\:mt-1 {
            margin-top: 0.25rem !important;
          }
          
          .print\\:mb-0 {
            margin-bottom: 0 !important;
          }
          
          .print\\:mb-1 {
            margin-bottom: 0.25rem !important;
          }
          
          .print\\:p-0 {
            padding: 0 !important;
          }
          
          .print\\:p-2 {
            padding: 0.5rem !important;
          }
          
          .print\\:p-0\\.5 {
            padding: 0.125rem !important;
          }
          
          .print\\:pb-1 {
            padding-bottom: 0.25rem !important;
          }
          
          .print\\:pt-1 {
            padding-top: 0.25rem !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:border-0 {
            border: none !important;
          }
          
          .print\\:space-y-1 > * + * {
            margin-top: 0.25rem !important;
          }
          
          .print\\:gap-0\\.5 {
            gap: 0.125rem !important;
          }
          
          .print\\:gap-1 {
            gap: 0.25rem !important;
          }
          
          .print\\:gap-2 {
            gap: 0.5rem !important;
          }
          
          .print\\:grid-cols-6 {
            grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
          }
          
          .print\\:text-xs {
            font-size: 0.65rem !important;
            line-height: 0.9rem !important;
          }
          
          .print\\:text-sm {
            font-size: 0.75rem !important;
            line-height: 1rem !important;
          }
          
          .print\\:min-h-3 {
            min-height: 0.75rem !important;
          }
          
          .print\\:min-h-4 {
            min-height: 1rem !important;
          }
          
          .print\\:min-h-5 {
            min-height: 1.25rem !important;
          }
        }
      `}</style>
    </>
  );
}
