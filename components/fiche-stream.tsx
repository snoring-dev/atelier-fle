"use client";

import { useObject } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { FicheEditor } from "@/components/fiche-editor";
import { Text } from "@/components/text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { FichePayload } from "@/lib/schemas";
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
}: FicheStreamProps) {
  const started = useRef(false);
  const hasInitial = initialPayload !== null;
  const [stablePayload, setStablePayload] = useState<FichePayload | null>(
    initialPayload,
  );

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

  // Only promote complete, schema-valid objects into the editor.
  useEffect(() => {
    const result = ficheSchema.safeParse(object);
    if (result.success) {
      setStablePayload(result.data);
    }
  }, [object]);

  const showSkeleton = isLoading && !stablePayload;

  function handleRegenerate() {
    started.current = true;
    submit({ numero });
  }

  if (stablePayload) {
    return (
      <FicheEditor
        numero={numero}
        status={status}
        dateLabel={dateLabel}
        promptVersion={promptVersion}
        initialPayload={stablePayload}
        isGenerating={isLoading}
        onRegenerate={handleRegenerate}
      />
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
