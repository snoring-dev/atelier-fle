"use client";

import { useObject } from "@ai-sdk/react";
import { useEffect, useRef } from "react";
import {
  type FichePayload,
  type FicheSection,
  sectionSchemaFor,
} from "@/lib/schemas";
import {
  mergeSectionPartial,
  type SectionPartial,
} from "@/lib/schemas/merge-section";

type SectionRegenBridgeProps = {
  numero: number;
  section: FicheSection;
  basePayload: FichePayload;
  onMerged: (payload: FichePayload) => void;
  onComplete: (payload: FichePayload) => void;
  onLoadingChange: (loading: boolean) => void;
  onError: (message: string | null) => void;
  onStopReady: (stop: (() => void) | null) => void;
};

/**
 * One-shot keyed bridge: mounts, submits section regen, streams partials
 * into the parent via onMerged. Remount (new key) to start another run.
 */
export function SectionRegenBridge({
  numero,
  section,
  basePayload,
  onMerged,
  onComplete,
  onLoadingChange,
  onError,
  onStopReady,
}: SectionRegenBridgeProps) {
  const started = useRef(false);
  const completed = useRef(false);
  const wasLoading = useRef(false);
  const baseRef = useRef(basePayload);
  baseRef.current = basePayload;
  const schema = sectionSchemaFor(section);

  const { object, submit, isLoading, error, stop } = useObject({
    api: `/api/fiches/${numero}/section`,
    schema,
  });

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    submit({ section, payload: basePayload });
  }, [section, basePayload, submit]);

  useEffect(() => {
    onMerged(
      mergeSectionPartial(basePayload, section, object as SectionPartial),
    );
  }, [object, basePayload, section, onMerged]);

  useEffect(() => {
    onLoadingChange(isLoading);
  }, [isLoading, onLoadingChange]);

  useEffect(() => {
    onError(error ? error.message : null);
  }, [error, onError]);

  // Complete when the stream ends with an object (more reliable than onFinish).
  useEffect(() => {
    if (completed.current) return;
    if (isLoading) {
      wasLoading.current = true;
      return;
    }
    if (wasLoading.current && object) {
      completed.current = true;
      wasLoading.current = false;
      // Same overlay as the server `after()` path — not the streaming merge.
      onComplete({
        ...baseRef.current,
        ...(object as Partial<FichePayload>),
      });
    }
  }, [isLoading, object, onComplete]);

  useEffect(() => {
    onStopReady(() => stop());
    return () => onStopReady(null);
  }, [stop, onStopReady]);

  return null;
}
