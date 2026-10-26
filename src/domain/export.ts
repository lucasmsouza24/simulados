import type { Question } from '../content/schema';
import { asChoice, asChoices, asMatching, asYesNo, type Response } from './grade';
import type { QuestionResult } from './scoring';
import { localDate } from './text';

export const CONFIDENCE = ['C', 'D', 'X'] as const;
export type Confidence = (typeof CONFIDENCE)[number];

export const ERROR_TYPES = ['conteudo', 'distracao', 'pegadinha', 'nomenclatura'] as const;
export type ErrorType = (typeof ERROR_TYPES)[number];

export interface ResultExtras {
  confidence?: Confidence;
  errorType?: ErrorType;
}

type Extras = (questionId: string) => ResultExtras;

const yesNo = (value: boolean | undefined, yes: string, no: string) => (value === undefined ? '' : value ? yes : no);

/** Compact text of an answer: "C", "BE", "1:Y 2:N", "1:C 2:A". */
export function answerText(question: Question, response: Response | undefined, yes = 'Y', no = 'N'): string {
  switch (question.format) {
    case 'single-choice':
    case 'fill-in':
      return asChoice(response) ?? '';
    case 'multi-select':
      return [...asChoices(response)].sort().join('');
    case 'yes-no': {
      const r = asYesNo(response);
      return question.statements
        .filter((s) => s.key in r)
        .map((s) => `${s.key}:${yesNo(r[s.key], yes, no)}`)
        .join(' ');
    }
    case 'matching': {
      const r = asMatching(response);
      return question.items
        .filter((i) => i.key in r)
        .map((i) => `${i.key}:${r[i.key]}`)
        .join(' ');
    }
  }
}

export function correctResponse(question: Question): Response {
  return question.answer;
}

export const RESULT_COLUMNS = [
  'number',
  'id',
  'requirement',
  'subject',
  'format',
  'level',
  'status',
  'score',
  'your_answer',
  'correct_answer',
  'confidence',
  'error_type',
] as const;

export function resultRows(results: readonly QuestionResult[], extras: Extras): (string | number)[][] {
  return results.map((r) => {
    const x = extras(r.question.id);
    return [
      r.index + 1,
      r.question.id,
      r.question.requirement,
      r.question.subject,
      r.question.format,
      r.question.level,
      r.status,
      Number(r.grade.score.toFixed(3)),
      answerText(r.question, r.response),
      answerText(r.question, correctResponse(r.question)),
      x.confidence ?? '',
      r.status === 'ok' ? '' : (x.errorType ?? ''),
    ];
  });
}

/* ---------- personal study history (azure-study/az-900/progresso/questoes.csv) ---------- */

export const HISTORY_COLUMNS = ['data', 'sessao', 'requisito', 'tema', 'formato', 'nivel', 'resultado', 'confianca', 'erro', 'obs'] as const;

const HISTORY_FORMAT: Record<Question['format'], string> = {
  'single-choice': 'multipla-escolha',
  'multi-select': 'multipla-selecao',
  'yes-no': 'sim-nao',
  'fill-in': 'completar',
  matching: 'associacao',
};

/** The study dashboard keeps only the last row per (requisito, tema), so wrong rows go last within each group. */
export function errorsLast(rows: string[][]): string[][] {
  const group = (r: string[]) => `${r[2]}|${r[3]}`;
  const first = new Map<string, number>();
  rows.forEach((r, i) => {
    if (!first.has(group(r))) first.set(group(r), i);
  });
  return rows
    .map((r, i) => ({ r, i }))
    .sort(
      (x, y) =>
        first.get(group(x.r))! - first.get(group(y.r))! ||
        Number(x.r[6] === 'errado') - Number(y.r[6] === 'errado') ||
        x.i - y.i,
    )
    .map(({ r }) => r);
}

export function historyRows(
  results: readonly QuestionResult[],
  extras: Extras,
  session: string,
  finishedAt: number,
): string[][] {
  const date = localDate(finishedAt);
  const rows = results.flatMap(({ question: q, response }) => {
    const x = extras(q.id);
    const base = [date, session, q.requirement, q.subject, HISTORY_FORMAT[q.format], q.level === 'detail' ? 'detalhe' : 'essencial'];
    const row = (ok: boolean, obs: string) => [...base, ok ? 'certo' : 'errado', x.confidence ?? '?', ok ? '' : (x.errorType ?? ''), obs];
    const obs = (item: string | null, got: string, want: string) => {
      const where = `simulado ${q.id}${item ? ` item ${item}` : ''}`;
      if (!got) return `${where} sem resposta`;
      return got === want ? where : `${where} marcou ${got} gabarito ${want}`;
    };

    if (q.format === 'yes-no') {
      const r = asYesNo(response);
      return q.statements.map((s) => {
        const got = yesNo(r[s.key], 'S', 'N');
        const want = yesNo(q.answer[s.key], 'S', 'N');
        return row(got === want, obs(s.key, got, want));
      });
    }
    if (q.format === 'matching') {
      const r = asMatching(response);
      return q.items.map((i) => {
        const got = r[i.key] ?? '';
        const want = q.answer[i.key] ?? '';
        return row(got === want, obs(i.key, got, want));
      });
    }
    const got = answerText(q, response);
    const want = answerText(q, q.answer);
    return [row(got !== '' && got === want, obs(null, got, want))];
  });
  return errorsLast(rows);
}
