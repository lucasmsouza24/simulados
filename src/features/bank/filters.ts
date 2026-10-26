import { QUESTION_FORMATS, type Question } from '../../content/schema';
import type { Catalog } from '../../domain/catalog';
import { seededRng, shuffle } from '../../domain/sampling';
import { matchesSearch, normalize } from '../../domain/text';

export interface BankFilters {
  q: string;
  domain: string;
  requirement: string;
  format: string;
  level: string;
  /** Shuffle seed; empty keeps the outline order. */
  seed: string;
}

export const FILTER_PARAMS = {
  q: 'q',
  domain: 'dominio',
  requirement: 'topico',
  format: 'formato',
  level: 'nivel',
  seed: 'ordem',
} as const satisfies Record<keyof BankFilters, string>;

export function readFilters(params: URLSearchParams): BankFilters {
  const get = (key: keyof BankFilters) => (params.get(FILTER_PARAMS[key]) ?? '').slice(0, 200);
  return {
    q: get('q'),
    domain: get('domain'),
    requirement: get('requirement'),
    format: (QUESTION_FORMATS as readonly string[]).includes(get('format')) ? get('format') : '',
    level: ['essential', 'detail'].includes(get('level')) ? get('level') : '',
    seed: /^\d{1,10}$/.test(get('seed')) ? get('seed') : '',
  };
}

const haystacks = new WeakMap<Question, string>();

function haystackOf(question: Question): string {
  let text = haystacks.get(question);
  if (text === undefined) {
    const choices =
      question.format === 'yes-no'
        ? question.statements
        : question.format === 'matching'
          ? [...question.items, ...question.options]
          : question.options;
    text = normalize(
      [question.id, question.subject, question.stem.pt, question.stem.en, ...choices.flatMap((c) => [c.text.pt, c.text.en])].join(' '),
    );
    haystacks.set(question, text);
  }
  return text;
}

export function applyFilters(catalog: Catalog, filters: BankFilters): Question[] {
  const list = catalog.questions.filter((q) => {
    const info = catalog.requirements.get(q.requirement);
    return (
      (!filters.domain || info?.domain.id === filters.domain) &&
      (!filters.requirement || q.requirement === filters.requirement) &&
      (!filters.format || q.format === filters.format) &&
      (!filters.level || q.level === filters.level) &&
      (!filters.q || matchesSearch(haystackOf(q), filters.q))
    );
  });
  return filters.seed ? shuffle(list, seededRng(Number(filters.seed))) : list;
}
