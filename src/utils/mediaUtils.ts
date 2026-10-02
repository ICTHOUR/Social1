/**
 * Utility functions for media detection and handling
 */

export function isVideoUrl(url: string | null | undefined, mediaType?: string): boolean {
  if (mediaType === 'video' || mediaType === 'text_video') return true;
  if (mediaType === 'image') return false;
  if (!url) return false;
  
  const lower = url.toLowerCase();
  
  // Data URLs
  if (lower.startsWith('data:')) {
    return lower.startsWith('data:video/');
  }
  
  // Blob URLs
  if (lower.startsWith('blob:')) {
    return mediaType === 'video';
  }
  
  // Extensions check (accounting for query parameters)
  if (/\.(mp4|webm|mov|m4v|3gp|mkv|avi|flv|wmv|ogg)(\?.*)?$/i.test(lower)) {
    return true;
  }
  
  return false;
}
