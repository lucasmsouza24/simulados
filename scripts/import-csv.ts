/**
 * Imports the question bank CSVs (questoes.csv + gabarito.csv, the format produced by the
 * question generator) into content/<exam>/questions/<requirement>.json.
 *
 * Usage: node scripts/import-csv.ts --exam az-900 --questions <questoes.csv> --answers <gabarito.csv>
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { parseCsv } from '../src/lib/csv.ts';
import { ExamSchema, QuestionSchema, type Exam, type Question, type Localized } from '../src/content/schema.ts';

const AZ900_DOMAINS = [
  {
    id: 'N',
    prefixes: ['cloud'],
    sizes: [7, 4, 4],
    weight: [25, 30] as [number, number],
    name: { pt: 'Descrever os conceitos da nuvem', en: 'Describe cloud concepts' },
  },
  {
    id: 'A',
    prefixes: ['arch'],
    sizes: [7, 6, 6, 8],
    weight: [35, 40] as [number, number],
    name: { pt: 'Descrever a arquitetura e os serviços do Azure', en: 'Describe Azure architecture and services' },
  },
  {
    id: 'G',
    prefixes: ['gov'],
    sizes: [4, 3, 5, 3],
    weight: [30, 35] as [number, number],
    name: { pt: 'Descrever o gerenciamento e a governança do Azure', en: 'Describe Azure management and governance' },
  },
];

const FORMATS: Record<string, Question['format']> = {
  'single-choice': 'single-choice',
  'multi-select': 'multi-select',
  'yes-no': 'yes-no',
  'fill-in': 'fill-in',
  matching: 'matching',
};

type Row = Record<string, string>;

const json = (raw: string): unknown => JSON.parse(raw);
const loc = (pt: string, en: string): Localized => ({ pt: pt.trim(), en: en.trim() });
const choices = (pt: Record<string, string>, en: Record<string, string>) =>
  Object.keys(pt).map((key) => ({ key, text: loc(pt[key] ?? '', en[key] ?? '') }));

function locate(id: string) {
  const prefix = id.split('-')[0]?.toLowerCase() ?? '';
  const domain = AZ900_DOMAINS.find((d) => d.prefixes.some((p) => prefix.startsWith(p)));
  const match = id.match(/-(\d+)-(\d+)-\d+$/);
  if (!domain || !match) return null;
  const section = Number(match[1]);
  const item = Number(match[2]);
  if (section < 1 || section > domain.sizes.length || item < 1 || item > (domain.sizes[section - 1] ?? 0)) return null;
  const offset = domain.sizes.slice(0, section - 1).reduce((s, n) => s + n, 0);
  return { domain, section, requirement: `${domain.id}${String(offset + item).padStart(2, '0')}` };
}

function toQuestion(q: Row, a: Row, requirement: string): Question {
  const format = FORMATS[q.formato ?? ''];
  if (!format) throw new Error(`${q.id}: unknown format ${q.formato}`);
  const optsPt = json(q.opcoes_pt ?? '') as Record<string, unknown>;
  const optsEn = json(q.opcoes_en ?? '') as Record<string, unknown>;
  const answer = json(a.resposta ?? '');

  const base = {
    id: q.id ?? '',
    requirement,
    subject: q.assunto?.trim() || (q.topico_pt ?? ''),
    level: a.nivel === 'detalhe-learn' ? ('detail' as const) : ('essential' as const),
    stem: loc(q.enunciado_pt ?? '', q.enunciado_en ?? ''),
    explanation: loc(a.explicacao_pt ?? '', a.explicacao_en ?? ''),
    distractors: loc(a.distratores_pt ?? '', a.distratores_en ?? ''),
    learnUrl: a.learn_url ?? '',
  };

  switch (format) {
    case 'single-choice':
    case 'fill-in':
      return QuestionSchema.parse({ ...base, format, options: choices(optsPt as Row, optsEn as Row), answer });
    case 'multi-select':
      return QuestionSchema.parse({ ...base, format, options: choices(optsPt as Row, optsEn as Row), answer });
    case 'yes-no':
      return QuestionSchema.parse({
        ...base,
        format,
        statements: choices(optsPt as Row, optsEn as Row),
        answer: Object.fromEntries(Object.entries(answer as Row).map(([k, v]) => [k, v === 'S'])),
      });
    case 'matching': {
      const pt = optsPt as { scenarios: Row; options: Row };
      const en = optsEn as { scenarios: Row; options: Row };
      return QuestionSchema.parse({
        ...base,
        format,
        items: choices(pt.scenarios, en.scenarios),
        options: choices(pt.options, en.options),
        answer,
      });
    }
  }
}

function buildExam(rows: Row[]): Exam {
  const names = new Map<string, { section: Localized; requirement: Localized }>();
  for (const r of rows) {
    const where = locate(r.id ?? '');
    if (!where) continue;
    names.set(where.requirement, {
      section: loc(r.tema_pt ?? '', r.tema_en ?? ''),
      requirement: loc(r.topico_pt ?? '', r.topico_en ?? ''),
    });
  }

  return ExamSchema.parse({
    id: 'az-900',
    code: 'AZ-900',
    name: { pt: 'AZ-900: Fundamentos do Microsoft Azure', en: 'AZ-900: Microsoft Azure Fundamentals' },
    durationMinutes: 45,
    passScore: 700,
    scoreScale: 1000,
    questionCount: { min: 40, max: 60, default: 40 },
    domains: AZ900_DOMAINS.map((d) => {
      let n = 0;
      return {
        id: d.id,
        name: d.name,
        weight: d.weight,
        sections: d.sizes.map((size, s) => {
          const requirements = Array.from({ length: size }, () => {
            const id = `${d.id}${String(++n).padStart(2, '0')}`;
            const found = names.get(id);
            if (!found) throw new Error(`no question names requirement ${id}; cannot build the outline`);
            return { id, name: found.requirement, section: found.section };
          });
          return {
            id: `${d.id}-${s + 1}`,
            name: requirements[0]!.section,
            requirements: requirements.map(({ id, name }) => ({ id, name })),
          };
        }),
      };
    }),
  });
}

function main() {
  const { values } = parseArgs({
    options: {
      exam: { type: 'string', default: 'az-900' },
      questions: { type: 'string' },
      answers: { type: 'string' },
    },
  });
  if (!values.questions || !values.answers) {
    console.error('Usage: node scripts/import-csv.ts --exam az-900 --questions <questoes.csv> --answers <gabarito.csv>');
    process.exit(1);
  }

  const qRows = parseCsv(readFileSync(values.questions, 'utf8'));
  const aRows = new Map(parseCsv(readFileSync(values.answers, 'utf8')).map((r) => [r.id, r]));
  const dir = join('content', values.exam);
  const examPath = join(dir, 'exam.json');
  mkdirSync(join(dir, 'questions'), { recursive: true });

  if (!existsSync(examPath)) {
    writeFileSync(examPath, JSON.stringify(buildExam(qRows), null, 2) + '\n');
    console.log(`created ${examPath}`);
  }

  const byRequirement = new Map<string, Question[]>();
  const skipped: string[] = [];
  for (const q of qRows) {
    const where = locate(q.id ?? '');
    const a = aRows.get(q.id);
    if (!where || !a) {
      skipped.push(`${q.id} (${!a ? 'no answer key' : 'outside the outline'})`);
      continue;
    }
    const list = byRequirement.get(where.requirement) ?? [];
    list.push(toQuestion(q, a, where.requirement));
    byRequirement.set(where.requirement, list);
  }

  for (const [requirement, list] of [...byRequirement].sort(([x], [y]) => x.localeCompare(y))) {
    const file = join(dir, 'questions', `${requirement}.json`);
    const existing: Question[] = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
    const merged = new Map(existing.map((q) => [q.id, q]));
    for (const q of list) merged.set(q.id, q);
    const sorted = [...merged.values()].sort((x, y) => x.id.localeCompare(y.id));
    writeFileSync(file, JSON.stringify(sorted, null, 2) + '\n');
  }

  const total = [...byRequirement.values()].reduce((s, l) => s + l.length, 0);
  console.log(`imported ${total} questions into ${byRequirement.size} requirement files`);
  if (skipped.length) console.log(`skipped ${skipped.length}: ${skipped.join(', ')}`);
}

main();
