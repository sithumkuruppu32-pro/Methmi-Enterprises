import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const widths = new Set([
  16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048,
  3840,
]);
const MAX_BYTES = 5 * 1024 * 1024;

function allowedRemoteSource(url: URL) {
  if (url.protocol !== "https:" || url.username || url.password || url.port)
    return false;
  if (url.hostname === "images.unsplash.com") return true;
  const isSupabase = /^[a-z0-9-]+\.supabase\.(co|in)$/.test(url.hostname);
  return isSupabase && url.pathname.startsWith("/storage/v1/object/public/");
}

async function readSource(src: string) {
  if (src.startsWith("/images/")) {
    const directory = path.resolve(process.cwd(), "public", "images");
    const filename = path.resolve(process.cwd(), "public", `.${src}`);
    if (!filename.startsWith(`${directory}${path.sep}`))
      throw new Error("Invalid source");
    const buffer = await readFile(filename);
    if (buffer.length > MAX_BYTES) throw new Error("Image too large");
    return buffer;
  }

  const url = new URL(src);
  if (!allowedRemoteSource(url)) throw new Error("Invalid source");
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
    cache: "force-cache",
    next: { revalidate: 86400 },
  });
  if (
    !response.ok ||
    !response.body ||
    !response.headers.get("content-type")?.startsWith("image/")
  ) {
    throw new Error("Image unavailable");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BYTES) throw new Error("Image too large");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return Buffer.concat(chunks);
}

export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get("src");
  const width = Number(request.nextUrl.searchParams.get("w"));
  const quality = Number(request.nextUrl.searchParams.get("q") ?? 60);
  if (!src || src.length > 2048 || !widths.has(width) || quality !== 60) {
    return new Response("Invalid thumbnail request", { status: 400 });
  }

  try {
    const source = await readSource(src);
    const thumbnail = await sharp(source, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(width, Math.max(1, Math.round((width * 144) / 400)), {
        fit: "cover",
        position: "centre",
      })
      .webp({ quality, effort: 4 })
      .toBuffer();

    // Only public photographs are cached. Admin HTML and authorization are not.
    return new Response(new Uint8Array(thumbnail), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control":
          "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Unable to load tour photo", { status: 400 });
  }
}
