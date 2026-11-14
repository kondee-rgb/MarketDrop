/**
 * Client-side photo downscale before upload/storage.
 * Phone photos (3–6 MB) exceed Vercel's 4.5 MB body limit once base64'd and fill localStorage fast.
 */
export async function compressImageFile(
  file: File,
  maxSide = 1600,
  quality = 0.82
): Promise<{ dataUrl: string; mimeType: string }> {
  const readRaw = () =>
    new Promise<{ dataUrl: string; mimeType: string }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ dataUrl: reader.result as string, mimeType: file.type || 'image/jpeg' });
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    URL.revokeObjectURL(url);

    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return readRaw();
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { dataUrl: canvas.toDataURL('image/jpeg', quality), mimeType: 'image/jpeg' };
  } catch {
    // e.g. HEIC the browser can't decode — send as-is and let the server try
    return readRaw();
  }
}
