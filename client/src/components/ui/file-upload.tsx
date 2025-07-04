import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, File, X, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  acceptedTypes?: string;
  maxFiles?: number;
  maxSize?: number; // in MB
  label?: string;
  description?: string;
}

export function FileUpload({
  onFileSelect,
  acceptedTypes = ".pdf,.xml,.jpg,.jpeg,.png",
  maxFiles = 3,
  maxSize = 10,
  label = "Documentos",
  description = "Selecciona archivos PDF, XML o imágenes"
}: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newErrors: string[] = [];

    // Validar número de archivos
    if (files.length > maxFiles) {
      newErrors.push(`Máximo ${maxFiles} archivos permitidos`);
      return;
    }

    // Validar tipo y tamaño de archivos
    const validFiles = files.filter(file => {
      const fileType = file.name.toLowerCase();
      const isValidType = fileType.endsWith('.pdf') || fileType.endsWith('.xml') || fileType.endsWith('.jpg') || fileType.endsWith('.jpeg') || fileType.endsWith('.png');
      const isValidSize = file.size <= maxSize * 1024 * 1024;

      if (!isValidType) {
        newErrors.push(`${file.name}: Solo se permiten archivos PDF, XML y imágenes (JPG, PNG, JPEG)`);
        return false;
      }
      if (!isValidSize) {
        newErrors.push(`${file.name}: El archivo debe ser menor a ${maxSize}MB`);
        return false;
      }
      return true;
    });

    setErrors(newErrors);
    setSelectedFiles(validFiles);
    onFileSelect(validFiles);
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFileSelect(newFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>{label}</Label>
        <p className="text-sm text-gray-500">{description}</p>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
        <Input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes}
          onChange={handleFileSelect}
          className="hidden"
        />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-sm text-gray-600 mb-2">
          Arrastra archivos aquí o haz clic para seleccionar
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          Seleccionar Archivos
        </Button>
        <p className="text-xs text-gray-400 mt-2">
          PDF, XML, JPG, PNG, JPEG hasta {maxSize}MB cada uno (máximo {maxFiles} archivos)
        </p>
      </div>

      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((error, index) => (
            <div key={index} className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          ))}
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <Label>Archivos seleccionados:</Label>
          {selectedFiles.map((file, index) => (
            <Card key={index}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <File className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}