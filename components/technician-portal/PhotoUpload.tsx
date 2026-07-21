import React, { useState, useCallback } from "react";
import { ar } from "../../utils/arabicTranslations";
import {
  compressImage,
  getImagePreview,
  formatFileSize,
  validateImageFile,
} from "../../utils/imageCompression";
import { logger } from "../../utils/logger";
import { CameraIcon, XMarkIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { useToast } from "../ToastContext";

export interface Photo {
  id: string;
  file: File;
  preview: string;
  type: "before" | "after";
  compressed: boolean;
  originalSize: number;
  compressedSize?: number;
}

interface PhotoUploadProps {
  photos: Photo[];
  onChange: (photos: Photo[]) => void;
  maxPhotos?: number;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  photos,
  onChange,
  maxPhotos = 4,
}) => {
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressingId, setCompressingId] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleFileSelect = useCallback(
    async (
      event: React.ChangeEvent<HTMLInputElement>,
      type: "before" | "after",
    ) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const currentTypeCount = photos.filter((p) => p.type === type).length;
      const remainingSlots = Math.floor(maxPhotos / 2) - currentTypeCount;

      if (remainingSlots <= 0) {
        showToast(
          `يمكنك إضافة ${Math.floor(maxPhotos / 2)} صور ${type === "before" ? "قبل" : "بعد"} فقط`,
          "warning"
        );
        return;
      }

      const filesToProcess = Array.from(files) as File[];
      const filesToAdd = filesToProcess.slice(0, remainingSlots);
      const newPhotos: Photo[] = [];

      for (const file of filesToAdd) {
        // Validate file
        const validation = validateImageFile(file, 10);
        if (!validation.valid) {
          showToast(validation.error || 'ملف غير صالح', "error");
          continue;
        }

        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setCompressingId(id);
        setIsCompressing(true);

        try {
          // Get preview
          const preview = await getImagePreview(file);

          // Compress image
          const compressedFile = await compressImage(file, {
            maxWidth: 800,
            maxHeight: 800,
            quality: 0.8,
            format: "image/webp",
          });

          newPhotos.push({
            id,
            file: compressedFile,
            preview,
            type,
            compressed: true,
            originalSize: file.size,
            compressedSize: compressedFile.size,
          });
        } catch (error) {
          logger.error("Error processing image", error, "upload");
          // Use original file if compression fails
          const preview = await getImagePreview(file);
          newPhotos.push({
            id,
            file,
            preview,
            type,
            compressed: false,
            originalSize: file.size,
          });
        }
      }

      setIsCompressing(false);
      setCompressingId(null);
      onChange([...photos, ...newPhotos]);

      // Reset input
      event.target.value = "";
    },
    [photos, onChange, maxPhotos],
  );

  const handleRemove = useCallback(
    (id: string) => {
      onChange(photos.filter((p) => p.id !== id));
    },
    [photos, onChange],
  );

  const beforePhotos = photos.filter((p) => p.type === "before");
  const afterPhotos = photos.filter((p) => p.type === "after");

  const renderPhotoSection = (type: "before" | "after", title: string) => {
    const typePhotos = type === "before" ? beforePhotos : afterPhotos;
    const maxPerType = Math.floor(maxPhotos / 2);

    return (
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-primary dark:text-cream">
          {title}
        </h4>

        {/* Photo Grid */}
        {typePhotos.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {typePhotos.map((photo) => (
              <div
                key={photo.id}
                className="relative aspect-square rounded-lg overflow-hidden border border-hairline dark:border-hairline bg-cream dark:bg-espresso-light"
              >
                <img
                  src={photo.preview}
                  alt={`${type} photo`}
                  className="w-full h-full object-cover"
                />

                {/* Compression Badge */}
                {photo.compressed && photo.compressedSize && (
                  <div className="absolute bottom-1 left-1 bg-leaf-500/80 text-white text-xs px-2 py-0.5 rounded">
                    {formatFileSize(photo.compressedSize)}
                  </div>
                )}

                {/* Remove Button */}
                <button
                  onClick={() => handleRemove(photo.id)}
                  className="absolute top-1 right-1 p-1 bg-ember-500/80 hover:bg-ember-700 text-white rounded-full transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>

                {/* Compressing Overlay */}
                {isCompressing && compressingId === photo.id && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-white text-sm">جاري الضغط...</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add Photo Button */}
        {typePhotos.length < maxPerType && (
          <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-hairline dark:border-hairline rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-all">
            <CameraIcon className="w-5 h-5 text-latte" />
            <span className="text-sm text-primary dark:text-cream">
              {ar.step3.addPhoto}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect(e, type)}
              className="hidden"
              multiple={typePhotos.length < maxPerType - 1}
            />
          </label>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-primary dark:text-cream">
        <PhotoIcon className="w-5 h-5" />
        <span className="font-medium">{ar.step3.photosLabel}</span>
      </div>

      <p className="text-sm text-latte dark:text-cream/70">
        {ar.step3.photosHint}
      </p>

      {/* Photo Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderPhotoSection("before", ar.step3.beforeLabel)}
        {renderPhotoSection("after", ar.step3.afterLabel)}
      </div>

    </div>
  );
};

export default PhotoUpload;
