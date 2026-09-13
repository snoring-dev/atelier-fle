"use client";

import { useObject } from "@ai-sdk/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FicheEditor } from "@/components/fiche-editor";
import { SectionRegenBridge } from "@/components/section-regen-bridge";
import { Text } from "@/components/text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { FichePayload, FicheSection } from "@/lib/schemas";
import { ficheSchema } from "@/lib/schemas";

type FicheStreamProps = {
  numero: number;
  theme: string | null;
  category: string | null;
  status: "brouillon" | "validee";
  dateLabel: string;
  promptVersion: string | null;
  /** Parsed payload if already generated; null triggers auto-start. */
  initialPayload: FichePayload | null;
  /** Lexicon draw for reinjection / Révision check (US-7.1). */
  reviewWords?: readonly string[];
};

type SectionJob = {
  id: number;
  section: FicheSection;
  basePayload: FichePayload;
};

function parseInitial(
  payload: FichePayload | null,
): Partial<FichePayload> | undefined {
  return payload ?? undefined;
}

export function FicheStream({
  numero,
  theme,
  category,
  status,
  dateLabel,
  promptVersion,
  initialPayload,
  reviewWords = [],
}: FicheStreamProps) {
  const started = useRef(false);
  const hasInitial = initialPayload !== null;
  const [stablePayload, setStablePayload] = useState<FichePayload | null>(
    initialPayload,
  );
  const [sectionJob, setSectionJob] = useState<SectionJob | null>(null);
  const [sectionMerged, setSectionMerged] = useState<FichePayload | null>(null);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const sectionStopRef = useRef<(() => void) | null>(null);
  const jobIdRef = useRef(0);

  const { object, submit, isLoading, error, stop } = useObject({
    api: "/api/fiches/generate",
    schema: ficheSchema,
    initialValue: parseInitial(initialPayload),
  });

  useEffect(() => {
    if (hasInitial || started.current) return;
    started.current = true;
    submit({ numero });
  }, [hasInitial, numero, submit]);

  // Promote full-generate stream into the editor. Once a stable payload exists,
  // ignore the stale full-generate `object` (section regen must not be overwritten).
  useEffect(() => {
    if (sectionJob) return;
    if (stablePayload !== null && !isLoading) return;
    const result = ficheSchema.safeParse(object);
    if (result.success) {
      setStablePayload(result.data);
    }
  }, [object, sectionJob, isLoading, stablePayload]);

  const handleSectionMerged = useCallback((payload: FichePayload) => {
    setSectionMerged(payload);
  }, []);

  const handleSectionComplete = useCallback((payload: FichePayload) => {
    const result = ficheSchema.safeParse(payload);
    if (result.success) {
      setStablePayload(result.data);
    }
    setSectionJob(null);
    setSectionMerged(null);
    setSectionLoading(false);
  }, []);

  const handleSectionLoading = useCallback((loading: boolean) => {
    setSectionLoading(loading);
  }, []);

  const handleSectionError = useCallback((message: string | null) => {
    setSectionError(message);
    if (message) {
      setSectionJob(null);
      setSectionMerged(null);
      setSectionLoading(false);
    }
  }, []);

  const handleStopReady = useCallback((fn: (() => void) | null) => {
    sectionStopRef.current = fn;
  }, []);

  function handleRegenerateSection(
    section: FicheSection,
    currentPayload: FichePayload,
  ) {
    jobIdRef.current += 1;
    setSectionError(null);
    setSectionMerged(currentPayload);
    setSectionLoading(true);
    setSectionJob({
      id: jobIdRef.current,
      section,
      basePayload: currentPayload,
    });
  }

  const generating = isLoading || sectionLoading || sectionJob !== null;
  const displayPayload = sectionMerged ?? stablePayload;
  const showSkeleton = isLoading && !stablePayload;
  const activeError = sectionError ?? (error ? error.message : null);

  if (displayPayload) {
    return (
      <>
        {sectionJob ? (
          <SectionRegenBridge
            key={sectionJob.id}
            numero={numero}
            section={sectionJob.section}
            basePayload={sectionJob.basePayload}
            onMerged={handleSectionMerged}
            onComplete={handleSectionComplete}
            onLoadingChange={handleSectionLoading}
            onError={handleSectionError}
            onStopReady={handleStopReady}
          />
        ) : null}
        <FicheEditor
          numero={numero}
          status={status}
          dateLabel={dateLabel}
          promptVersion={promptVersion}
          initialPayload={displayPayload}
          isGenerating={generating}
          streamError={activeError}
          reviewWords={reviewWords}
          onStop={
            generating
              ? () => {
                  if (sectionJob) {
                    sectionStopRef.current?.();
                    setSectionJob(null);
                    setSectionMerged(null);
                    setSectionLoading(false);
                  } else {
                    stop();
                  }
                }
              : undefined
          }
          onRegenerateSection={handleRegenerateSection}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">Fiche n°{numero}</h1>
        <Badge variant={status === "validee" ? "default" : "secondary"}>
          {status === "validee" ? "Validée" : "Brouillon"}
        </Badge>
        {isLoading ? <Badge variant="outline">Génération…</Badge> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Text className="text-muted-foreground">
          {theme ?? "Sans thème"}
          {category ? ` · ${category}` : " · Thème libre"}
        </Text>
        {error ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              started.current = true;
              submit({ numero });
            }}
          >
            Réessayer
          </Button>
        ) : null}
        {isLoading ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => stop()}
          >
            Arrêter
          </Button>
        ) : null}
      </div>

      {error ? (
        <p className="text-[14px] text-destructive" role="alert">
          La génération a échoué. {error.message}
        </p>
      ) : null}

      {showSkeleton ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : null}
    </div>
  );
}
