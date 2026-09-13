"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { saveFicheDraft } from "@/app/(app)/actions";
import { WorksheetPreview } from "@/components/print/worksheet-preview";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FichePayload, FicheSection } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const POSITIONS = [1, 2, 3, 4, 5, 6] as const;
const SAVE_IDLE_MS = 800;

type FicheEditorProps = {
  numero: number;
  status: "brouillon" | "validee";
  dateLabel: string;
  promptVersion: string | null;
  initialPayload: FichePayload;
  isGenerating: boolean;
  streamError?: string | null;
  onStop?: () => void;
  onRegenerateSection: (
    section: FicheSection,
    currentPayload: FichePayload,
  ) => void;
};

function duplicatePositions(payload: FichePayload): Set<number> {
  const counts = new Map<number, number>();
  for (const s of payload.ordering.sentences) {
    counts.set(s.position, (counts.get(s.position) ?? 0) + 1);
  }
  const dupes = new Set<number>();
  for (const [pos, count] of counts) {
    if (count > 1) dupes.add(pos);
  }
  return dupes;
}

export function FicheEditor({
  numero,
  status,
  dateLabel,
  promptVersion,
  initialPayload,
  isGenerating,
  streamError,
  onStop,
  onRegenerateSection,
}: FicheEditorProps) {
  const router = useRouter();
  const [payload, setPayload] = useState<FichePayload>(initialPayload);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  /** Only hand edits may autosave — never stream/sync snapshots. */
  const dirtyRef = useRef(false);
  const promptVersionRef = useRef(promptVersion);

  // Sync when a regenerate finishes with a new valid payload.
  useEffect(() => {
    setPayload(initialPayload);
    dirtyRef.current = false;
  }, [initialPayload]);

  useEffect(() => {
    promptVersionRef.current = promptVersion;
  }, [promptVersion]);

  const dupes = useMemo(() => duplicatePositions(payload), [payload]);
  const fieldsDisabled = isGenerating || status === "validee";
  const canExport =
    !isGenerating && !exporting && Boolean(payload.title && payload.text);

  useEffect(() => {
    if (isGenerating || status === "validee") return;
    if (!dirtyRef.current) return;

    const timer = window.setTimeout(() => {
      void (async () => {
        const result = await saveFicheDraft({
          numero,
          payload,
          promptVersion: promptVersionRef.current,
        });
        if (result.error) {
          setSaveError(result.error);
        } else {
          setSaveError(null);
          dirtyRef.current = false;
        }
      })();
    }, SAVE_IDLE_MS);

    return () => window.clearTimeout(timer);
  }, [payload, numero, isGenerating, status]);

  async function handleExport() {
    setExportError(null);
    setExporting(true);
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
      router.refresh();
    } catch (err: unknown) {
      setExportError(
        err instanceof Error ? err.message : "Export PDF impossible",
      );
    } finally {
      setExporting(false);
    }
  }

  function patch(updater: (prev: FichePayload) => FichePayload) {
    dirtyRef.current = true;
    setPayload((prev) => updater(prev));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">Fiche n°{numero}</h1>
        <Badge variant={status === "validee" ? "default" : "secondary"}>
          {status === "validee" ? "Validée" : "Brouillon"}
        </Badge>
        {isGenerating ? <Badge variant="outline">Génération…</Badge> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          disabled={isGenerating || status === "validee"}
          onClick={() => onRegenerateSection("text", payload)}
        >
          Régénérer le texte
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isGenerating || status === "validee"}
          onClick={() => onRegenerateSection("questions", payload)}
        >
          Régénérer les questions
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isGenerating || status === "validee"}
          onClick={() => onRegenerateSection("ordering", payload)}
        >
          Régénérer l&apos;ordre
        </Button>
        <Button type="button" disabled>
          Générer l&apos;illustration
        </Button>
        <Button
          type="button"
          disabled={!canExport}
          onClick={() => void handleExport()}
        >
          {exporting ? "Export en cours…" : "Valider et exporter"}
        </Button>
        <a
          className={cn(buttonVariants({ variant: "outline" }))}
          href={`/api/fiches/${numero}/impression`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Imprimer depuis le navigateur
        </a>
        {isGenerating && onStop ? (
          <Button type="button" variant="ghost" size="sm" onClick={onStop}>
            Arrêter
          </Button>
        ) : null}
      </div>

      {streamError ? (
        <p className="text-[14px] text-destructive" role="alert">
          La régénération a échoué. {streamError}
        </p>
      ) : null}
      {exportError ? (
        <p className="text-[14px] text-destructive" role="alert">
          {exportError}
        </p>
      ) : null}
      {saveError ? (
        <p className="text-[14px] text-destructive" role="alert">
          {saveError}
        </p>
      ) : null}

      {/* Mobile / tablet: desktop-only gate */}
      <p className="text-[14px] text-muted-foreground lg:hidden">
        Ouvrez cette page sur un ordinateur pour éditer la fiche.
      </p>

      <div className="hidden grid-cols-[3fr_2fr] gap-6 lg:grid">
        <div className="min-w-0">
          <Accordion multiple defaultValue={["metadata"]}>
            <AccordionItem value="metadata">
              <AccordionTrigger>Métadonnées</AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">Titre</span>
                    <Input
                      value={payload.title}
                      disabled={fieldsDisabled}
                      onChange={(e) =>
                        patch((p) => ({ ...p, title: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">Thème</span>
                    <Input
                      value={payload.theme}
                      disabled={fieldsDisabled}
                      onChange={(e) =>
                        patch((p) => ({ ...p, theme: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">Catégorie</span>
                    <Input
                      value={payload.category}
                      disabled={fieldsDisabled}
                      onChange={(e) =>
                        patch((p) => ({ ...p, category: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">
                      Description d&apos;illustration
                    </span>
                    <Textarea
                      value={payload.illustration.description}
                      disabled={fieldsDisabled}
                      onChange={(e) =>
                        patch((p) => ({
                          ...p,
                          illustration: { description: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="text">
              <AccordionTrigger>Texte</AccordionTrigger>
              <AccordionContent>
                <Textarea
                  className="min-h-40"
                  value={payload.text}
                  disabled={fieldsDisabled}
                  onChange={(e) =>
                    patch((p) => ({ ...p, text: e.target.value }))
                  }
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="vocab">
              <AccordionTrigger>Vocabulaire</AccordionTrigger>
              <AccordionContent>
                <ul className="flex flex-col gap-4">
                  {payload.vocabulary.map((item, index) => (
                    <li
                      // biome-ignore lint/suspicious/noArrayIndexKey: fixed 6 vocab slots
                      key={index}
                      className="flex flex-col gap-2 border-b border-border pb-3 last:border-0"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">Mot</span>
                        <Input
                          value={item.term}
                          disabled={fieldsDisabled}
                          onChange={(e) =>
                            patch((p) => {
                              const vocabulary = [...p.vocabulary];
                              vocabulary[index] = {
                                ...vocabulary[index],
                                term: e.target.value,
                              };
                              return { ...p, vocabulary };
                            })
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">Définition</span>
                        <Input
                          value={item.definition}
                          disabled={fieldsDisabled}
                          onChange={(e) =>
                            patch((p) => {
                              const vocabulary = [...p.vocabulary];
                              vocabulary[index] = {
                                ...vocabulary[index],
                                definition: e.target.value,
                              };
                              return { ...p, vocabulary };
                            })
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">Exemple</span>
                        <Input
                          value={item.example}
                          disabled={fieldsDisabled}
                          onChange={(e) =>
                            patch((p) => {
                              const vocabulary = [...p.vocabulary];
                              vocabulary[index] = {
                                ...vocabulary[index],
                                example: e.target.value,
                              };
                              return { ...p, vocabulary };
                            })
                          }
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="questions">
              <AccordionTrigger>Questions</AccordionTrigger>
              <AccordionContent>
                <ol className="flex flex-col gap-4">
                  {payload.questions.map((q, index) => (
                    <li
                      // biome-ignore lint/suspicious/noArrayIndexKey: fixed 6 question slots
                      key={index}
                      className="flex flex-col gap-2 border-b border-border pb-3 last:border-0"
                    >
                      <Badge variant="outline" className="w-fit">
                        {q.type}
                      </Badge>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">Énoncé</span>
                        <Textarea
                          value={q.prompt}
                          disabled={fieldsDisabled}
                          onChange={(e) =>
                            patch((p) => {
                              const questions = [...p.questions];
                              questions[index] = {
                                ...questions[index],
                                prompt: e.target.value,
                              };
                              return { ...p, questions };
                            })
                          }
                        />
                      </div>
                      {q.type === "opinion" ? (
                        <div className="flex flex-col gap-2">
                          <span className="font-medium">Pistes</span>
                          {q.hints.map((hint, hi) => (
                            <Input
                              // biome-ignore lint/suspicious/noArrayIndexKey: hint slot within fixed question
                              key={hi}
                              value={hint}
                              disabled={fieldsDisabled}
                              aria-label={`Piste ${hi + 1}`}
                              onChange={(e) =>
                                patch((p) => {
                                  const questions = [...p.questions];
                                  const hints = [...questions[index].hints];
                                  hints[hi] = e.target.value;
                                  questions[index] = {
                                    ...questions[index],
                                    hints,
                                  };
                                  return { ...p, questions };
                                })
                              }
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">Réponse</span>
                          <Textarea
                            value={q.answer}
                            disabled={fieldsDisabled}
                            onChange={(e) =>
                              patch((p) => {
                                const questions = [...p.questions];
                                questions[index] = {
                                  ...questions[index],
                                  answer: e.target.value,
                                };
                                return { ...p, questions };
                              })
                            }
                          />
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="ordering">
              <AccordionTrigger>Remise en ordre</AccordionTrigger>
              <AccordionContent>
                <ul className="flex flex-col gap-4">
                  {payload.ordering.sentences.map((s, index) => {
                    const isDupe = dupes.has(s.position);
                    return (
                      <li
                        key={s.label}
                        className="flex flex-col gap-2 border-b border-border pb-3 last:border-0"
                      >
                        <span className="font-medium">{s.label}.</span>
                        <Textarea
                          value={s.text}
                          disabled={fieldsDisabled}
                          onChange={(e) =>
                            patch((p) => {
                              const sentences = [...p.ordering.sentences];
                              sentences[index] = {
                                ...sentences[index],
                                text: e.target.value,
                              };
                              return {
                                ...p,
                                ordering: { ...p.ordering, sentences },
                              };
                            })
                          }
                        />
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">Position</span>
                          <select
                            className="h-7 w-fit rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
                            value={s.position}
                            disabled={fieldsDisabled}
                            aria-invalid={isDupe || undefined}
                            onChange={(e) => {
                              const next = Number(e.target.value);
                              if (!Number.isFinite(next)) return;
                              patch((p) => {
                                const sentences = [...p.ordering.sentences];
                                sentences[index] = {
                                  ...sentences[index],
                                  position: next,
                                };
                                return {
                                  ...p,
                                  ordering: { ...p.ordering, sentences },
                                };
                              });
                            }}
                          >
                            {POSITIONS.map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                          {isDupe ? (
                            <p
                              className="text-[14px] text-destructive"
                              role="alert"
                            >
                              Position en double
                            </p>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-4 flex flex-col gap-1">
                  <span className="font-medium">Pourquoi cet ordre ?</span>
                  <Textarea
                    value={payload.ordering.rationale}
                    disabled={fieldsDisabled}
                    onChange={(e) =>
                      patch((p) => ({
                        ...p,
                        ordering: {
                          ...p.ordering,
                          rationale: e.target.value,
                        },
                      }))
                    }
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="min-w-0">
          <WorksheetPreview
            payload={payload}
            numero={numero}
            theme={payload.theme}
            dateLabel={dateLabel}
          />
        </div>
      </div>
    </div>
  );
}
