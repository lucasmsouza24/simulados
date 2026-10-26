import type { Question } from '../content/schema';

/** single-choice and fill-in: option key; multi-select: option keys; yes-no: statement → yes; matching: item → option key. */
export type Response = string | string[] | Record<string, boolean | string>;

export interface Grade {
  /** Between 0 and 1. Yes/No and matching earn one share per right item; multi-select loses one share per wrong pick. */
  score: number;
  correct: boolean;
  right?: number;
  total?: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function asChoice(response: Response | undefined): string | undefined {
  return typeof response === 'string' ? response : undefined;
}

export function asChoices(response: Response | undefined): string[] {
  return Array.isArray(response) ? response : [];
}

export function asYesNo(response: Response | undefined): Record<string, boolean> {
  if (!isRecord(response)) return {};
  return Object.fromEntries(Object.entries(response).filter((e): e is [string, boolean] => typeof e[1] === 'boolean'));
}

export function asMatching(response: Response | undefined): Record<string, string> {
  if (!isRecord(response)) return {};
  return Object.fromEntries(Object.entries(response).filter((e): e is [string, string] => typeof e[1] === 'string' && e[1] !== ''));
}

/** Every part answered (enables "Check" in the bank). */
export function isComplete(question: Question, response: Response | undefined): boolean {
  switch (question.format) {
    case 'single-choice':
    case 'fill-in':
      return asChoice(response) !== undefined;
    case 'multi-select':
      return asChoices(response).length > 0;
    case 'yes-no': {
      const r = asYesNo(response);
      return question.statements.every((s) => s.key in r);
    }
    case 'matching': {
      const r = asMatching(response);
      return question.items.every((i) => i.key in r);
    }
  }
}

/** At least one part answered (counts as "answered" in the exam). */
export function isAnswered(question: Question, response: Response | undefined): boolean {
  switch (question.format) {
    case 'single-choice':
    case 'fill-in':
      return asChoice(response) !== undefined;
    case 'multi-select':
      return asChoices(response).length > 0;
    case 'yes-no':
      return Object.keys(asYesNo(response)).length > 0;
    case 'matching':
      return Object.keys(asMatching(response)).length > 0;
  }
}

export function grade(question: Question, response: Response | undefined): Grade {
  switch (question.format) {
    case 'single-choice':
    case 'fill-in': {
      const correct = asChoice(response) === question.answer;
      return { score: correct ? 1 : 0, correct };
    }
    case 'multi-select': {
      const expected = new Set(question.answer);
      const picked = new Set(asChoices(response));
      const hits = [...picked].filter((k) => expected.has(k)).length;
      const misses = picked.size - hits;
      return {
        score: Math.max(0, (hits - misses) / expected.size),
        correct: hits === expected.size && misses === 0,
      };
    }
    case 'yes-no': {
      const r = asYesNo(response);
      const total = question.statements.length;
      const right = question.statements.filter((s) => r[s.key] === question.answer[s.key]).length;
      return { score: right / total, correct: right === total, right, total };
    }
    case 'matching': {
      const r = asMatching(response);
      const total = question.items.length;
      const right = question.items.filter((i) => r[i.key] === question.answer[i.key]).length;
      return { score: right / total, correct: right === total, right, total };
    }
  }
}
