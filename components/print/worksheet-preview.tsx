"use client";

import { useState } from "react";
import { WorksheetDocument } from "@/components/print/worksheet-document";
import { Button } from "@/components/ui/button";
import type { FichePayload } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const SCALE = 0.62;
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;

type WorksheetPreviewProps = {
  payload: FichePayload;
  numero: number;
  theme: string | null;
  dateLabel: string;
  editedFields?: ReadonlySet<string>;
};

export function WorksheetPreview({
  payload,
  numero,
  theme,
  dateLabel,
  editedFields,
}: WorksheetPreviewProps) {
  const [page, setPage] = useState<1 | 2 | 3>(1);

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
          className="origin-top-left"
          style={{
            width: `${PAGE_WIDTH_MM}mm`,
            transform: `scale(${SCALE})`,
          }}
          // Hide non-selected pages via data-page attribute on WorksheetDocument articles
          data-preview-page={page}
        >
          <style>{`
            [data-preview-page="${page}"] [data-page]:not([data-page="${page}"]) {
              display: none;
            }
            [data-preview-page="${page}"] [data-page="${page}"] {
              margin: 0;
              min-height: ${PAGE_HEIGHT_MM}mm;
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
