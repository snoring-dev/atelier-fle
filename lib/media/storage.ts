import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const PATH_RE = /^\d+\/[\w-]+\.png$/;

function mediaDir(): string {
  const raw =
    process.env.MEDIA_DIR ?? path.join(process.cwd(), "data", "media");
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
}

/**
 * Persist an illustration PNG under MEDIA_DIR/<numero>/<uuid>.png.
 * Returns the DB-relative path (`<numero>/<uuid>.png`).
 */
export async function saveIllustration(
  numero: number,
  bytes: Uint8Array,
): Promise<string> {
  const dir = path.join(mediaDir(), String(numero));
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.png`;
  await writeFile(path.join(dir, filename), bytes);
  return `${numero}/${filename}`;
}

/** Read raw bytes for a stored illustration path (as returned by saveIllustration). */
export async function readIllustration(relPath: string): Promise<Buffer> {
  if (!PATH_RE.test(relPath)) {
    throw new Error(`Invalid media path: ${relPath}`);
  }
  return readFile(path.join(mediaDir(), relPath));
}

/** Best-effort delete; missing files are ignored. */
export async function deleteIllustration(relPath: string): Promise<void> {
  if (!PATH_RE.test(relPath)) return;
  try {
    await unlink(path.join(mediaDir(), relPath));
  } catch {
    // ponytail: unlink races with concurrent regen are harmless — swallow.
  }
}
