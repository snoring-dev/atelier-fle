"use client";

import { useObject } from "@ai-sdk/react";
import { useEffect, useRef } from "react";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { FichePayload } from "@/lib/schemas";
import { ficheSchema } from "@/lib/schemas";

type FicheStreamProps = {
  numero: number;
  theme: string | null;
  category: string | null;
  status: "brouillon" | "validee";
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
  initialPayload,
}: FicheStreamProps) {
  const started = useRef(false);
  const hasInitial = initialPayload !== null;

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

  const display = object;
  const showSkeleton = isLoading && !display?.text && !display?.title;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Heading level={1}>Fiche n°{numero}</Heading>
        <Badge variant={status === "validee" ? "default" : "secondary"}>
          {status === "validee" ? "Validée" : "Brouillon"}
        </Badge>
        {isLoading ? <Badge variant="outline">Génération…</Badge> : null}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
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
        <p className="mb-4 text-sm text-destructive" role="alert">
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

      {display ? (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{display.title ?? "…"}</CardTitle>
              <CardDescription>
                {display.theme ?? theme}
                {display.category || category
                  ? ` · ${display.category ?? category}`
                  : null}
              </CardDescription>
            </CardHeader>
            {display.illustration?.description ? (
              <CardContent>
                <Text className="text-sm text-muted-foreground italic">
                  Illustration : {display.illustration.description}
                </Text>
              </CardContent>
            ) : null}
          </Card>

          {display.text ? (
            <Card>
              <CardHeader>
                <CardTitle>Texte</CardTitle>
              </CardHeader>
              <CardContent>
                <Text className="whitespace-pre-wrap leading-relaxed">
                  {display.text}
                </Text>
              </CardContent>
            </Card>
          ) : null}

          {display.vocabulary && display.vocabulary.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Vocabulaire</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-3">
                  {display.vocabulary.map((item) =>
                    item?.term ? (
                      <li key={item.term}>
                        <Text>
                          <span className="font-semibold">{item.term}</span>
                          {item.definition ? <> : {item.definition}</> : null}
                          {item.example ? (
                            <span className="italic text-muted-foreground">
                              {" "}
                              → {item.example}
                            </span>
                          ) : null}
                        </Text>
                      </li>
                    ) : null,
                  )}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {display.questions && display.questions.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Compréhension</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="flex list-decimal flex-col gap-4 pl-5">
                  {display.questions.map((q) =>
                    q?.prompt ? (
                      <li key={`${q.type ?? "q"}-${q.prompt.slice(0, 40)}`}>
                        <Text>
                          {q.type ? (
                            <Badge variant="outline" className="mr-2">
                              {q.type}
                            </Badge>
                          ) : null}
                          {q.prompt}
                        </Text>
                        {q.answer ? (
                          <Text className="mt-1 text-sm text-muted-foreground">
                            Réponse : {q.answer}
                          </Text>
                        ) : null}
                        {q.hints && q.hints.length > 0 ? (
                          <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
                            {q.hints.map((h) =>
                              h ? <li key={h}>{h}</li> : null,
                            )}
                          </ul>
                        ) : null}
                      </li>
                    ) : null,
                  )}
                </ol>
              </CardContent>
            </Card>
          ) : null}

          {display.ordering?.sentences &&
          display.ordering.sentences.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Remise en ordre</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <ul className="flex flex-col gap-2">
                  {display.ordering.sentences.map((s) =>
                    s?.label ? (
                      <li key={s.label}>
                        <Text>
                          <span className="font-semibold">{s.label}.</span>{" "}
                          {s.text ?? "…"}
                          {typeof s.position === "number" ? (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (pos. {s.position})
                            </span>
                          ) : null}
                        </Text>
                      </li>
                    ) : null,
                  )}
                </ul>
                {display.ordering.rationale ? (
                  <Text className="text-sm text-muted-foreground">
                    <span className="font-medium">Pourquoi cet ordre ?</span>{" "}
                    {display.ordering.rationale}
                  </Text>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
