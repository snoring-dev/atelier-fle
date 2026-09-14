"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { duplicateFicheAction } from "@/app/(app)/archive/actions";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { microsToUsd } from "@/lib/ai/cost";
import type { FicheStatus } from "@/lib/db";
import { cn } from "@/lib/utils";

type FilterStatus = "tous" | FicheStatus;

const STATUS_FILTERS: { value: FilterStatus; label: string }[] = [
  { value: "tous", label: "Tous" },
  { value: "brouillon", label: "Brouillon" },
  { value: "validee", label: "Validée" },
];

const THEME_ALL = "__tous__";

const usdFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

export type ArchiveRow = {
  numero: number;
  status: FicheStatus;
  theme: string | null;
  title: string;
  dateLabel: string;
  hasPayload: boolean;
  textCostMicros: number;
  imageCostMicros: number;
};

function statusLabel(status: FicheStatus): string {
  return status === "validee" ? "Validée" : "Brouillon";
}

function formatUsd(micros: number): string {
  return usdFormatter.format(microsToUsd(micros));
}

function CostCell({
  textCostMicros,
  imageCostMicros,
}: {
  textCostMicros: number;
  imageCostMicros: number;
}) {
  const text = Number.isFinite(textCostMicros) ? textCostMicros : 0;
  const images = Number.isFinite(imageCostMicros) ? imageCostMicros : 0;
  const total = text + images;
  if (total <= 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className="tabular-nums font-medium">{formatUsd(total)}</span>
      <span className="text-xs text-muted-foreground tabular-nums">
        texte {formatUsd(text)} · images {formatUsd(images)}
      </span>
    </div>
  );
}

type ArchiveScreenProps = {
  fiches: ArchiveRow[];
};

export function ArchiveScreen({ fiches }: ArchiveScreenProps) {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("tous");
  const [themeFilter, setThemeFilter] = useState(THEME_ALL);
  const [pending, startTransition] = useTransition();
  const [exportingNumero, setExportingNumero] = useState<number | null>(null);

  const themes = useMemo(() => {
    const set = new Set<string>();
    for (const f of fiches) {
      if (f.theme) set.add(f.theme);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "fr"));
  }, [fiches]);

  const filtered = useMemo(() => {
    return fiches.filter((f) => {
      if (statusFilter !== "tous" && f.status !== statusFilter) return false;
      if (themeFilter !== THEME_ALL && f.theme !== themeFilter) return false;
      return true;
    });
  }, [fiches, statusFilter, themeFilter]);

  const filteredCostTotal = useMemo(() => {
    return filtered.reduce((sum, f) => {
      const text = Number.isFinite(f.textCostMicros) ? f.textCostMicros : 0;
      const images = Number.isFinite(f.imageCostMicros) ? f.imageCostMicros : 0;
      return sum + text + images;
    }, 0);
  }, [filtered]);

  function handleDuplicate(numero: number) {
    startTransition(async () => {
      const result = await duplicateFicheAction({ numero });
      // redirect() throws; only errors return a result
      if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  async function handlePdf(numero: number) {
    setExportingNumero(numero);
    try {
      const res = await fetch(`/api/fiches/${numero}/pdf`);
      if (!res.ok) {
        const message = await res.text().catch(() => "");
        throw new Error(message || `Export impossible (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fiche-${numero}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Export PDF impossible");
    } finally {
      setExportingNumero(null);
    }
  }

  const isEmptyTable = fiches.length === 0;
  const noMatches = !isEmptyTable && filtered.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Heading level={1}>Archive</Heading>
        <Text className="mt-1 text-muted-foreground">
          Retrouvez vos fiches, téléchargez un PDF ou dupliquez pour repartir
          d&apos;un brouillon.
        </Text>
      </div>

      {!isEmptyTable ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <fieldset className="flex flex-wrap gap-1.5 border-0 p-0">
            <legend className="sr-only">Filtrer par statut</legend>
            {STATUS_FILTERS.map((item) => (
              <Button
                key={item.value}
                type="button"
                size="sm"
                variant={statusFilter === item.value ? "default" : "outline"}
                onClick={() => setStatusFilter(item.value)}
                aria-pressed={statusFilter === item.value}
              >
                {item.label}
              </Button>
            ))}
          </fieldset>

          <div className="flex items-center gap-2">
            <label htmlFor="archive-theme" className="sr-only">
              Filtrer par thème
            </label>
            <select
              id="archive-theme"
              className="h-8 min-w-48 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={themeFilter}
              onChange={(e) => setThemeFilter(e.target.value)}
              aria-label="Filtrer par thème"
            >
              <option value={THEME_ALL}>Tous les thèmes</option>
              {themes.map((theme) => (
                <option key={theme} value={theme}>
                  {theme}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {isEmptyTable ? (
        <Text className="text-muted-foreground">
          Aucune fiche pour l&apos;instant. Créez une séance depuis
          l&apos;accueil.
        </Text>
      ) : null}

      {noMatches ? (
        <Text className="text-muted-foreground">
          Aucune fiche ne correspond aux filtres.
        </Text>
      ) : null}

      {!isEmptyTable && filtered.length > 0 ? (
        <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
          <table className="w-full min-w-160 border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-3 py-2 font-medium">N°</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Thème</th>
                <th className="px-3 py-2 font-medium">Titre</th>
                <th className="px-3 py-2 font-medium">Statut</th>
                <th className="px-3 py-2 font-medium">Coût</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((fiche) => (
                <tr key={fiche.numero} className="border-b last:border-b-0">
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">
                    {fiche.numero}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {fiche.dateLabel}
                  </td>
                  <td className="px-3 py-2">{fiche.theme ?? "—"}</td>
                  <td className="max-w-[16rem] px-3 py-2 font-medium">
                    {fiche.title}
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant={
                        fiche.status === "validee" ? "default" : "secondary"
                      }
                    >
                      {statusLabel(fiche.status)}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <CostCell
                      textCostMicros={fiche.textCostMicros}
                      imageCostMicros={fiche.imageCostMicros}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      <Link
                        href={`/fiches/${fiche.numero}`}
                        className={cn(
                          buttonVariants({ size: "xs", variant: "outline" }),
                        )}
                      >
                        Voir
                      </Link>
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        disabled={pending}
                        onClick={() => handleDuplicate(fiche.numero)}
                      >
                        Dupliquer
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        disabled={
                          !fiche.hasPayload || exportingNumero === fiche.numero
                        }
                        onClick={() => void handlePdf(fiche.numero)}
                      >
                        {exportingNumero === fiche.numero ? "PDF…" : "PDF"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/30">
                <td
                  colSpan={5}
                  className="px-3 py-2 text-right font-medium text-muted-foreground"
                >
                  Total (filtre)
                </td>
                <td className="px-3 py-2 tabular-nums font-medium">
                  {filteredCostTotal > 0 ? formatUsd(filteredCostTotal) : "—"}
                </td>
                <td className="px-3 py-2" />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : null}
    </div>
  );
}
