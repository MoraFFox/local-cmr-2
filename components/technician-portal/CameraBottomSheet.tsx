import React, { useState, useRef, useCallback } from 'react';
import { ar } from '../../utils/arabicTranslations';
import { CameraIcon, PhotoIcon, XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Photo } from './PhotoUpload';
import {
  compressImage,
  getImagePreview,
  validateImageFile,
} from '../../utils/imageCompression';

interface CameraBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  photos: Photo[];
  onPhotosChange: (photos: Photo[]) => void;
  maxPhotos?: number;
}

const CameraBottomSheet: React.FC<CameraBottomSheetProps> = ({
  isOpen,
  onClose,
  photos,
  onPhotosChange,
  maxPhotos = 4,
}) => {
  const beforeCount = photos.filter((p) => p.type === 'before').length;
  const afterCount = photos.filter((p) => p.type === 'after').length;
  const maxPerType = Math.floor(maxPhotos / 2);

  // Auto-select type: if no before photos, suggest before; otherwise after
  const [photoType, setPhotoType] = useState<'before' | 'after'>(
    beforeCount < maxPerType ? 'before' : 'after'
  );

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmView, setConfirmView] = useState(false);

  // Reset view when opening/closing
  React.useEffect(() => {
    if (isOpen) setConfirmView(false);
  }, [isOpen]);

  const handleFileSelected = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const currentTypeCount = photos.filter((p) => p.type === photoType).length;
      const remainingSlots = maxPerType - currentTypeCount;
      if (remainingSlots <= 0) return;

      const filesToProcess = Array.from(files).slice(0, remainingSlots);
      setIsProcessing(true);

      const newPhotos: Photo[] = [];
      for (const file of filesToProcess) {
        const validation = validateImageFile(file, 10);
        if (!validation.valid) continue;

        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        try {
          const preview = await getImagePreview(file);
          const compressedFile = await compressImage(file, {
            maxWidth: 800,
            maxHeight: 800,
            quality: 0.8,
            format: 'image/webp',
          });
          newPhotos.push({
            id,
            file: compressedFile,
            preview,
            type: photoType,
            compressed: true,
            originalSize: file.size,
            compressedSize: compressedFile.size,
          });
        } catch {
          const preview = await getImagePreview(file);
          newPhotos.push({
            id,
            file,
            preview,
            type: photoType,
            compressed: false,
            originalSize: file.size,
          });
        }
      }

      onPhotosChange([...photos, ...newPhotos]);
      setIsProcessing(false);
      onClose();
    },
    [photos, photoType, maxPerType, onPhotosChange, onClose]
  );

  const confirmClear = () => {
    onPhotosChange(photos.filter((p) => p.type !== photoType));
    setConfirmView(false);
  };

  if (!isOpen) return null;

  const canAddBefore = beforeCount < maxPerType;
  const canAddAfter = afterCount < maxPerType;
  const canAdd = photoType === 'before' ? canAddBefore : canAddAfter;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up" dir="rtl">
        <div className="bg-cream dark:bg-chrome-light rounded-t-2xl shadow-sm max-w-lg mx-auto">
          {/* Drag Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-hairline dark:bg-hairline" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-4">
            <h3 className="text-lg font-semibold text-ink dark:text-cream">
              {ar.portal.capturePhoto}
            </h3>
            <button
              onClick={onClose}
              className="p-2 -ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-cream-2 dark:hover:bg-chrome-light/50 transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-latte" />
            </button>
          </div>



          {/* Confirmation View */}
          {confirmView ? (
            <div className="px-5 pb-8 animate-fade-in">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-ember-500/10 dark:bg-ember-500/20 flex items-center justify-center mb-3">
                  <TrashIcon className="w-6 h-6 text-ember-700 dark:text-ember-300" />
                </div>
                <h4 className="text-lg font-semibold text-ink dark:text-cream mb-1">
                  {ar.portal.resetPhotos}?
                </h4>
                <p className="text-sm text-latte dark:text-cream/70">
                  {ar.common.remove} {photoType === 'before' ? ar.portal.beforeMaintenance : ar.portal.afterMaintenance}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setConfirmView(false)}
                  className="py-3 px-4 rounded-xl border border-hairline text-ink dark:text-cream font-semibold text-sm hover:bg-cream-2 dark:hover:bg-chrome-light/50 transition-colors"
                >
                  {ar.common.cancel}
                </button>
                <button
                  onClick={confirmClear}
                  className="py-3 px-4 rounded-xl bg-ember-500 hover:bg-ember-700 text-white font-semibold text-sm transition-colors shadow-sm"
                >
                  {ar.common.remove}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Photo Type Selector */}
              <div className="px-5 pb-5">
                <label className="block text-sm font-medium text-ink dark:text-cream mb-3">
                  {ar.portal.photoType}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPhotoType('before')}
                    disabled={!canAddBefore}
                    className={`py-3 px-4 min-h-[48px] rounded-xl border-2 transition-all text-sm font-semibold ${
                      photoType === 'before'
                        ? 'border-brand-red bg-primary/10 dark:bg-primary/20 text-brand-red dark:text-brand-red-light'
                        : 'border-hairline text-ink dark:text-cream'
                    } ${!canAddBefore ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {ar.portal.beforeMaintenance}
                    <span className="block text-xs font-normal mt-0.5 opacity-70">
                      {beforeCount}/{maxPerType}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoType('after')}
                    disabled={!canAddAfter}
                    className={`py-3 px-4 min-h-[48px] rounded-xl border-2 transition-all text-sm font-semibold ${
                      photoType === 'after'
                        ? 'border-brand-red bg-primary/10 dark:bg-primary/20 text-brand-red dark:text-brand-red-light'
                        : 'border-hairline text-ink dark:text-cream'
                    } ${!canAddAfter ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {ar.portal.afterMaintenance}
                    <span className="block text-xs font-normal mt-0.5 opacity-70">
                      {afterCount}/{maxPerType}
                    </span>
                  </button>
                </div>

                {/* Reset/Clear Button */}
                {(photoType === 'before' ? beforeCount > 0 : afterCount > 0) && (
                  <div className="flex justify-center mt-3">
                    <button
                      type="button"
                      onClick={() => setConfirmView(true)}
                      className="flex items-center gap-2 text-ember-500 hover:text-ember-700 hover:bg-ember-500/10 dark:hover:bg-ember-500/20 py-2 px-4 rounded-lg transition-colors text-sm font-medium"
                    >
                      <TrashIcon className="w-4 h-4" />
                      {ar.portal.resetPhotos}
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="px-5 pb-8 space-y-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={!canAdd || isProcessing}
                  className="w-full flex items-center justify-center gap-3 py-4 px-4 min-h-[56px] bg-hover hover:bg-copper-700 disabled:bg-cream-3 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-base transition-all active:scale-[0.98]"
                >
                  {isProcessing ? (
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <CameraIcon className="w-6 h-6" />
                  )}
                  {isProcessing ? ar.common.loading : ar.portal.capturePhoto}
                </button>

                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={!canAdd || isProcessing}
                  className="w-full flex items-center justify-center gap-3 py-4 px-4 min-h-[56px] bg-cream dark:bg-chrome-light hover:bg-cream-2 dark:hover:bg-chrome-light/50 disabled:opacity-50 disabled:cursor-not-allowed text-ink dark:text-cream rounded-xl font-semibold text-base transition-all active:scale-[0.98]"
                >
                  <PhotoIcon className="w-6 h-6" />
                  {ar.portal.chooseFromGallery}
                </button>
              </div>
            </>
          )}

          {/* Hidden File Inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFileSelected(e.target.files)}
            className="hidden"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFileSelected(e.target.files)}
            className="hidden"
          />
        </div>
      </div>
    </>
  );
};

export default CameraBottomSheet;
