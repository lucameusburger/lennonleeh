"use client";

import { ChevronDown, ChevronUp, Download, LoaderCircle } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type TouchEvent,
  type WheelEvent,
} from "react";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist";

const MAX_CANVAS_PIXELS = 24_000_000;
const PDF_URL = "/portfolio.pdf";
const WORKER_URL = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type ViewerSize = {
  width: number;
  height: number;
};

function clampPage(page: number, pageCount: number) {
  return Math.min(Math.max(page, 1), Math.max(pageCount, 1));
}

function isRenderCancel(error: unknown) {
  return error instanceof Error && error.name === "RenderingCancelledException";
}

function formatProgress(progress: number) {
  if (progress <= 0 || progress >= 1) {
    return "Loading portfolio";
  }

  return `${Math.round(progress * 100)}%`;
}

export default function PdfPortfolioViewer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const renderIdRef = useRef(0);
  const lastWheelAtRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);

  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [viewerSize, setViewerSize] = useState<ViewerSize>({
    width: 0,
    height: 0,
  });
  const [loadProgress, setLoadProgress] = useState(0);
  const [hasRendered, setHasRendered] = useState(false);
  const [isRendering, setIsRendering] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useCallback(
    (direction: -1 | 1) => {
      setPageNumber((currentPage) =>
        clampPage(currentPage + direction, pageCount),
      );
    },
    [pageCount],
  );

  useEffect(() => {
    const element = viewerRef.current;

    if (!element) {
      return;
    }

    const updateSize = () => {
      setViewerSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };

    updateSize();

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) {
        return;
      }

      setViewerSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    let loadedDocument: PDFDocumentProxy | null = null;

    async function loadPdf() {
      try {
        const pdfjs = await import("pdfjs-dist");

        pdfjs.GlobalWorkerOptions.workerSrc = WORKER_URL;

        loadingTask = pdfjs.getDocument({
          url: PDF_URL,
          rangeChunkSize: 512 * 1024,
          useSystemFonts: true,
        });

        loadingTask.onProgress = ({
          loaded,
          total,
        }: {
          loaded: number;
          total: number;
        }) => {
          if (!cancelled && total > 0) {
            setLoadProgress(loaded / total);
          }
        };

        const nextDocument = await loadingTask.promise;

        if (cancelled) {
          await nextDocument.destroy();
          return;
        }

        loadedDocument = nextDocument;
        setPdfDocument(nextDocument);
        setPageCount(nextDocument.numPages);
        setPageNumber((currentPage) =>
          clampPage(currentPage, nextDocument.numPages),
        );
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "The portfolio could not be opened.",
        );
        setIsRendering(false);
      }
    }

    loadPdf();

    return () => {
      cancelled = true;
      if (loadedDocument) {
        void loadedDocument.destroy();
      } else {
        void loadingTask?.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (!pdfDocument || !pageCount) {
      return;
    }

    const neighbors = [pageNumber - 1, pageNumber + 1].filter(
      (page) => page >= 1 && page <= pageCount,
    );
    let cancelled = false;

    for (const page of neighbors) {
      void pdfDocument.getPage(page).then((pageProxy) => {
        if (!cancelled) {
          pageProxy.cleanup();
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [pageCount, pageNumber, pdfDocument]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!pdfDocument || !canvas || viewerSize.width <= 0 || viewerSize.height <= 0) {
      return;
    }

    const document = pdfDocument;
    const renderCanvas = canvas;
    const context = renderCanvas.getContext("2d", { alpha: false });

    if (!context) {
      setError("The browser could not create a canvas context.");
      setIsRendering(false);
      return;
    }

    const renderContext = context;
    const renderId = renderIdRef.current + 1;
    renderIdRef.current = renderId;
    let cancelled = false;

    renderTaskRef.current?.cancel();
    setIsRendering(true);
    setError(null);

    async function renderPage() {
      try {
        const page = await document.getPage(pageNumber);

        if (cancelled || renderIdRef.current !== renderId) {
          page.cleanup();
          return;
        }

        const baseViewport = page.getViewport({ scale: 1 });
        const cssScale = Math.min(
          viewerSize.width / baseViewport.width,
          viewerSize.height / baseViewport.height,
        );
        const cssViewport = page.getViewport({ scale: cssScale });
        const pixelRatio = window.devicePixelRatio || 1;
        const canvasPixels = cssViewport.width * cssViewport.height;
        const maxOutputRatio = Math.sqrt(MAX_CANVAS_PIXELS / canvasPixels);
        const outputRatio = Math.max(1, Math.min(pixelRatio, maxOutputRatio));
        const renderViewport = page.getViewport({
          scale: cssScale * outputRatio,
        });

        renderCanvas.width = Math.floor(renderViewport.width);
        renderCanvas.height = Math.floor(renderViewport.height);
        renderCanvas.style.width = `${Math.floor(cssViewport.width)}px`;
        renderCanvas.style.height = `${Math.floor(cssViewport.height)}px`;
        renderCanvas.dataset.page = String(pageNumber);

        renderContext.fillStyle = "#ffffff";
        renderContext.fillRect(0, 0, renderCanvas.width, renderCanvas.height);

        const task = page.render({
          canvas: renderCanvas,
          canvasContext: renderContext,
          viewport: renderViewport,
          background: "rgb(255,255,255)",
        });

        renderTaskRef.current = task;
        await task.promise;

        if (!cancelled && renderIdRef.current === renderId) {
          setHasRendered(true);
          setIsRendering(false);
        }

        page.cleanup();
      } catch (renderError) {
        if (cancelled || isRenderCancel(renderError)) {
          return;
        }

        setError(
          renderError instanceof Error
            ? renderError.message
            : "This page could not be rendered.",
        );
        setIsRendering(false);
      }
    }

    void renderPage();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [pageCount, pageNumber, pdfDocument, viewerSize.height, viewerSize.width]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        navigate(1);
        return;
      }

      if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        navigate(-1);
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        setPageNumber(1);
        return;
      }

      if (event.key === "End" && pageCount > 0) {
        event.preventDefault();
        setPageNumber(pageCount);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, pageCount]);

  const handleWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      if (!pageCount || Math.abs(event.deltaY) < 28) {
        return;
      }

      const now = window.performance.now();

      if (now - lastWheelAtRef.current < 520) {
        return;
      }

      event.preventDefault();
      lastWheelAtRef.current = now;
      navigate(event.deltaY > 0 ? 1 : -1);
    },
    [navigate, pageCount],
  );

  const handleTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    touchStartYRef.current = event.touches[0]?.clientY ?? null;
  }, []);

  const handleTouchEnd = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      const startY = touchStartYRef.current;
      const endY = event.changedTouches[0]?.clientY ?? null;

      touchStartYRef.current = null;

      if (startY === null || endY === null || Math.abs(startY - endY) < 56) {
        return;
      }

      navigate(startY > endY ? 1 : -1);
    },
    [navigate],
  );

  const canGoBack = pageNumber > 1;
  const canGoForward = pageCount > 0 && pageNumber < pageCount;
  const statusText = error ?? formatProgress(loadProgress);

  const controlClass =
    "grid h-11 w-11 place-items-center rounded-lg border border-white/15 bg-black/55 text-white shadow-xl shadow-black/25 backdrop-blur-md transition hover:bg-white hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:pointer-events-none disabled:opacity-35";

  return (
    <main
      ref={viewerRef}
      aria-busy={isRendering}
      className="relative h-dvh w-dvw touch-pan-y overflow-hidden bg-[#101114] text-white"
      onTouchEnd={handleTouchEnd}
      onTouchStart={handleTouchStart}
      onWheel={handleWheel}
    >
      <div className="flex h-full w-full items-center justify-center">
        <canvas
          ref={canvasRef}
          className={`block max-h-full max-w-full bg-white transition-opacity duration-150 ${
            isRendering && hasRendered ? "opacity-70" : "opacity-100"
          }`}
        />
      </div>

      {!hasRendered || error ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[#101114]">
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm font-medium text-white/90 backdrop-blur-md">
            {!error ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            <span>{statusText}</span>
          </div>
        </div>
      ) : null}

      <div className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2 sm:right-5">
        <button
          aria-label="Previous page"
          className={controlClass}
          disabled={!canGoBack}
          onClick={() => navigate(-1)}
          title="Previous page"
          type="button"
        >
          <ChevronUp aria-hidden="true" className="h-5 w-5" strokeWidth={2.2} />
        </button>
        <button
          aria-label="Next page"
          className={controlClass}
          disabled={!canGoForward}
          onClick={() => navigate(1)}
          title="Next page"
          type="button"
        >
          <ChevronDown aria-hidden="true" className="h-5 w-5" strokeWidth={2.2} />
        </button>
        <a
          aria-label="Download portfolio PDF"
          className={controlClass}
          download="Lennon-Hartmann-Portfolio.pdf"
          href={PDF_URL}
          title="Download portfolio PDF"
        >
          <Download aria-hidden="true" className="h-5 w-5" strokeWidth={2.2} />
        </a>
      </div>

      {pageCount > 0 ? (
        <div
          aria-live="polite"
          className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-white/12 bg-black/45 px-3 py-1.5 text-xs font-medium tabular-nums text-white/85 backdrop-blur-md sm:bottom-5"
        >
          {pageNumber} / {pageCount}
        </div>
      ) : null}
    </main>
  );
}
