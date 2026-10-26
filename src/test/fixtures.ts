import type { Bundle, Question } from '../content/schema';
import { buildCatalog } from '../domain/catalog';

const l = (text: string) => ({ pt: `${text} (pt)`, en: `${text} (en)` });

const base = (id: string, requirement: string) => ({
  id,
  requirement,
  subject: `assunto ${id}`,
  level: 'essential' as const,
  stem: l(`stem ${id}`),
  explanation: l(`explanation ${id}`),
  distractors: l(`distractors ${id}`),
  learnUrl: 'https://learn.microsoft.com/en-us/training/',
});

const options = (keys: string[]) => keys.map((key) => ({ key, text: l(`option ${key}`) }));

export const single = (id: string, requirement = 'N01'): Question => ({
  ...base(id, requirement),
  format: 'single-choice',
  options: options(['A', 'B', 'C', 'D']),
  answer: 'C',
});

export const fillIn = (id: string, requirement = 'N01'): Question => ({
  ...base(id, requirement),
  format: 'fill-in',
  stem: { pt: 'Complete: ______ e ______.', en: 'Complete: ______ and ______.' },
  options: [
    { key: 'A', text: { pt: 'SaaS; IaaS', en: 'SaaS; IaaS' } },
    { key: 'B', text: { pt: 'IaaS; SaaS', en: 'IaaS; SaaS' } },
  ],
  answer: 'A',
});

export const multi = (id: string, requirement = 'N01'): Question => ({
  ...base(id, requirement),
  format: 'multi-select',
  options: options(['A', 'B', 'C', 'D', 'E']),
  answer: ['B', 'E'],
});

export const yesNo = (id: string, requirement = 'N01'): Question => ({
  ...base(id, requirement),
  format: 'yes-no',
  statements: options(['1', '2', '3']),
  answer: { '1': false, '2': true, '3': true },
});

export const matching = (id: string, requirement = 'N01'): Question => ({
  ...base(id, requirement),
  format: 'matching',
  items: options(['1', '2', '3']),
  options: options(['A', 'B', 'C', 'D']),
  answer: { '1': 'C', '2': 'A', '3': 'D' },
});

const requirement = (id: string) => ({ id, name: l(`requirement ${id}`) });

export function makeBundle(questions: Question[]): Bundle {
  return {
    exam: {
      id: 'test-exam',
      code: 'TEST-1',
      name: l('Test exam'),
      durationMinutes: 45,
      passScore: 700,
      scoreScale: 1000,
      questionCount: { min: 2, max: 10, default: 4 },
      domains: [
        { id: 'N', name: l('Cloud'), weight: [25, 30], sections: [{ id: 'N-1', name: l('Section N1'), requirements: [requirement('N01'), requirement('N02')] }] },
        { id: 'A', name: l('Architecture'), weight: [35, 40], sections: [{ id: 'A-1', name: l('Section A1'), requirements: [requirement('A01')] }] },
        { id: 'G', name: l('Governance'), weight: [30, 35], sections: [{ id: 'G-1', name: l('Section G1'), requirements: [requirement('G01')] }] },
      ],
    },
    questions,
  };
}

export const makeCatalog = (questions: Question[]) => buildCatalog(makeBundle(questions));
