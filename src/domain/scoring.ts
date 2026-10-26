import type { Question } from '../content/schema';
import type { Catalog } from './catalog';
import { grade, isAnswered, type Grade, type Response } from './grade';

export type ResultStatus = 'ok' | 'partial' | 'bad' | 'blank';

export interface QuestionResult {
  index: number;
  question: Question;
  response: Response | undefined;
  grade: Grade;
  status: ResultStatus;
}

export interface DomainScore {
  domainId: string;
  questions: number;
  points: number;
}

export interface ExamScore {
  results: QuestionResult[];
  points: number;
  ratio: number;
  scaled: number;
  passed: boolean;
  counts: Record<ResultStatus, number>;
  byDomain: DomainScore[];
}

export function resultOf(index: number, question: Question, response: Response | undefined): QuestionResult {
  const answered = isAnswered(question, response);
  const g = answered ? grade(question, response) : { score: 0, correct: false };
  const status: ResultStatus = !answered ? 'blank' : g.correct ? 'ok' : g.score > 0 ? 'partial' : 'bad';
  return { index, question, response, grade: g, status };
}

/** Linear scale (the real exam's conversion is not public). */
export function scoreExam(
  catalog: Catalog,
  questions: readonly Question[],
  responseOf: (id: string) => Response | undefined,
): ExamScore {
  const results = questions.map((q, i) => resultOf(i, q, responseOf(q.id)));
  const points = results.reduce((s, r) => s + r.grade.score, 0);
  const ratio = results.length ? points / results.length : 0;
  const scaled = Math.round(ratio * catalog.exam.scoreScale);
  const counts: Record<ResultStatus, number> = { ok: 0, partial: 0, bad: 0, blank: 0 };
  for (const r of results) counts[r.status]++;

  const byDomain = catalog.exam.domains
    .map((d) => {
      const rs = results.filter((r) => catalog.requirements.get(r.question.requirement)?.domain.id === d.id);
      return { domainId: d.id, questions: rs.length, points: rs.reduce((s, r) => s + r.grade.score, 0) };
    })
    .filter((d) => d.questions > 0);

  return { results, points, ratio, scaled, passed: scaled >= catalog.exam.passScore, counts, byDomain };
}
