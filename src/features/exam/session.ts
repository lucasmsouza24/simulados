import { z } from 'zod';
import type { Exam } from '../../content/schema';
import type { Catalog } from '../../domain/catalog';
import { CONFIDENCE, ERROR_TYPES, type Confidence, type ErrorType } from '../../domain/export';
import type { Response } from '../../domain/grade';

export const SetupSchema = z.object({
  count: z.number().int(),
  minutes: z.number().int(),
  askConfidence: z.boolean(),
});
export type Setup = z.infer<typeof SetupSchema>;

const ResponseSchema = z.union([
  z.string(),
  z.array(z.string()),
  z.record(z.string(), z.union([z.boolean(), z.string()])),
]);

const AnswerSchema = z.object({
  response: ResponseSchema.optional(),
  confidence: z.enum(CONFIDENCE).optional(),
  flagged: z.boolean().optional(),
  errorType: z.enum(ERROR_TYPES).optional(),
});
export type Answer = z.infer<typeof AnswerSchema>;

export const SessionSchema = z.object({
  version: z.literal(1),
  examId: z.string(),
  status: z.enum(['running', 'done']),
  config: SetupSchema,
  weights: z.record(z.string(), z.number()),
  questionIds: z.array(z.string()).min(1),
  answers: z.record(z.string(), AnswerSchema),
  current: z.number().int().min(0),
  startedAt: z.number(),
  endsAt: z.number(),
  finishedAt: z.number().optional(),
  timeUp: z.boolean().optional(),
});
export type ExamSession = z.infer<typeof SessionSchema>;

export const MAX_MINUTES = 240;

export function clampSetup(exam: Exam, setup: Partial<Setup> | undefined): Setup {
  const { min, max, default: def } = exam.questionCount;
  const count = Math.round(setup?.count ?? def);
  const minutes = Math.round(setup?.minutes ?? exam.durationMinutes);
  return {
    count: Number.isFinite(count) ? Math.min(max, Math.max(min, count)) : def,
    minutes: Number.isFinite(minutes) ? Math.min(MAX_MINUTES, Math.max(1, minutes)) : exam.durationMinutes,
    askConfidence: setup?.askConfidence ?? true,
  };
}

export type Action =
  | { type: 'start'; examId: string; config: Setup; weights: Record<string, number>; questionIds: string[]; at: number }
  | { type: 'answer'; id: string; response: Response | undefined }
  | { type: 'confidence'; id: string; value: Confidence | undefined }
  | { type: 'flag'; id: string }
  | { type: 'goto'; index: number }
  | { type: 'finish'; at: number; timeUp: boolean }
  | { type: 'errorType'; id: string; value: ErrorType | undefined }
  | { type: 'discard' };

function patchAnswer(state: ExamSession, id: string, patch: Partial<Answer>): ExamSession {
  if (!state.questionIds.includes(id)) return state;
  return { ...state, answers: { ...state.answers, [id]: { ...state.answers[id], ...patch } } };
}

export function reducer(state: ExamSession | null, action: Action): ExamSession | null {
  if (action.type === 'start') {
    return {
      version: 1,
      examId: action.examId,
      status: 'running',
      config: action.config,
      weights: action.weights,
      questionIds: action.questionIds,
      answers: {},
      current: 0,
      startedAt: action.at,
      endsAt: action.at + action.config.minutes * 60_000,
    };
  }
  if (!state) return state;

  switch (action.type) {
    case 'discard':
      return null;
    case 'finish':
      if (state.status !== 'running') return state;
      return { ...state, status: 'done', finishedAt: Math.min(action.at, state.endsAt), timeUp: action.timeUp };
    case 'errorType':
      return state.status === 'done' ? patchAnswer(state, action.id, { errorType: action.value }) : state;
    default:
      break;
  }

  if (state.status !== 'running') return state;
  switch (action.type) {
    case 'answer':
      return patchAnswer(state, action.id, { response: action.response });
    case 'confidence':
      return patchAnswer(state, action.id, { confidence: action.value });
    case 'flag':
      return patchAnswer(state, action.id, { flagged: !state.answers[action.id]?.flagged });
    case 'goto':
      return action.index >= 0 && action.index < state.questionIds.length ? { ...state, current: action.index } : state;
  }
}

/** Rebuilds a stored session against the current content: unknown questions are dropped and expired exams are finished. */
export function restore(stored: ExamSession | undefined, catalog: Catalog, now: number): ExamSession | null {
  if (!stored || stored.examId !== catalog.exam.id) return null;
  const questionIds = stored.questionIds.filter((id) => catalog.byId.has(id));
  if (questionIds.length === 0) return null;
  const session: ExamSession = { ...stored, questionIds, current: Math.min(stored.current, questionIds.length - 1) };
  if (session.status === 'running' && now >= session.endsAt) {
    return { ...session, status: 'done', finishedAt: session.endsAt, timeUp: true };
  }
  return session;
}
