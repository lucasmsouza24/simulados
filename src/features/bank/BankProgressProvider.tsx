import { useState, type ReactNode } from 'react';
import { BankProgressContext, type BankEntry } from './bankProgress';

/** Practice state of the question bank. Kept in memory only, like the original app. */
export function BankProgressProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Record<string, BankEntry>>({});

  const api = {
    entries,
    update: (id: string, patch: Partial<BankEntry>) => setEntries((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } })),
    reset: (id: string) =>
      setEntries((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      }),
  };

  return <BankProgressContext value={api}>{children}</BankProgressContext>;
}
