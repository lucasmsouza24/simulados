import type { z } from 'zod';

const PREFIX = 'simulados:v1:';

/** Reads a JSON value and validates it; anything invalid (tampered, old format) is removed and ignored. */
export function readStorage<T>(key: string, schema: z.ZodType<T>): T | undefined {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return undefined;
    const parsed = schema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
    localStorage.removeItem(PREFIX + key);
  } catch {
    // Storage unavailable or malformed JSON: behave as if empty.
  }
  return undefined;
}

export function writeStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled: the app keeps working without persistence.
  }
}

export function removeStorage(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // Storage unavailable.
  }
}
