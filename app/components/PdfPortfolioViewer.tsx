"use client";

import { ChevronDown, ChevronUp, Download, LoaderCircle } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
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
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const PDF_URL = "/portfolio.pdf";
const WORKER_URL = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type ViewerSize = {
  width: number;
  height: number;
};

type ViewerTouchList = TouchEvent<HTMLDivElement>["touches"];

type PinchState = {
  distance: number;
  focalX: number;
  focalY: number;
  normalizedX: number;
  normalizedY: number;
  startZoom: number;
};

function clampPage(page: number, pageCount: number) {
  return Math.min(Math.max(page, 1), Math.max(pageCount, 1));
}

function clampZoom(zoom: number) {
  return Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM);
}

function getTouchDistance(touches: ViewerTouchList) {
  const first = touches[0];
  const second = touches[1];

  if (!first || !second) {
    return 0;
  }

  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
}

function getTouchCenter(touches: ViewerTouchList) {
  const first = touches[0];
  const second = touches[1];

  if (!first || !second) {
    return null;
  }

  return {
    x: (first.clientX + second.clientX) / 2,
    y: (first.clientY + second.clientY) / 2,
  };
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
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const hideControlsTimerRef = useRef<number | null>(null);
  const pinchRef = useRef<PinchState | null>(null);
  const preloadedPagesRef = useRef<Set<number>>(new Set());
  const preloadingPagesRef = useRef<Set<number>>(new Set());
  const preloadRunRef = useRef(0);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const renderIdRef = useRef(0);
  const lastWheelAtRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);
  const zoomRef = useRef(1);
  const zoomCommitTimerRef = useRef<number | null>(null);

  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCssSize, setPageCssSize] = useState<ViewerSize>({
    width: 0,
    height: 0,
  });
  const [viewerSize, setViewerSize] = useState<ViewerSize>({
    width: 0,
    height: 0,
  });
  const [controlsVisible, setControlsVisible] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [hasRendered, setHasRendered] = useState(false);
  const [isCoarsePointer, setIsCoarsePointer] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(hover: none), (pointer: coarse)").matches,
  );
  const [isRendering, setIsRendering] = useState(true);
  const [activeZoom, setActiveZoom] = useState(1);
  const [renderedZoom, setRenderedZoom] = useState(1);
  const [targetRenderZoom, setTargetRenderZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const getZoomAnchor = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const scrollArea = scrollAreaRef.current;

    if (!canvas || !scrollArea) {
      return null;
    }

    const canvasRect = canvas.getBoundingClientRect();
    const scrollRect = scrollArea.getBoundingClientRect();

    if (canvasRect.width <= 0 || canvasRect.height <= 0) {
      return null;
    }

    return {
      focalX: clientX - scrollRect.left,
      focalY: clientY - scrollRect.top,
      normalizedX: Math.min(Math.max((clientX - canvasRect.left) / canvasRect.width, 0), 1),
      normalizedY: Math.min(Math.max((clientY - canvasRect.top) / canvasRect.height, 0), 1),
    };
  }, []);

  const revealControls = useCallback(() => {
    if (hideControlsTimerRef.current !== null) {
      window.clearTimeout(hideControlsTimerRef.current);
      hideControlsTimerRef.current = null;
    }

    setControlsVisible(true);

    if (!isCoarsePointer) {
      hideControlsTimerRef.current = window.setTimeout(() => {
        setControlsVisible(false);
      }, 1800);
    }
  }, [isCoarsePointer]);

  const navigate = useCallback(
    (direction: -1 | 1) => {
      revealControls();
      pinchRef.current = null;
      zoomRef.current = 1;
      if (zoomCommitTimerRef.current !== null) {
        window.clearTimeout(zoomCommitTimerRef.current);
        zoomCommitTimerRef.current = null;
      }
      setActiveZoom(1);
      setRenderedZoom(1);
      setTargetRenderZoom(1);
      scrollAreaRef.current?.scrollTo({ left: 0, top: 0 });
      setPageNumber((currentPage) =>
        clampPage(currentPage + direction, pageCount),
      );
    },
    [pageCount, revealControls],
  );

  useEffect(() => {
    zoomRef.current = activeZoom;
  }, [activeZoom]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: none), (pointer: coarse)");
    const updatePointerMode = () => {
      setIsCoarsePointer(mediaQuery.matches);

      if (mediaQuery.matches) {
        setControlsVisible(true);
      }
    };

    mediaQuery.addEventListener("change", updatePointerMode);

    return () => mediaQuery.removeEventListener("change", updatePointerMode);
  }, []);

  useEffect(() => {
    if (hideControlsTimerRef.current !== null) {
      window.clearTimeout(hideControlsTimerRef.current);
      hideControlsTimerRef.current = null;
    }

    if (!isCoarsePointer) {
      hideControlsTimerRef.current = window.setTimeout(() => {
        setControlsVisible(false);
      }, 1800);
    }

    return () => {
      if (hideControlsTimerRef.current !== null) {
        window.clearTimeout(hideControlsTimerRef.current);
      }
    };
  }, [isCoarsePointer]);

  useEffect(() => {
    return () => {
      if (zoomCommitTimerRef.current !== null) {
        window.clearTimeout(zoomCommitTimerRef.current);
      }
    };
  }, []);

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
        preloadedPagesRef.current.clear();
        preloadingPagesRef.current.clear();
        preloadRunRef.current += 1;
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
    if (!pdfDocument || !pageCount || !hasRendered) {
      return;
    }

    const document = pdfDocument;
    let cancelled = false;
    const runId = preloadRunRef.current + 1;
    preloadRunRef.current = runId;
    const preloadOrder: number[] = [];

    for (let distance = 1; distance < pageCount; distance += 1) {
      const nextPage = pageNumber + distance;
      const previousPage = pageNumber - distance;

      if (nextPage <= pageCount) {
        preloadOrder.push(nextPage);
      }

      if (previousPage >= 1) {
        preloadOrder.push(previousPage);
      }
    }

    const waitForIdle = () =>
      new Promise<void>((resolve) => {
        if (typeof window.requestIdleCallback === "function") {
          window.requestIdleCallback(() => resolve(), { timeout: 1200 });
          return;
        }

        globalThis.setTimeout(resolve, 90);
      });

    async function preloadPage(page: number) {
      if (
        preloadedPagesRef.current.has(page) ||
        preloadingPagesRef.current.has(page)
      ) {
        return;
      }

      preloadingPagesRef.current.add(page);

      try {
        const pageProxy = await document.getPage(page);

        await pageProxy.getOperatorList({ intent: "display" });
        preloadedPagesRef.current.add(page);
      } catch {
        // A preload miss should never interrupt the visible renderer.
      } finally {
        preloadingPagesRef.current.delete(page);
      }
    }

    async function preloadPages() {
      for (let index = 0; index < preloadOrder.length; index += 1) {
        if (cancelled || preloadRunRef.current !== runId) {
          return;
        }

        if (index > 1) {
          await waitForIdle();
        }

        await preloadPage(preloadOrder[index]);
      }
    }

    void preloadPages();

    return () => {
      cancelled = true;
    };
  }, [hasRendered, pageCount, pageNumber, pdfDocument]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!pdfDocument || !canvas || viewerSize.width <= 0 || viewerSize.height <= 0) {
      return;
    }

    const document = pdfDocument;
    const renderCanvas = canvas;
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
        const cssViewport = page.getViewport({ scale: cssScale * targetRenderZoom });
        const pixelRatio = window.devicePixelRatio || 1;
        const canvasPixels = cssViewport.width * cssViewport.height;
        const maxOutputRatio = Math.sqrt(MAX_CANVAS_PIXELS / canvasPixels);
        const outputRatio = Math.max(1, Math.min(pixelRatio, maxOutputRatio));
        const renderViewport = page.getViewport({
          scale: cssScale * targetRenderZoom * outputRatio,
        });
        const cssWidth = Math.floor(cssViewport.width);
        const cssHeight = Math.floor(cssViewport.height);
        const isNewPage = renderCanvas.dataset.page !== String(pageNumber);
        const outputCanvas = isNewPage
          ? renderCanvas
          : window.document.createElement("canvas");
        const renderContext = outputCanvas.getContext("2d", { alpha: false });

        if (!renderContext) {
          page.cleanup();
          setError("The browser could not create a canvas context.");
          setIsRendering(false);
          return;
        }

        outputCanvas.width = Math.floor(renderViewport.width);
        outputCanvas.height = Math.floor(renderViewport.height);

        renderContext.fillStyle = "#ffffff";
        renderContext.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

        if (isNewPage) {
          renderCanvas.style.width = `${cssWidth}px`;
          renderCanvas.style.height = `${cssHeight}px`;
          renderCanvas.dataset.page = String(pageNumber);
          setPageCssSize({ width: cssWidth, height: cssHeight });
          setRenderedZoom(targetRenderZoom);
        }

        const task = page.render({
          canvas: outputCanvas,
          canvasContext: renderContext,
          viewport: renderViewport,
          background: "rgb(255,255,255)",
        });

        renderTaskRef.current = task;
        await task.promise;

        if (!cancelled && renderIdRef.current === renderId) {
          if (!isNewPage) {
            renderCanvas.width = outputCanvas.width;
            renderCanvas.height = outputCanvas.height;
            renderCanvas.style.width = `${cssWidth}px`;
            renderCanvas.style.height = `${cssHeight}px`;
            renderCanvas.dataset.page = String(pageNumber);

            const displayContext = renderCanvas.getContext("2d", { alpha: false });

            if (!displayContext) {
              page.cleanup();
              setError("The browser could not create a canvas context.");
              setIsRendering(false);
              return;
            }

            displayContext.drawImage(outputCanvas, 0, 0);
            setPageCssSize({ width: cssWidth, height: cssHeight });
            setRenderedZoom(targetRenderZoom);
          }

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
  }, [
    pageCount,
    pageNumber,
    pdfDocument,
    targetRenderZoom,
    viewerSize.height,
    viewerSize.width,
  ]);

  useLayoutEffect(() => {
    const scrollArea = scrollAreaRef.current;
    const pinch = pinchRef.current;

    if (!scrollArea || !pinch || pageCssSize.width <= 0 || pageCssSize.height <= 0) {
      return;
    }

    const visualScale = activeZoom / renderedZoom;
    const visualPageWidth = pageCssSize.width * visualScale;
    const visualPageHeight = pageCssSize.height * visualScale;
    const contentWidth = Math.max(viewerSize.width, visualPageWidth);
    const contentHeight = Math.max(viewerSize.height, visualPageHeight);
    const canvasLeft = Math.max(0, (contentWidth - visualPageWidth) / 2);
    const canvasTop = Math.max(0, (contentHeight - visualPageHeight) / 2);

    scrollArea.scrollTo({
      left: canvasLeft + pinch.normalizedX * visualPageWidth - pinch.focalX,
      top: canvasTop + pinch.normalizedY * visualPageHeight - pinch.focalY,
    });
  }, [
    activeZoom,
    pageCssSize.height,
    pageCssSize.width,
    renderedZoom,
    viewerSize.height,
    viewerSize.width,
  ]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        revealControls();
        navigate(1);
        return;
      }

      if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        revealControls();
        navigate(-1);
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        revealControls();
        pinchRef.current = null;
        zoomRef.current = 1;
        setActiveZoom(1);
        setRenderedZoom(1);
        setTargetRenderZoom(1);
        scrollAreaRef.current?.scrollTo({ left: 0, top: 0 });
        setPageNumber(1);
        return;
      }

      if (event.key === "End" && pageCount > 0) {
        event.preventDefault();
        revealControls();
        pinchRef.current = null;
        zoomRef.current = 1;
        setActiveZoom(1);
        setRenderedZoom(1);
        setTargetRenderZoom(1);
        scrollAreaRef.current?.scrollTo({ left: 0, top: 0 });
        setPageNumber(pageCount);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, pageCount, revealControls]);

  const handleWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      revealControls();

      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const anchor = getZoomAnchor(event.clientX, event.clientY);

        if (anchor) {
          pinchRef.current = {
            distance: 1,
            startZoom: zoomRef.current,
            ...anchor,
          };
        } else {
          pinchRef.current = null;
        }

        setActiveZoom((currentZoom) => {
          const nextZoom = clampZoom(currentZoom * (event.deltaY > 0 ? 0.9 : 1.1));

          zoomRef.current = nextZoom;

          if (zoomCommitTimerRef.current !== null) {
            window.clearTimeout(zoomCommitTimerRef.current);
          }

          zoomCommitTimerRef.current = window.setTimeout(() => {
            setTargetRenderZoom(nextZoom);
          }, 180);

          return nextZoom;
        });
        return;
      }

      if (zoomRef.current > 1.01) {
        return;
      }

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
    [getZoomAnchor, navigate, pageCount, revealControls],
  );

  const handleTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    revealControls();

    if (event.touches.length === 2) {
      const center = getTouchCenter(event.touches);
      const distance = getTouchDistance(event.touches);
      const anchor = center ? getZoomAnchor(center.x, center.y) : null;

      if (!anchor || distance <= 0) {
        return;
      }

      pinchRef.current = {
        distance,
        startZoom: zoomRef.current,
        ...anchor,
      };
      touchStartYRef.current = null;
      return;
    }

    touchStartYRef.current = event.touches[0]?.clientY ?? null;
  }, [getZoomAnchor, revealControls]);

  const handleTouchMove = useCallback((event: TouchEvent<HTMLDivElement>) => {
    const pinch = pinchRef.current;

    if (!pinch || event.touches.length !== 2) {
      return;
    }

    const scrollArea = scrollAreaRef.current;
    const center = getTouchCenter(event.touches);
    const distance = getTouchDistance(event.touches);

    if (!scrollArea || !center || distance <= 0) {
      return;
    }

    event.preventDefault();
    revealControls();

    const anchor = getZoomAnchor(center.x, center.y);
    const nextZoom = clampZoom(pinch.startZoom * (distance / pinch.distance));

    if (anchor) {
      pinch.focalX = anchor.focalX;
      pinch.focalY = anchor.focalY;
    }

    zoomRef.current = nextZoom;
    setActiveZoom(nextZoom);
  }, [getZoomAnchor, revealControls]);

  const handleTouchEnd = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      if (pinchRef.current) {
        if (event.touches.length < 2) {
          pinchRef.current = null;
          setTargetRenderZoom(zoomRef.current);
        }
        return;
      }

      if (zoomRef.current > 1.01) {
        return;
      }

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

  const visualScale = activeZoom / renderedZoom;
  const visualPageWidth = pageCssSize.width * visualScale;
  const visualPageHeight = pageCssSize.height * visualScale;
  const contentWidth = Math.max(viewerSize.width, visualPageWidth);
  const contentHeight = Math.max(viewerSize.height, visualPageHeight);
  const canGoBack = pageNumber > 1;
  const canGoForward = pageCount > 0 && pageNumber < pageCount;
  const showTransientControls = isCoarsePointer || controlsVisible;
  const statusText = error ?? formatProgress(loadProgress);
  const transientControlsClass = showTransientControls
    ? "opacity-100"
    : "pointer-events-none opacity-0";
  const iconButtonClass =
    "grid h-11 w-11 place-items-center rounded-full bg-black text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:pointer-events-none disabled:opacity-35";

  return (
    <main
      ref={viewerRef}
      aria-busy={isRendering}
      className="relative h-dvh w-dvw overflow-hidden bg-black text-white"
      onMouseDown={revealControls}
      onMouseMove={revealControls}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onTouchStart={handleTouchStart}
      onWheel={handleWheel}
      style={{ touchAction: "pan-x pan-y" }}
    >
      <div ref={scrollAreaRef} className="pdf-scroll-area h-full w-full overflow-auto overscroll-contain">
        <div
          className="grid place-items-center"
          style={{
            height: contentHeight > 0 ? `${contentHeight}px` : "100%",
            width: contentWidth > 0 ? `${contentWidth}px` : "100%",
          }}
        >
          <div
            className="relative"
            style={{
              height: visualPageHeight > 0 ? `${visualPageHeight}px` : undefined,
              width: visualPageWidth > 0 ? `${visualPageWidth}px` : undefined,
            }}
          >
            <canvas
              ref={canvasRef}
              className="block origin-top-left bg-white"
              style={{ transform: `scale(${visualScale})` }}
            />
          </div>
        </div>
      </div>

      {!hasRendered || error ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black">
          <div className="flex items-center gap-3 rounded-full bg-black px-4 py-2.5 text-sm font-medium text-white">
            {!error ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            <span>{statusText}</span>
          </div>
        </div>
      ) : null}

      <div
        className={`fixed right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2 transition-opacity duration-300 sm:right-5 ${transientControlsClass}`}
      >
        <button
          aria-label="Previous page"
          className={iconButtonClass}
          disabled={!canGoBack}
          onClick={() => navigate(-1)}
          title="Previous page"
          type="button"
        >
          <ChevronUp aria-hidden="true" className="h-5 w-5" strokeWidth={2.2} />
        </button>
        <button
          aria-label="Next page"
          className={iconButtonClass}
          disabled={!canGoForward}
          onClick={() => navigate(1)}
          title="Next page"
          type="button"
        >
          <ChevronDown aria-hidden="true" className="h-5 w-5" strokeWidth={2.2} />
        </button>
      </div>

      <a
        aria-label="Download portfolio PDF"
        className={`fixed left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition-opacity duration-300 hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${transientControlsClass}`}
        download="Lennon-Hartmann-Portfolio.pdf"
        href={PDF_URL}
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
        title="Download portfolio PDF"
      >
        <Download aria-hidden="true" className="h-4 w-4" strokeWidth={2.2} />
        <span>Download PDF</span>
      </a>

      {pageCount > 0 ? (
        <div
          aria-live="polite"
          className={`fixed left-1/2 z-10 -translate-x-1/2 rounded-full bg-black px-3 py-1.5 text-xs font-medium tabular-nums text-white transition-opacity duration-300 ${transientControlsClass}`}
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 4.6rem)" }}
        >
          {pageNumber} / {pageCount}
        </div>
      ) : null}
    </main>
  );
}
