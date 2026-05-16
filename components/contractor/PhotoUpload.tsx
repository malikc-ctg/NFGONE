'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, X, Upload, Image as ImageIcon } from 'lucide-react';

interface PhotoUploadProps {
  category: 'before' | 'after';
  jobId: string;
  onPhotosChange?: (photos: PhotoFile[]) => void;
  maxPhotos?: number;
}

export interface PhotoFile {
  id: string;
  file: File;
  preview: string;
  caption: string;
  category: 'before' | 'after';
}

export function PhotoUpload({ category, jobId, onPhotosChange, maxPhotos = 6 }: PhotoUploadProps) {
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > maxPhotos) {
      return;
    }

    const newPhotos: PhotoFile[] = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      caption: '',
      category,
    }));

    const updated = [...photos, ...newPhotos];
    setPhotos(updated);
    onPhotosChange?.(updated);

    // Reset inputs
    if (e.target) e.target.value = '';
  }

  function removePhoto(id: string) {
    const updated = photos.filter(p => p.id !== id);
    // Revoke old URL
    const removed = photos.find(p => p.id === id);
    if (removed) URL.revokeObjectURL(removed.preview);
    setPhotos(updated);
    onPhotosChange?.(updated);
  }

  async function uploadPhotos() {
    if (photos.length === 0) return;
    setUploading(true);
    try {
      for (const photo of photos) {
        const formData = new FormData();
        formData.append('file', photo.file);
        formData.append('job_id', jobId);
        formData.append('photo_type', category);
        formData.append('caption', photo.caption || `${category} photo`);

        await fetch('/api/photos/upload', {
          method: 'POST',
          body: formData,
        });
      }
    } catch {
      console.error('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  const categoryConfig = {
    before: {
      title: 'Before Photos',
      subtitle: 'Document the space before you start',
      gradient: 'from-amber-500 to-orange-500',
      bgLight: 'bg-amber-50 dark:bg-amber-900/20',
      borderColor: 'border-amber-200 dark:border-amber-800',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    after: {
      title: 'After Photos',
      subtitle: 'Show off your work!',
      gradient: 'from-emerald-500 to-green-500',
      bgLight: 'bg-emerald-50 dark:bg-emerald-900/20',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
  };

  const config = categoryConfig[category];

  return (
    <Card className={`${config.borderColor} overflow-hidden`}>
      <CardHeader className={`pb-2 ${config.bgLight}`}>
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`${config.iconBg} rounded-full p-1.5`}>
              <ImageIcon className={`h-3.5 w-3.5 ${config.iconColor}`} />
            </div>
            <div>
              <p className="font-bold text-sm">{config.title}</p>
              <p className="text-[10px] text-muted-foreground font-normal">{config.subtitle}</p>
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">
            {photos.length}/{maxPhotos}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        {/* Photo Grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden group">
                <img
                  src={photo.preview}
                  alt={`${category} photo`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removePhoto(photo.id)}
                  className="absolute top-1 right-1 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent p-1">
                  <p className="text-[9px] text-white font-medium truncate">
                    {photo.file.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        {photos.length < maxPhotos && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="h-4 w-4 mr-2" />
              Camera
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Gallery
            </Button>
          </div>
        )}

        {/* Hidden Inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Upload button (if photos exist and an upload API is wired) */}
        {photos.length > 0 && (
          <Button
            type="button"
            onClick={uploadPhotos}
            disabled={uploading}
            className={`w-full h-10 bg-gradient-to-r ${config.gradient} text-white border-0`}
          >
            {uploading ? 'Uploading...' : `Save ${photos.length} Photo${photos.length > 1 ? 's' : ''}`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
