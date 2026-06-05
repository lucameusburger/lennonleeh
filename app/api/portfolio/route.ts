import { getPortfolioPdfAsset } from "@/app/lib/cms";

const DEFAULT_PDF_FILENAME = "lennon-lee-hartmann-portfolio.pdf";
const PDF_CONTENT_TYPE = "application/pdf";
const REQUEST_HEADERS_TO_FORWARD = [
  "range",
  "if-range",
  "if-none-match",
  "if-modified-since",
] as const;
const RESPONSE_HEADERS_TO_FORWARD = [
  "accept-ranges",
  "content-length",
  "content-range",
  "etag",
  "last-modified",
] as const;

function getContentDisposition(fileName = DEFAULT_PDF_FILENAME) {
  const safeFileName = fileName.replaceAll(/["\r\n]/g, "");

  return `inline; filename="${safeFileName || DEFAULT_PDF_FILENAME}"`;
}

function getForwardedRequestHeaders(request: Request) {
  const headers = new Headers();

  for (const headerName of REQUEST_HEADERS_TO_FORWARD) {
    const headerValue = request.headers.get(headerName);

    if (headerValue) {
      headers.set(headerName, headerValue);
    }
  }

  return headers;
}

function getPdfResponseHeaders(assetFileName: string | undefined, upstream: Response) {
  const headers = new Headers({
    "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    "Content-Disposition": getContentDisposition(assetFileName),
    "Content-Type": upstream.headers.get("content-type") ?? PDF_CONTENT_TYPE,
  });

  for (const headerName of RESPONSE_HEADERS_TO_FORWARD) {
    const headerValue = upstream.headers.get(headerName);

    if (headerValue) {
      headers.set(headerName, headerValue);
    }
  }

  return headers;
}

function getTotalByteLength(contentRange: string | null) {
  if (!contentRange) {
    return null;
  }

  const totalByteLength = contentRange.match(/\/(\d+)$/)?.[1];

  return totalByteLength ?? null;
}

async function proxyPortfolioPdf(request: Request, method: "GET" | "HEAD") {
  try {
    const asset = await getPortfolioPdfAsset();

    if (!asset) {
      return new Response("Portfolio PDF has not been configured.", {
        headers: { "Cache-Control": "no-store" },
        status: 404,
      });
    }

    const requestHeaders = getForwardedRequestHeaders(request);
    const shouldProbeForHead = method === "HEAD" && !requestHeaders.has("range");

    if (shouldProbeForHead) {
      requestHeaders.set("range", "bytes=0-0");
    }

    const upstream = await fetch(asset.url, {
      cache: "no-store",
      headers: requestHeaders,
      method: "GET",
      signal: request.signal,
    });
    const headers = getPdfResponseHeaders(asset.fileName, upstream);

    if (shouldProbeForHead) {
      const totalByteLength = getTotalByteLength(upstream.headers.get("content-range"));

      if (totalByteLength) {
        headers.set("content-length", totalByteLength);
      }

      headers.delete("content-range");
    }

    if (!upstream.ok && upstream.status !== 304) {
      await upstream.body?.cancel();

      return new Response("Portfolio PDF could not be loaded.", {
        headers,
        status: upstream.status,
      });
    }

    if (method === "HEAD") {
      await upstream.body?.cancel();

      return new Response(null, {
        headers,
        status: shouldProbeForHead ? 200 : upstream.status,
      });
    }

    return new Response(upstream.body, {
      headers,
      status: upstream.status,
    });
  } catch {
    return new Response("Portfolio PDF could not be loaded.", {
      headers: { "Cache-Control": "no-store" },
      status: 500,
    });
  }
}

export function GET(request: Request) {
  return proxyPortfolioPdf(request, "GET");
}

export function HEAD(request: Request) {
  return proxyPortfolioPdf(request, "HEAD");
}
