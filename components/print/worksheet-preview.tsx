"use client";

import { useEffect, useRef, useState } from "react";
import { WorksheetDocument } from "@/components/print/worksheet-document";
import { Button } from "@/components/ui/button";
import type { FichePayload } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const SCALE = 0.62;
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
/** Tolerate sub-pixel rounding when comparing against 297mm. */
const OVERFLOW_TOLERANCE_PX = 1;

export type OverflowPage = 1 | 2 | 3;

type WorksheetPreviewProps = {
  payload: FichePayload;
  numero: number;
  theme: string | null;
  dateLabel: string;
  editedFields?: ReadonlySet<string>;
  onOverflowChange?: (page: OverflowPage | null) => void;
};

function mmToPx(mm: number): number {
  // 1in = 25.4mm; CSS px at 96dpi → 96/25.4 px per mm
  return (mm * 96) / 25.4;
}

export function WorksheetPreview({
  payload,
  numero,
  theme,
  dateLabel,
  editedFields,
  onOverflowChange,
}: WorksheetPreviewProps) {
  const [page, setPage] = useState<OverflowPage>(1);
  const documentRef = useRef<HTMLDivElement>(null);
  const onOverflowChangeRef = useRef(onOverflowChange);
  onOverflowChangeRef.current = onOverflowChange;

  // Content that can change page height — re-attach observers when it shifts.
  const layoutKey = [
    payload.text,
    payload.title,
    ...payload.vocabulary.map((v) => v.term),
    ...payload.questions.map((q) => q.prompt),
    ...payload.ordering.sentences.map((s) => s.text),
    payload.ordering.rationale,
  ].join("\0");

  useEffect(() => {
    const root = documentRef.current;
    if (!root) return;

    const container = root;
    container.dataset.layoutKey = String(layoutKey.length);
    const pageHeightPx = mmToPx(PAGE_HEIGHT_MM);

    function measure() {
      const articles = container.querySelectorAll<HTMLElement>("[data-page]");
      if (!articles.length) {
        onOverflowChangeRef.current?.(null);
        return;
      }

      let firstOverflow: OverflowPage | null = null;
      for (const article of articles) {
        const raw = article.getAttribute("data-page");
        const n = Number(raw);
        if (n !== 1 && n !== 2 && n !== 3) continue;
        if (article.offsetHeight > pageHeightPx + OVERFLOW_TOLERANCE_PX) {
          firstOverflow = n;
          break;
        }
      }
      onOverflowChangeRef.current?.(firstOverflow);
    }

    // Wait a frame so layout reflects the latest payload before measuring.
    const raf = requestAnimationFrame(measure);

    const observer = new ResizeObserver(() => {
      measure();
    });
    for (const article of container.querySelectorAll<HTMLElement>(
      "[data-page]",
    )) {
      observer.observe(article);
    }

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [layoutKey]);

  return (
    <div className="flex flex-col gap-3">
      <div
        className="overflow-hidden bg-white shadow-[0_4px_24px_rgb(0_0_0/0.12)]"
        style={{
          width: `calc(${PAGE_WIDTH_MM}mm * ${SCALE})`,
          height: `calc(${PAGE_HEIGHT_MM}mm * ${SCALE})`,
        }}
      >
        <div
          ref={documentRef}
          className="relative origin-top-left"
          style={{
            width: `${PAGE_WIDTH_MM}mm`,
            height: `${PAGE_HEIGHT_MM}mm`,
            transform: `scale(${SCALE})`,
          }}
          data-preview-page={page}
        >
          <style>{`
            [data-preview-page] [data-page] {
              position: absolute;
              top: 0;
              left: 0;
              margin: 0;
              min-height: ${PAGE_HEIGHT_MM}mm;
              width: ${PAGE_WIDTH_MM}mm;
              visibility: hidden;
              z-index: 0;
              pointer-events: none;
            }
            [data-preview-page="${page}"] [data-page="${page}"] {
              visibility: visible;
              z-index: 1;
              pointer-events: auto;
            }
          `}</style>
          <WorksheetDocument
            payload={payload}
            numero={numero}
            theme={theme}
            dateLabel={dateLabel}
            editedFields={editedFields}
          />
        </div>
      </div>

      <fieldset className="flex items-center gap-2 border-0 p-0">
        <legend className="sr-only">Page</legend>
        {([1, 2, 3] as const).map((n) => (
          <Button
            key={n}
            type="button"
            variant="outline"
            size="sm"
            aria-pressed={page === n}
            className={cn(page === n && "border-primary text-primary")}
            onClick={() => setPage(n)}
          >
            {n}
          </Button>
        ))}
      </fieldset>
    </div>
  );
}
