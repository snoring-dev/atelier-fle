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
};

export type LexiqueRepository = {
  // US-7.x+: list, upsert, exclude, draw, …
  readonly _entity: LexiqueEntry;
};

export type ImagesRepository = {
  // US-6.1+: createMany, markRetenue, listByFiche, …
  readonly _entity: ImageRow;
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
