import React, { useState, useCallback, useRef } from "react";
import { ar } from "../../utils/arabicTranslations";
import {
  compressImage,
  getImagePreview,
  formatFileSize,
  validateImageFile,
} from "../../utils/imageCompression";
import { logger } from "../../utils/logger";
import { CameraIcon, XMarkIcon, PhotoIcon, XCircleIcon } from "@heroicons/react/24/outline";
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
  const [processingProgress, setProcessingProgress] = useState<Record<string, number>>({});
  const [pendingCount, setPendingCount] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const cancelledRef = useRef(false);
  const { showToast } = useToast();

  const updateProgress = useCallback((id: string, value: number) => {
    setProcessingProgress((prev) => ({ ...prev, [id]: value }));
  }, []);

  const removeProgress = useCallback((id: string) => {
    setProcessingProgress((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handleCancel = useCallback(() => {
    cancelledRef.current = true;
    setIsCompressing(false);
    setCompressingId(null);
    setProcessingProgress({});
    setPendingCount(0);
    setProcessedCount(0);
    showToast("تم إلغاء معالجة الصور", "info");
  }, [showToast]);

  const handleFileSelect = useCallback(
    async (
      event: React.ChangeEvent<HTMLInputElement>,
      type: "before" | "after",
    ) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const currentTypeCount = photos.filter((p) => p.type === type).length;
      const maxPerType = Math.floor(maxPhotos / 2);
      const remainingSlots = maxPerType - currentTypeCount;

      if (remainingSlots <= 0) {
        showToast(
          `يمكنك إضافة ${maxPerType} صور ${type === "before" ? "قبل" : "بعد"} فقط`,
          "warning"
        );
        return;
      }

      const filesToProcess = Array.from(files) as File[];
      const filesToAdd = filesToProcess.slice(0, remainingSlots);
      const newPhotos: Photo[] = [];

      cancelledRef.current = false;
      setIsCompressing(true);
      setPendingCount(filesToAdd.length);
      setProcessedCount(0);

      for (const file of filesToAdd) {
        if (cancelledRef.current) {
          break;
        }

        // Validate file
        const validation = validateImageFile(file, 10);
        if (!validation.valid) {
          showToast(validation.error || 'ملف غير صالح', "error");
          continue;
        }

        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setCompressingId(id);
        updateProgress(id, 0);

        let progressInterval: ReturnType<typeof setInterval> | null = null;
        try {
          // Simulate progress while compressing
          progressInterval = setInterval(() => {
            setProcessingProgress((prev) => {
              const current = prev[id] ?? 0;
              if (current >= 90) return prev;
              return { ...prev, [id]: Math.min(current + 10, 90) };
            });
          }, 100);

          // Get preview
          const preview = await getImagePreview(file);

          // Compress image
          const compressedFile = await compressImage(file, {
            maxWidth: 800,
            maxHeight: 800,
            quality: 0.8,
            format: "image/webp",
          });

          if (cancelledRef.current) {
            if (progressInterval) clearInterval(progressInterval);
            removeProgress(id);
            break;
          }

          if (progressInterval) clearInterval(progressInterval);
          updateProgress(id, 100);

          newPhotos.push({
            id,
            file: compressedFile,
            preview,
            type,
            compressed: true,
            originalSize: file.size,
            compressedSize: compressedFile.size,
          });

          // Briefly keep the 100% progress visible before removing
          setTimeout(() => removeProgress(id), 300);
        } catch (error) {
          if (progressInterval) clearInterval(progressInterval);
          removeProgress(id);
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

        setProcessedCount((prev) => prev + 1);
      }

      setIsCompressing(false);
      setCompressingId(null);
      if (!cancelledRef.current) {
        onChange([...photos, ...newPhotos]);
      }
      setPendingCount(0);
      setProcessedCount(0);

      // Reset input
      event.target.value = "";
    },
    [photos, onChange, maxPhotos, showToast, updateProgress, removeProgress],
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

  const processingIds = Object.keys(processingProgress);

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

      {/* Multi-photo progress panel */}
      {(isCompressing || processingIds.length > 0) && (
        <div className="p-4 bg-cream-2 dark:bg-espresso-light/50 rounded-lg border border-primary/30 dark:border-primary/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary dark:text-cream">
              جاري معالجة الصور… ({processedCount} / {pendingCount})
            </span>
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-ember-600 bg-white dark:bg-espresso-light border border-hairline rounded-lg hover:bg-ember-50 dark:hover:bg-ember-500/10 transition-colors"
            >
              <XCircleIcon className="w-4 h-4" />
              إلغاء
            </button>
          </div>

          <div className="space-y-2">
            {processingIds.map((id) => {
              const progress = processingProgress[id] ?? 0;
              return (                  <div key={id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-latte">
                    <span>جاري معالجة الصورة</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 bg-hairline rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Photo Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderPhotoSection("before", ar.step3.beforeLabel)}
        {renderPhotoSection("after", ar.step3.afterLabel)}
      </div>

    </div>
  );
};

export default PhotoUpload;
