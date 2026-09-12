import type { Fiche, ImageRow, LexiqueEntry } from "./types";

/** Repository surfaces — methods arrive with later stories. */
export type FichesRepository = {
  // US-2.x+: create, getByNumero, updatePayload, list, …
  readonly _entity: Fiche;
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
