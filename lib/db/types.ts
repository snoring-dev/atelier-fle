export type FicheStatus = "brouillon" | "validee";

export type LexiqueStatut = "nouveau" | "en cours" | "acquis" | "exclu";

export type Fiche = {
  numero: number;
  status: FicheStatus;
  payload: string | null;
  theme: string | null;
  category: string | null;
  promptVersion: string | null;
  validatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type LexiqueEntry = {
  id: number;
  mot: string;
  definition: string | null;
  exemple: string | null;
  statut: LexiqueStatut;
  occurrences: number;
  lastSeenAt: Date | null;
};

export type ImageRow = {
  id: number;
  ficheNumero: number;
  path: string;
  retenue: boolean;
};
