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
};

export type LexiqueRepository = {
  // US-7.x+: list, upsert, exclude, draw, …
  readonly _entity: LexiqueEntry;
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
