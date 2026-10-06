// Shrinks a photo picked on the phone (often 3–10 MB, sometimes HEIC) to a small JPEG data URL
// before it is sent to the server, so uploads never hit the size limits.

export class ImageTooLargeError extends Error {}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      // Respects the EXIF rotation of phone photos.
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fall back to <img> below (older Safari, unusual formats).
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Returns a JPEG data URL no longer than `maxChars`, scaling the longest side down to
 * `maxSide` px first and lowering quality/size further if needed.
 */
export async function compressImage(
  file: File,
  { maxSide = 1024, maxChars = 700_000 }: { maxSide?: number; maxChars?: number } = {},
): Promise<string> {
  if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) {
    throw new Error("فقط فایل عکس رو می‌شه انتخاب کرد");
  }

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await loadBitmap(file);
  } catch {
    throw new Error("این عکس باز نشد؛ یه عکس دیگه امتحان کن");
  }
  const width = "naturalWidth" in source ? source.naturalWidth : source.width;
  const height = "naturalHeight" in source ? source.naturalHeight : source.height;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("مرورگر نمی‌تونه عکس رو آماده کنه");

  let side = maxSide;
  let quality = 0.82;
  for (let attempt = 0; attempt < 8; attempt++) {
    const scale = Math.min(1, side / Math.max(width, height));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    ctx.fillStyle = "#fff"; // transparent PNGs would turn black as JPEG
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrl.length <= maxChars) {
      if ("close" in source) source.close();
      return dataUrl;
    }
    if (quality > 0.6) quality -= 0.1;
    else side = Math.round(side * 0.8);
  }
  if ("close" in source) source.close();
  throw new ImageTooLargeError("عکس خیلی بزرگه؛ یه عکس دیگه انتخاب کن");
}
