/**
 * Image compression utility for technician portal
 * Compresses images before upload to save Supabase storage space
 */
import { logger } from './logger';

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/webp' | 'image/jpeg' | 'image/png';
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 800,
  maxHeight: 800,
  quality: 0.8,
  format: 'image/webp',
};

/**
 * Compress an image file
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Promise<File> - The compressed image file
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Skip compression for SVG files (check both MIME type and extension)
  if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;

        if (width > opts.maxWidth!) {
          height = (height * opts.maxWidth!) / width;
          width = opts.maxWidth!;
        }

        if (height > opts.maxHeight!) {
          width = (width * opts.maxHeight!) / height;
          height = opts.maxHeight!;
        }

        // Create canvas and draw image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw image with white background (for transparency in PNGs)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'));
              return;
            }

            // Create new file from blob
            const compressedFile = new File([blob], getCompressedFileName(file.name, opts.format!), {
              type: opts.format!,
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          opts.format,
          opts.quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Get compressed file name with appropriate extension
 */
function getCompressedFileName(originalName: string, format: string): string {
  const baseName = originalName.replace(/\.[^/.]+$/, '');
  const extension = format === 'image/webp' ? 'webp' : format === 'image/jpeg' ? 'jpg' : 'png';
  return `${baseName}_compressed.${extension}`;
}

/**
 * Compress multiple images
 * Fix 4.4: Use Promise.all for parallel compression instead of sequential loop
 * @param files - Array of image files
 * @param options - Compression options
 * @returns Promise<File[]> - Array of compressed files
 */
export async function compressMultipleImages(
  files: File[],
  options?: CompressionOptions
): Promise<File[]> {
  // Fix 4.4: Process all images in parallel using Promise.all
  const compressionPromises = files.map(async (file) => {
    try {
      return await compressImage(file, options);
    } catch (error) {
      logger.error('Failed to compress image: ' + file.name, error, 'image');
      // If compression fails, return original file
      return file;
    }
  });

  return Promise.all(compressionPromises);
}

/**
 * Get image preview URL
 * @param file - The image file
 * @returns Promise<string> - Data URL for preview
 */
export function getImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Format file size for display
 * @param bytes - Size in bytes
 * @returns string - Formatted size (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if file is an image
 * @param file - The file to check
 * @returns boolean
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Validate image file
 * @param file - The file to validate
 * @param maxSizeMB - Maximum size in MB
 * @returns { valid: boolean; error?: string }
 */
export function validateImageFile(
  file: File,
  maxSizeMB: number = 10
): { valid: boolean; error?: string } {
  if (!isImageFile(file)) {
    return { valid: false, error: 'الملف ليس صورة' };
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `حجم الصورة كبير جداً. الحد الأقصى ${maxSizeMB} ميجابايت`,
    };
  }

  return { valid: true };
}
