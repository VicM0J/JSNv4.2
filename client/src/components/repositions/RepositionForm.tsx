import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { FileUpload } from '@/components/ui/file-upload';
import Swal from 'sweetalert2';
import { useEffect } from 'react';


  interface RepositionPiece {
    talla: string;
    cantidad: number;
    folioOriginal?: string;
  }

  interface ProductInfo {
    modeloPrenda: string;
    tela: string;
    color: string;
    tipoPieza: string;
    consumoTela?: number; // metros de tela
    pieces: RepositionPiece[];
  }

  interface ContrastFabric {
    tela: string;
    color: string;
    consumo: number;
    tipoPiezas: {
      tipoPieza: string;
      pieces: RepositionPiece[];
    }[];
  }

  interface RepositionFormData {
    type: 'repocision' | 'reproceso';
    solicitanteNombre: string;
    noSolicitud: string;
    noHoja?: string;
    fechaCorte?: string;
    causanteDano: string;
    tipoAccidente: string;
    otroAccidente?: string;
    solicitanteArea: 'patronaje' | 'corte' | 'bordado' | 'ensamble' | 'plancha' | 'calidad' | 'operaciones' | 'admin';
    currentArea: 'patronaje' | 'corte' | 'bordado' | 'ensamble' | 'plancha' | 'calidad' | 'operaciones' | 'admin';
    descripcionSuceso: string;
    productos: ProductInfo[];
    urgencia: 'urgente' | 'intermedio' | 'poco_urgente';
    observaciones?: string;
    pieces: RepositionPiece[];
    tieneTelaContraste: boolean;
    telaContraste?: ContrastFabric;
    // Campos específicos para reproceso
    volverHacer?: string;
    materialesImplicados?: string;
  }

  const areas = [
    'patronaje', 'corte', 'bordado', 'ensamble', 'plancha', 'calidad', 'operaciones'
  ];

  const urgencyOptions = [
    { value: 'urgente', label: 'Urgente' },
    { value: 'intermedio', label: 'Intermedio' },
    { value: 'poco_urgente', label: 'Poco Urgente' }
  ];

  const commonAccidents = [
    'Daño por máquina',
    'Costuras en mal estado',
    'Bordado mal posicionado',
    'Defecto de tela',
    'Error en la fabricación',
    'Tela sucia o manchada',
    'Error de diseño',
    'Accidente por operario',
    'Falla en el proceso de corte',
    'Defecto en el ensamble',
    'Error en plancha',
    'Problema de calidad',
    'Otro'
  ];

  export function RepositionForm({ onClose }: { onClose: () => void }) {
    const queryClient = useQueryClient();
    const [productos, setProductos] = useState<ProductInfo[]>([{ 
      modeloPrenda: '', 
      tela: '', 
      color: '', 
      tipoPieza: '',
      consumoTela: 0,
      pieces: [{ talla: '', cantidad: 1, folioOriginal: '' }]
    }]);
    const [contrastFabric, setContrastFabric] = useState<ContrastFabric>({
      tela: '',
      color: '',
      consumo: 0,
      tipoPiezas: [{ tipoPieza: '', pieces: [{ talla: '', cantidad: 1, folioOriginal: '' }] }]
    });
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<RepositionFormData>({
      defaultValues: {
        type: 'repocision',
        urgencia: 'intermedio',
        tieneTelaContraste: false,
        productos: [{ modeloPrenda: '', tela: '', color: '', tipoPieza: '', consumoTela: 0, pieces: [{ talla: '', cantidad: 1, folioOriginal: '' }] }]
      }
    });

    useEffect(() => {
      register('solicitanteArea', { required: 'Campo requerido' });
      register('currentArea', { required: 'Campo requerido' });
      register('tipoAccidente', { required: 'Campo requerido' });
      register('volverHacer');
      register('materialesImplicados');
    }, [register]);



    const createRepositionMutation = useMutation({
      mutationFn: async (data: RepositionFormData) => {
        const formDataToSend = new FormData();
        
        // Collect all pieces from all products
        const allPieces = productos.flatMap(producto => producto.pieces);
        
        // Agregar datos del formulario con las piezas incluidas
        formDataToSend.append('repositionData', JSON.stringify({ 
          ...data, 
          pieces: allPieces,
          productos,
          telaContraste: data.tieneTelaContraste ? contrastFabric : undefined
        }));

        // Agregar archivos
        selectedFiles.forEach((file) => {
          formDataToSend.append('documents', file);
        });

        const response = await fetch('/api/repositions', {
          method: 'POST',
          body: formDataToSend,
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create reposition');
        }
        return response.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['repositions'] });
        Swal.fire({
          title: '¡Éxito!',
          text: 'Solicitud de reposición creada correctamente',
          icon: 'success',
          confirmButtonColor: '#8B5CF6'
        });
        onClose();
      },
      onError: (error) => {
        Swal.fire({
          title: 'Error',
          text: 'Error al crear la solicitud de reposición',
          icon: 'error',
          confirmButtonColor: '#8B5CF6'
        });
      }
    });



    const addProducto = () => {
      setProductos([...productos, { 
        modeloPrenda: '', 
        tela: '', 
        color: '', 
        tipoPieza: '', 
        consumoTela: 0,
        pieces: [{ talla: '', cantidad: 1, folioOriginal: '' }]
      }]);
    };

    const removeProducto = (index: number) => {
      setProductos(productos.filter((_, i) => i !== index));
    };

    const updateProducto = (index: number, field: keyof ProductInfo, value: string | number) => {
      const newProductos = [...productos];
      if (field === 'pieces') return; // Handle pieces separately
      newProductos[index] = { ...newProductos[index], [field]: value };
      setProductos(newProductos);
    };

    const addProductPiece = (productIndex: number) => {
      const newProductos = [...productos];
      newProductos[productIndex].pieces.push({ talla: '', cantidad: 1, folioOriginal: '' });
      setProductos(newProductos);
    };

    const removeProductPiece = (productIndex: number, pieceIndex: number) => {
      const newProductos = [...productos];
      newProductos[productIndex].pieces = newProductos[productIndex].pieces.filter((_, i) => i !== pieceIndex);
      setProductos(newProductos);
    };

    const updateProductPiece = (productIndex: number, pieceIndex: number, field: keyof RepositionPiece, value: string | number) => {
      const newProductos = [...productos];
      newProductos[productIndex].pieces[pieceIndex] = { 
        ...newProductos[productIndex].pieces[pieceIndex], 
        [field]: value 
      };
      setProductos(newProductos);
    };

    const addContrastPieceType = () => {
      setContrastFabric(prev => ({
        ...prev,
        tipoPiezas: [...prev.tipoPiezas, { tipoPieza: '', pieces: [{ talla: '', cantidad: 1, folioOriginal: '' }] }]
      }));
    };

    const removeContrastPieceType = (index: number) => {
      setContrastFabric(prev => ({
        ...prev,
        tipoPiezas: prev.tipoPiezas.filter((_, i) => i !== index)
      }));
    };

    const updateContrastPieceType = (index: number, tipoPieza: string) => {
      setContrastFabric(prev => ({
        ...prev,
        tipoPiezas: prev.tipoPiezas.map((item, i) => 
          i === index ? { ...item, tipoPieza } : item
        )
      }));
    };

    const addContrastPiece = (pieceTypeIndex: number) => {
      setContrastFabric(prev => ({
        ...prev,
        tipoPiezas: prev.tipoPiezas.map((item, i) => 
          i === pieceTypeIndex 
            ? { ...item, pieces: [...item.pieces, { talla: '', cantidad: 1, folioOriginal: '' }] }
            : item
        )
      }));
    };

    const removeContrastPiece = (pieceTypeIndex: number, pieceIndex: number) => {
      setContrastFabric(prev => ({
        ...prev,
        tipoPiezas: prev.tipoPiezas.map((item, i) => 
          i === pieceTypeIndex 
            ? { ...item, pieces: item.pieces.filter((_, j) => j !== pieceIndex) }
            : item
        )
      }));
    };

    const updateContrastPiece = (pieceTypeIndex: number, pieceIndex: number, field: keyof RepositionPiece, value: string | number) => {
      setContrastFabric(prev => ({
        ...prev,
        tipoPiezas: prev.tipoPiezas.map((item, i) => 
          i === pieceTypeIndex 
            ? { 
                ...item, 
                pieces: item.pieces.map((piece, j) => 
                  j === pieceIndex ? { ...piece, [field]: value } : piece
                )
              }
            : item
        )
      }));
    };

    const calculateResourceCost = () => {
      let totalCost = 0;

      // Costo de tela principal (60 pesos por metro)
      productos.forEach(producto => {
        if (producto.consumoTela) {
          totalCost += producto.consumoTela * 60;
        }
      });

      // Costo de tela contraste si aplica
      if (watch('tieneTelaContraste') && watch('telaContraste')) {
        const contraste = watch('telaContraste');
        if (contraste?.consumo) {
          totalCost += contraste.consumo * 60;
        }
      }

      return totalCost;
    };

    const onSubmit = (data: RepositionFormData) => {
      // Validación específica para reposiciones
      if (data.type === 'repocision') {
        // Validate products and their pieces
        for (let i = 0; i < productos.length; i++) {
          const producto = productos[i];
          if (!producto.modeloPrenda || !producto.tela || !producto.color || !producto.tipoPieza) {
            Swal.fire({
              title: 'Error',
              text: `Todos los campos del producto ${i + 1} son requeridos`,
              icon: 'error',
              confirmButtonColor: '#8B5CF6'
            });
            return;
          }

          if (producto.pieces.some(p => !p.talla || p.cantidad < 1)) {
            Swal.fire({
              title: 'Error',
              text: `Todas las piezas del producto ${i + 1} deben tener talla y cantidad válida`,
              icon: 'error',
              confirmButtonColor: '#8B5CF6'
            });
            return;
          }
        }
      }

      // Validación específica para reprocesos
      if (data.type === 'reproceso') {
        if (!data.volverHacer || !data.materialesImplicados) {
          Swal.fire({
            title: 'Error',
            text: 'Todos los campos del reproceso son requeridos',
            icon: 'error',
            confirmButtonColor: '#8B5CF6'
          });
          return;
        }
      }

      let formDataToSend = { ...data };

      // Solo mapear datos de productos para reposiciones
      if (data.type === 'repocision' && productos.length > 0) {
        const firstProduct = productos[0];
        formDataToSend = {
          ...formDataToSend,
          modeloPrenda: firstProduct.modeloPrenda,
          tela: firstProduct.tela,
          color: firstProduct.color,
          tipoPieza: firstProduct.tipoPieza,
          consumoTela: firstProduct.consumoTela || 0
        };
      } else if (data.type === 'reproceso') {
        // Para reprocesos, usar valores por defecto o vacíos
        formDataToSend = {
          ...formDataToSend,
          modeloPrenda: '',
          tela: '',
          color: '',
          tipoPieza: '',
          consumoTela: 0
        };
      }

      createRepositionMutation.mutate(formDataToSend);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-purple-800">Nueva Solicitud</h2>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
            </div>

            {/* Tipo de Solicitud */}
            <Card>
              <CardHeader>
                <CardTitle>Tipo de Solicitud</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={watch('type')} 
                  onValueChange={(value: 'repocision' | 'reproceso') => setValue('type', value)}
                  className="flex space-x-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="repocision" id="repocision" />
                    <Label htmlFor="repocision">Reposición</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="reproceso" id="reproceso" />
                    <Label htmlFor="reproceso">Reproceso</Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Información del Solicitante */}
            <Card>
              <CardHeader>
                <CardTitle>Información del Solicitante</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="solicitanteNombre">Nombre del Solicitante *</Label>
                  <Input
                    id="solicitanteNombre"
                    {...register('solicitanteNombre', { required: 'Campo requerido' })}
                    className={errors.solicitanteNombre ? 'border-red-500' : ''}
                  />
                </div>
                <div>
                  <Label>Fecha de Solicitud</Label>
                  <Input value={new Date().toLocaleDateString()} disabled />
                </div>
              </CardContent>
            </Card>

            {/* Número de Solicitud */}
            <Card>
              <CardHeader>
                <CardTitle>Número de Solicitud</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="noSolicitud">Número de Solicitud de Pedido *</Label>
                  <Input
                    id="noSolicitud"
                    {...register('noSolicitud', { required: 'Campo requerido' })}
                    className={errors.noSolicitud ? 'border-red-500' : ''}
                  />
                </div>
                <div>
                  <Label htmlFor="noHoja">Número de Hoja</Label>
                  <Input id="noHoja" {...register('noHoja')} />
                </div>
                <div>
                  <Label htmlFor="fechaCorte">Fecha de Corte</Label>
                  <Input 
                    id="fechaCorte" 
                    type="date" 
                    {...register('fechaCorte')} 
                  />
                </div>
              </CardContent>
            </Card>

            {/* Descripción del Daño */}
            <Card>
              <CardHeader>
                <CardTitle>Descripción del Daño</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="causanteDano">Nombre del Causante del Daño *</Label>
                  <Input
                    id="causanteDano"
                    {...register('causanteDano', { required: 'Campo requerido' })}
                    className={errors.causanteDano ? 'border-red-500' : ''}
                  />
                </div>

                <div>
                  <Label htmlFor="tipoAccidente">Tipo de Accidente *</Label>
                  <Select
                    value={watch('tipoAccidente')}
                    onValueChange={(value) => setValue('tipoAccidente', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el tipo de accidente" />
                    </SelectTrigger>
                    <SelectContent>
                      {commonAccidents.map((accident) => (
                        <SelectItem key={accident} value={accident}>
                          {accident}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.tipoAccidente && <p className="text-red-500 text-sm">Campo requerido</p>}
                </div>

                {watch('tipoAccidente') === 'Otro' && (
                  <div>
                    <Label htmlFor="otroAccidente">Especifique el tipo de accidente *</Label>
                    <Input
                      id="otroAccidente"
                      {...register('otroAccidente', { 
                        required: watch('tipoAccidente') === 'Otro' ? 'Campo requerido' : false 
                      })}
                      className={errors.otroAccidente ? 'border-red-500' : ''}
                      placeholder="Describe el tipo de accidente"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="solicitanteArea">Área que causó el daño *</Label>
                  <Select
                    value={watch('solicitanteArea')}
                    onValueChange={(value) => setValue('solicitanteArea', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un área" />
                    </SelectTrigger>
                    <SelectContent>
                      {areas.map((area) => (
                        <SelectItem key={area} value={area}>
                          {area.charAt(0).toUpperCase() + area.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.solicitanteArea && <p className="text-red-500 text-sm">Campo requerido</p>}
                </div>

                <div>
                  <Label htmlFor="currentArea">Área actual *</Label>
                  <Select
                    value={watch('currentArea')}
                    onValueChange={(value) => setValue('currentArea', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un área" />
                    </SelectTrigger>
                    <SelectContent>
                      {areas.map((area) => (
                        <SelectItem key={area} value={area}>
                          {area.charAt(0).toUpperCase() + area.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.currentArea && <p className="text-red-500 text-sm">Campo requerido</p>}
                </div>

                <div>
                  <Label htmlFor="descripcionSuceso">Descripción del Suceso *</Label>
                  <Textarea
                    id="descripcionSuceso"
                    {...register('descripcionSuceso', { required: 'Campo requerido' })}
                    className={errors.descripcionSuceso ? 'border-red-500' : ''}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Información del Producto - Solo para reposiciones */}
            {watch('type') === 'repocision' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    Información del Producto
                    <Button type="button" onClick={addProducto} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Producto
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {productos.map((producto, productIndex) => (
                      <div key={productIndex} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-medium">Producto {productIndex + 1}</h4>
                          {productos.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeProducto(productIndex)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>

                        {/* Información básica del producto */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                          <div>
                            <Label>Modelo de la Prenda *</Label>
                            <Input
                              value={producto.modeloPrenda}
                              onChange={(e) => updateProducto(productIndex, 'modeloPrenda', e.target.value)}
                              placeholder="Modelo de prenda"
                            />
                          </div>
                          <div>
                            <Label>Tela *</Label>
                            <Input
                              value={producto.tela}
                              onChange={(e) => updateProducto(productIndex, 'tela', e.target.value)}
                              placeholder="Tipo de tela"
                            />
                          </div>
                          <div>
                            <Label>Color *</Label>
                            <Input
                              value={producto.color}
                              onChange={(e) => updateProducto(productIndex, 'color', e.target.value)}
                              placeholder="Color"
                            />
                          </div>
                          <div>
                            <Label>Tipo de Pieza *</Label>
                            <Input
                              value={producto.tipoPieza}
                              onChange={(e) => updateProducto(productIndex, 'tipoPieza', e.target.value)}
                              placeholder="ej. Manga, Delantero, Cuello"
                            />
                          </div>
                          {watch('currentArea') === 'corte' && (
                            <div>
                              <Label>Consumo de Tela (metros)</Label>
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                value={producto.consumoTela || ''}
                                onChange={(e) => updateProducto(productIndex, 'consumoTela', parseFloat(e.target.value) || 0)}
                                placeholder="0.0"
                              />
                            </div>
                          )}
                        </div>

                        {/* Piezas del producto */}
                        <div className="border-t pt-4">
                          <div className="flex justify-between items-center mb-4">
                            <Label className="text-base font-medium">Piezas Solicitadas</Label>
                            <Button 
                              type="button" 
                              onClick={() => addProductPiece(productIndex)} 
                              size="sm"
                              variant="outline"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Agregar Pieza
                            </Button>
                          </div>
                          <div className="space-y-3">
                            {producto.pieces.map((piece, pieceIndex) => (
                              <div key={pieceIndex} className="flex gap-4 items-end">
                                <div className="flex-1">
                                  <Label>Talla</Label>
                                  <Input
                                    value={piece.talla}
                                    onChange={(e) => updateProductPiece(productIndex, pieceIndex, 'talla', e.target.value)}
                                    placeholder="ej. S, M, L, XL"
                                  />
                                </div>
                                <div className="flex-1">
                                  <Label>Cantidad</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={piece.cantidad}
                                    onChange={(e) => updateProductPiece(productIndex, pieceIndex, 'cantidad', parseInt(e.target.value) || 1)}
                                  />
                                </div>
                                <div className="flex-1">
                                  <Label>No° Folio Original</Label>
                                  <Input
                                    value={piece.folioOriginal || ''}
                                    onChange={(e) => updateProductPiece(productIndex, pieceIndex, 'folioOriginal', e.target.value)}
                                    placeholder="Opcional"
                                  />
                                </div>
                                {producto.pieces.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeProductPiece(productIndex, pieceIndex)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Información del Reproceso - Solo para reprocesos */}
            {watch('type') === 'reproceso' && (
              <Card>
                <CardHeader>
                  <CardTitle>Información del Reproceso</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>

                    <Label htmlFor="volverHacer">¿Qué se debe volver a hacer? *</Label>
                    <Textarea
                      id="volverHacer"
                      {...register('volverHacer', { 
                        required: watch('type') === 'reproceso' ? 'Campo requerido' : false 
                      })}
                      className={errors.volverHacer ? 'border-red-500' : ''}
                      rows={3}
                      placeholder="Describe detalladamente qué procesos deben repetirse..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="materialesImplicados">Materiales Implicados *</Label>
                    <Textarea
                      id="materialesImplicados"
                      {...register('materialesImplicados', { 
                        required: watch('type') === 'reproceso' ? 'Campo requerido' : false 
                      })}
                      className={errors.materialesImplicados ? 'border-red-500' : ''}
                      rows={3}
                      placeholder="Lista los materiales que están involucrados en el reproceso..."
                    />
                  </div>
                </CardContent>
              </Card>
            )}



            {/* Segunda Tela - Solo para reposiciones */}
            {watch('type') === 'repocision' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    Segunda Tela
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="tela-contraste"
                        checked={watch('tieneTelaContraste')}
                        onCheckedChange={(checked) => setValue('tieneTelaContraste', checked)}
                      />
                      <Label htmlFor="tela-contraste">Activar segunda tela</Label>
                    </div>
                  </CardTitle>
                </CardHeader>
                {watch('tieneTelaContraste') && (
                <CardContent>
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium">Segunda Tela</h4>
                      <Button type="button" onClick={addContrastPieceType} size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Tipo de Pieza
                      </Button>
                    </div>

                    {/* Información básica de la segunda tela */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <Label>Segunda Tela *</Label>
                        <Input
                          value={contrastFabric.tela}
                          onChange={(e) => setContrastFabric(prev => ({ ...prev, tela: e.target.value }))}
                          placeholder="Tipo de segunda tela"
                        />
                      </div>
                      <div>
                        <Label>Color *</Label>
                        <Input
                          value={contrastFabric.color}
                          onChange={(e) => setContrastFabric(prev => ({ ...prev, color: e.target.value }))}
                          placeholder="Color"
                        />
                      </div>
                      {watch('currentArea') === 'corte' && (
                        <div>
                          <Label>Consumo de Tela (metros)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            value={contrastFabric.consumo || ''}
                            onChange={(e) => setContrastFabric(prev => ({ ...prev, consumo: parseFloat(e.target.value) || 0 }))}
                            placeholder="0.0"
                          />
                        </div>
                      )}
                    </div>

                    {/* Tipos de piezas de la segunda tela */}
                    <div className="space-y-6">
                      {contrastFabric.tipoPiezas.map((tipoPieza, pieceTypeIndex) => (
                        <div key={pieceTypeIndex} className="border rounded-lg p-4">
                          <div className="flex justify-between items-center mb-4">
                            <h5 className="font-medium">Tipo de Pieza {pieceTypeIndex + 1}</h5>
                            {contrastFabric.tipoPiezas.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeContrastPieceType(pieceTypeIndex)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>

                          <div className="mb-4">
                            <Label>Tipo de Pieza *</Label>
                            <Input
                              value={tipoPieza.tipoPieza}
                              onChange={(e) => updateContrastPieceType(pieceTypeIndex, e.target.value)}
                              placeholder="ej. Manga, Delantero, Cuello"
                            />
                          </div>

                          {/* Piezas del tipo */}
                          <div className="border-t pt-4">
                            <div className="flex justify-between items-center mb-4">
                              <Label className="text-base font-medium">Piezas Solicitadas</Label>
                              <Button 
                                type="button" 
                                onClick={() => addContrastPiece(pieceTypeIndex)} 
                                size="sm"
                                variant="outline"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Agregar Pieza
                              </Button>
                            </div>
                            <div className="space-y-3">
                              {tipoPieza.pieces.map((piece, pieceIndex) => (
                                <div key={pieceIndex} className="flex gap-4 items-end">
                                  <div className="flex-1">
                                    <Label>Talla</Label>
                                    <Input
                                      value={piece.talla}
                                      onChange={(e) => updateContrastPiece(pieceTypeIndex, pieceIndex, 'talla', e.target.value)}
                                      placeholder="ej. S, M, L, XL"
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <Label>Cantidad</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={piece.cantidad}
                                      onChange={(e) => updateContrastPiece(pieceTypeIndex, pieceIndex, 'cantidad', parseInt(e.target.value) || 1)}
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <Label>No° Folio Original</Label>
                                    <Input
                                      value={piece.folioOriginal || ''}
                                      onChange={(e) => updateContrastPiece(pieceTypeIndex, pieceIndex, 'folioOriginal', e.target.value)}
                                      placeholder="Opcional"
                                    />
                                  </div>
                                  {tipoPieza.pieces.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => removeContrastPiece(pieceTypeIndex, pieceIndex)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
                )}
              </Card>
            )}

            {/* Cálculo de Recursos - Solo para área de corte y reposiciones */}
            {watch('currentArea') === 'corte' && watch('type') === 'repocision' && (
              <Card>
                <CardHeader>
                  <CardTitle>Cálculo de Recursos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2">Resumen de Costos</h4>
                      <div className="space-y-2 text-sm">
                        {productos.map((producto, index) => (
                          producto.consumoTela && producto.consumoTela > 0 && (
                            <div key={index} className="flex justify-between">
                              <span>{producto.modeloPrenda} - {producto.tela}</span>
                              <span>{producto.consumoTela} m × $60 = ${(producto.consumoTela * 60).toFixed(2)}</span>
                            </div>
                          )
                        ))}
                        {watch('tieneTelaContraste') && watch('telaContraste.consumo') && (
                          <div className="flex justify-between">
                            <span>Segunda Tela - {watch('telaContraste.tela')}</span>
                            <span>{watch('telaContraste.consumo')} m × $60 = ${((watch('telaContraste.consumo') || 0) * 60).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="border-t pt-2 font-medium flex justify-between">
                          <span>Total Estimado:</span>
                          <span>${calculateResourceCost().toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Autorización */}
            <Card>
              <CardHeader>
                <CardTitle>Autorización</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nivel de Urgencia *</Label>
                  <Select value={watch('urgencia')} onValueChange={(value: any) => setValue('urgencia', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {urgencyOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="observaciones">Otras Observaciones</Label>
                  <Textarea
                    id="observaciones"
                    {...register('observaciones')}
                    rows={3}
                    placeholder="Comentarios adicionales..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Documentos */}
            <Card>
              <CardHeader>
                <CardTitle>Documentos de Soporte</CardTitle>
              </CardHeader>
              <CardContent>
                <FileUpload
                  onFileSelect={setSelectedFiles}
                  label="Documentos de la Reposición"
                  description="Adjunta documentos relacionados con la reposición (PDF, XML)"
                  maxFiles={5}
                  maxSize={10}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createRepositionMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {createRepositionMutation.isPending ? 'Creando...' : 'Crear Solicitud'}              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }