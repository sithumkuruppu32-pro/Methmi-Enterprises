import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Headers that should not be copied between separate HTTP connections.
const HOP_BY_HOP_HEADERS = [
  "connection",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-length",
  "accept-encoding",
];

async function proxyRequest(request: NextRequest): Promise<NextResponse> {
  const backendUrl =
    process.env.BACKEND_INTERNAL_URL?.trim() ||
    process.env.BACKEND_URL?.trim();

  if (!backendUrl) {
    return NextResponse.json(
      { error: "Backend URL is not configured." },
      { status: 503 },
    );
  }

  try {
    const target = new URL(backendUrl);
    if (!(["http:", "https:"].includes(target.protocol))) {
      throw new Error("Unsupported backend URL protocol.");
    }

    // Set pathname/search separately to keep the configured backend host fixed.
    target.pathname = request.nextUrl.pathname;
    target.search = request.nextUrl.search;

    const requestHeaders = new Headers(request.headers);
    for (const header of HOP_BY_HOP_HEADERS) {
      requestHeaders.delete(header);
    }

    const hasBody = request.method !== "GET" && request.method !== "HEAD";
    const upstream = await fetch(target, {
      method: request.method,
      headers: requestHeaders,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: "no-store",
      redirect: "manual",
      signal: request.signal,
    });

    const responseHeaders = new Headers(upstream.headers);
    for (const header of HOP_BY_HOP_HEADERS) {
      responseHeaders.delete(header);
    }
    // The fetch runtime may have decompressed the response body.
    responseHeaders.delete("content-encoding");
    responseHeaders.set("cache-control", "no-store");

    // Preserve independent Set-Cookie headers for admin login/logout.
    const setCookies = upstream.headers.getSetCookie();
    if (setCookies.length > 0) {
      responseHeaders.delete("set-cookie");
      for (const cookie of setCookies) {
        responseHeaders.append("set-cookie", cookie);
      }
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Backend API proxy failed:", error);
    return NextResponse.json(
      { error: "Unable to connect to the backend." },
      { status: 502 },
    );
  }
}

export {
  proxyRequest as GET,
  proxyRequest as POST,
  proxyRequest as PUT,
  proxyRequest as PATCH,
  proxyRequest as DELETE,
  proxyRequest as OPTIONS,
  proxyRequest as HEAD,
};
