"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CheckResult } from "@/lib/checks";
import { cn } from "@/lib/utils";

type CheckBannerProps = {
  checks: readonly CheckResult[];
};

const STATUS_CLASS: Record<CheckResult["status"], string> = {
  ok: "bg-emerald-700 text-white hover:bg-emerald-700",
  warn: "bg-amber-500 text-white hover:bg-amber-500 cursor-help",
  neutral: "bg-muted text-muted-foreground hover:bg-muted",
};

function CheckPill({ check }: { check: CheckResult }) {
  const className = cn("border-transparent", STATUS_CLASS[check.status]);

  if (check.status !== "warn" || !check.detail) {
    return (
      <Badge variant="outline" className={className}>
        {check.label}
      </Badge>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(
          "inline-flex h-5 w-fit shrink-0 items-center justify-center rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          STATUS_CLASS.warn,
        )}
        aria-label={check.detail}
      >
        {check.label}
      </TooltipTrigger>
      <TooltipContent>{check.detail}</TooltipContent>
    </Tooltip>
  );
}

export function CheckBanner({ checks }: CheckBannerProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="status"
      aria-label="Contrôles de la fiche"
    >
      {checks.map((check) => (
        <CheckPill key={check.id} check={check} />
      ))}
    </div>
  );
}
