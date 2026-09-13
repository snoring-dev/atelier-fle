"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  excludeLexiqueEntry,
  updateLexiqueContent,
} from "@/app/(app)/lexique/actions";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { LexiqueEntry, LexiqueStatut } from "@/lib/db";
import { cn } from "@/lib/utils";

type FilterStatut = "tous" | "nouveau" | "en cours" | "acquis";

const FILTERS: { value: FilterStatut; label: string }[] = [
  { value: "tous", label: "Tous" },
  { value: "nouveau", label: "Nouveau" },
  { value: "en cours", label: "En cours" },
  { value: "acquis", label: "Acquis" },
];

function statutBadgeVariant(
  statut: LexiqueStatut,
): "default" | "secondary" | "outline" | "destructive" {
  switch (statut) {
    case "nouveau":
      return "default";
    case "en cours":
      return "secondary";
    case "acquis":
      return "outline";
    case "exclu":
      return "destructive";
  }
}

function truncate(value: string | null, max = 80): string {
  if (!value) return "—";
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

type LexiqueScreenProps = {
  entries: LexiqueEntry[];
};

export function LexiqueScreen({ entries }: LexiqueScreenProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterStatut>("tous");
  const [editing, setEditing] = useState<LexiqueEntry | null>(null);
  const [definition, setDefinition] = useState("");
  const [exemple, setExemple] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (filter !== "tous" && entry.statut !== filter) return false;
      if (!q) return true;
      const inMot = entry.mot.toLowerCase().includes(q);
      const inDef = (entry.definition ?? "").toLowerCase().includes(q);
      return inMot || inDef;
    });
  }, [entries, filter, query]);

  function openEdit(entry: LexiqueEntry) {
    setEditing(entry);
    setDefinition(entry.definition ?? "");
    setExemple(entry.exemple ?? "");
  }

  function handleSave() {
    if (!editing) return;
    const id = editing.id;
    startTransition(async () => {
      const result = await updateLexiqueContent({
        id,
        definition,
        exemple,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Mot mis à jour");
      setEditing(null);
    });
  }

  function handleExclude(entry: LexiqueEntry) {
    startTransition(async () => {
      const result = await excludeLexiqueEntry({ id: entry.id });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`« ${entry.mot} » exclu du tirage`);
    });
  }

  const isEmptyTable = entries.length === 0;
  const noMatches = !isEmptyTable && filtered.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Heading level={1}>Lexique</Heading>
        <Text className="mt-1 text-muted-foreground">
          Mots issus des fiches validées — excluez ceux qui ne conviennent pas
          au tirage.
        </Text>
      </div>

      {!isEmptyTable ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            type="search"
            placeholder="Rechercher un mot ou une définition…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-sm"
            aria-label="Rechercher dans le lexique"
          />
          <fieldset className="flex flex-wrap gap-1.5 border-0 p-0">
            <legend className="sr-only">Filtrer par statut</legend>
            {FILTERS.map((item) => (
              <Button
                key={item.value}
                type="button"
                size="sm"
                variant={filter === item.value ? "default" : "outline"}
                onClick={() => setFilter(item.value)}
                aria-pressed={filter === item.value}
              >
                {item.label}
              </Button>
            ))}
          </fieldset>
        </div>
      ) : null}

      {isEmptyTable ? (
        <Text className="text-muted-foreground">
          Aucun mot pour l&apos;instant. Le lexique se remplit à chaque fiche
          validée.
        </Text>
      ) : null}

      {noMatches ? (
        <Text className="text-muted-foreground">Aucun mot ne correspond.</Text>
      ) : null}

      {!isEmptyTable && filtered.length > 0 ? (
        <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-3 py-2 font-medium">Mot</th>
                <th className="px-3 py-2 font-medium">Définition</th>
                <th className="px-3 py-2 font-medium">Exemple</th>
                <th className="px-3 py-2 font-medium">Statut</th>
                <th className="px-3 py-2 font-medium text-right">Occ.</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr
                  key={entry.id}
                  className={cn(
                    "border-b last:border-b-0",
                    entry.statut === "exclu" &&
                      "bg-muted/30 text-muted-foreground",
                  )}
                >
                  <td className="px-3 py-2 font-medium text-foreground">
                    {entry.mot}
                  </td>
                  <td className="max-w-[14rem] px-3 py-2">
                    {truncate(entry.definition)}
                  </td>
                  <td className="max-w-[14rem] px-3 py-2">
                    {truncate(entry.exemple)}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={statutBadgeVariant(entry.statut)}>
                      {entry.statut}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {entry.occurrences}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        disabled={pending}
                        onClick={() => openEdit(entry)}
                      >
                        Modifier
                      </Button>
                      {entry.statut !== "exclu" ? (
                        <Button
                          type="button"
                          size="xs"
                          variant="destructive"
                          disabled={pending}
                          onClick={() => handleExclude(entry)}
                        >
                          Exclure
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier « {editing?.mot} »</DialogTitle>
            <DialogDescription>
              Corrigez la définition ou l&apos;exemple. Le statut et le compteur
              ne changent pas.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="lexique-definition"
                className="text-xs font-medium"
              >
                Définition
              </label>
              <Textarea
                id="lexique-definition"
                value={definition}
                onChange={(e) => setDefinition(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="lexique-exemple" className="text-xs font-medium">
                Exemple
              </label>
              <Textarea
                id="lexique-exemple"
                value={exemple}
                onChange={(e) => setExemple(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setEditing(null)}
            >
              Annuler
            </Button>
            <Button type="button" disabled={pending} onClick={handleSave}>
              {pending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
