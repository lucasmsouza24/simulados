import { createContext, use } from 'react';
import type { Confidence, ErrorType } from '../../domain/export';
import type { Response } from '../../domain/grade';
import type { ExamSession, Setup } from './session';

export interface ExamSessionApi {
  session: ExamSession | null;
  /** Wall clock, refreshed every second while an exam is running. */
  now: number;
  locked: boolean;
  start: (setup: Setup) => void;
  answer: (id: string, response: Response | undefined) => void;
  setConfidence: (id: string, value: Confidence | undefined) => void;
  toggleFlag: (id: string) => void;
  goTo: (index: number) => void;
  finish: () => void;
  discard: () => void;
  setErrorType: (id: string, value: ErrorType | undefined) => void;
}

export const ExamSessionContext = createContext<ExamSessionApi | null>(null);

export function useExamSession(): ExamSessionApi {
  const api = use(ExamSessionContext);
  if (!api) throw new Error('useExamSession must be used inside <ExamSessionProvider>');
  return api;
}
