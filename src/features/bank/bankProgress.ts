import { createContext, use } from 'react';
import type { Response } from '../../domain/grade';

export interface BankEntry {
  response?: Response;
  checked?: boolean;
  revealed?: boolean;
  correct?: boolean;
}

export interface BankProgressApi {
  entries: Readonly<Record<string, BankEntry>>;
  update: (id: string, patch: Partial<BankEntry>) => void;
  reset: (id: string) => void;
}

export const BankProgressContext = createContext<BankProgressApi | null>(null);

export function useBankProgress(): BankProgressApi {
  const api = use(BankProgressContext);
  if (!api) throw new Error('useBankProgress must be used inside <BankProgressProvider>');
  return api;
}
