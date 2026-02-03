/**
 * Read a File into an ArrayBuffer so uploads don't depend on the original File reference.
 * Use before any async work to avoid mobile browsers invalidating the file handle.
 */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Map abort-like storage errors to a user-friendly message.
 */
export function normalizeUploadErrorMessage(message: string): string {
  if (!message) return 'Upload failed. Please try again.';
  const m = message.toLowerCase();
  if (m.includes('abort') || m.includes('signal aborted')) {
    return 'Upload was interrupted. Please try again.';
  }
  return message;
}
