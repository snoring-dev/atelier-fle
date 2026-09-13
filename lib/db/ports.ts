import type { FichePayload } from "@/lib/schemas";
import type { Fiche, ImageRow, LexiqueEntry } from "./types";

export type CreateFicheInput = {
  theme: string;
  category: string | null;
};

export type SaveDraftInput = {
  numero: number;
  payload: string;
  promptVersion: string;
};

/** Repository surfaces — methods arrive with later stories. */
export type FichesRepository = {
  create(input: CreateFicheInput): Promise<Fiche>;
  getByNumero(numero: number): Promise<Fiche | null>;
  listRecent(limit: number): Promise<Fiche[]>;
  saveDraft(input: SaveDraftInput): Promise<Fiche>;
  /** Mark brouillon as validee; no-op if already validated. */
  validate(numero: number): Promise<Fiche>;
  /** Persist lexicon draw for this fiche (set once; leave untouched by saveDraft). */
  setReviewWords(numero: number, words: readonly string[]): Promise<Fiche>;
};

export type LexiqueRepository = {
  /** All lexicon entries, alphabetical by mot. */
  list(): Promise<LexiqueEntry[]>;
  /**
   * Draw up to `limit` words for reinjection.
   * P1: en cours last seen > 7 days (oldest first).
   * P2: nouveau with occurrences === 1 (oldest first).
   * Never exclu / acquis.
   */
  draw(limit?: number): Promise<string[]>;
  /**
   * On validation: upsert vocabulary terms that appear in the text,
   * and bump any existing non-exclu/non-acquis lexicon mots found in the text.
   */
  recordFromPayload(payload: FichePayload): Promise<void>;
  /** Update definition/exemple only; null if id missing. */
  updateContent(
    id: number,
    input: { definition: string | null; exemple: string | null },
  ): Promise<LexiqueEntry | null>;
  /** Set statut to exclu; null if id missing. Leaves occurrences/lastSeenAt. */
  exclude(id: number): Promise<LexiqueEntry | null>;
};

export type ImagesRepository = {
  createMany(numero: number, paths: readonly string[]): Promise<ImageRow[]>;
  listByFiche(numero: number): Promise<ImageRow[]>;
  getById(numero: number, imageId: number): Promise<ImageRow | null>;
  getRetenue(numero: number): Promise<ImageRow | null>;
  /** Transactionally set exactly one image to retenue for this fiche. */
  markRetenue(numero: number, imageId: number): Promise<ImageRow>;
  /** Delete rows for a fiche and return them (caller unlinks files). */
  deleteByFiche(numero: number): Promise<ImageRow[]>;
};

export type Database = {
  migrate(): Promise<void>;
  ping(): Promise<boolean>;
  close(): Promise<void>;
  fiches: FichesRepository;
  lexique: LexiqueRepository;
  images: ImagesRepository;
};

export type DatabaseProvider = "sqlite";
