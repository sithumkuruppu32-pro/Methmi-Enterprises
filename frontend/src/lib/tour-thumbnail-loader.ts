import type { ImageLoaderProps } from "next/image";
import thumbnails from "./tour-thumbnails.json";

// Crop on the server before downloading: admin cards display a short banner,
// so transferring the entire original photograph wastes most of its pixels.
export function tourThumbnailLoader({ src, width, quality }: ImageLoaderProps) {
  const key = (thumbnails as Record<string, string>)[src];
  if (key) {
    // Existing upload URLs contain a timestamp. Keep the exact URL as the key
    // so replacing a photo automatically switches to the live thumbnail route.
    const supported = [256, 384, 640, 750, 828, 1080, 1200];
    const size = supported.find((candidate) => candidate >= width) ?? 1200;
    return `/images/admin-tours/${key}-${size}.webp`;
  }
  const params = new URLSearchParams({
    src,
    w: String(width),
    q: String(quality ?? 60),
  });
  return `/api/tour-thumbnail?${params}`;
}
