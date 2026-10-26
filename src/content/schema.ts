import { z } from 'zod';

export const LANGS = ['pt', 'en'] as const;
export type Lang = (typeof LANGS)[number];

const LEARN_HOSTS = new Set(['learn.microsoft.com']);

export const LocalizedSchema = z.object({
  pt: z.string().trim().min(1),
  en: z.string().trim().min(1),
});
export type Localized = z.infer<typeof LocalizedSchema>;

const KeySchema = z.string().regex(/^[A-Z0-9]{1,3}$/);
const RequirementIdSchema = z.string().regex(/^[A-Z]{1,3}\d{2}$/);

export const LearnUrlSchema = z.string().refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && LEARN_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}, 'learnUrl must be an https URL on an allowed host');

const ChoiceSchema = z.object({ key: KeySchema, text: LocalizedSchema });
export type Choice = z.infer<typeof ChoiceSchema>;

const base = {
  id: z.string().regex(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/),
  requirement: RequirementIdSchema,
  subject: z.string().trim().min(1),
  level: z.enum(['essential', 'detail']),
  stem: LocalizedSchema,
  explanation: LocalizedSchema,
  distractors: LocalizedSchema,
  learnUrl: LearnUrlSchema,
};

const SingleChoiceSchema = z.object({
  ...base,
  format: z.literal('single-choice'),
  options: z.array(ChoiceSchema).min(2),
  answer: KeySchema,
});

const FillInSchema = z.object({
  ...base,
  format: z.literal('fill-in'),
  options: z.array(ChoiceSchema).min(2),
  answer: KeySchema,
});

const MultiSelectSchema = z.object({
  ...base,
  format: z.literal('multi-select'),
  options: z.array(ChoiceSchema).min(3),
  answer: z.array(KeySchema).min(2),
});

const YesNoSchema = z.object({
  ...base,
  format: z.literal('yes-no'),
  statements: z.array(ChoiceSchema).min(1),
  answer: z.record(KeySchema, z.boolean()),
});

const MatchingSchema = z.object({
  ...base,
  format: z.literal('matching'),
  items: z.array(ChoiceSchema).min(2),
  options: z.array(ChoiceSchema).min(2),
  answer: z.record(KeySchema, KeySchema),
});

export const QuestionSchema = z.discriminatedUnion('format', [
  SingleChoiceSchema,
  FillInSchema,
  MultiSelectSchema,
  YesNoSchema,
  MatchingSchema,
]);
export type Question = z.infer<typeof QuestionSchema>;
export type QuestionFormat = Question['format'];
export const QUESTION_FORMATS = [
  'single-choice',
  'multi-select',
  'yes-no',
  'fill-in',
  'matching',
] as const satisfies readonly QuestionFormat[];

const RequirementSchema = z.object({ id: RequirementIdSchema, name: LocalizedSchema });
const SectionSchema = z.object({
  id: z.string().min(1),
  name: LocalizedSchema,
  requirements: z.array(RequirementSchema).min(1),
});
const DomainSchema = z.object({
  id: z.string().regex(/^[A-Z]{1,3}$/),
  name: LocalizedSchema,
  weight: z.tuple([z.number().min(0).max(100), z.number().min(0).max(100)]),
  sections: z.array(SectionSchema).min(1),
});

export const ExamSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  code: z.string().min(1),
  name: LocalizedSchema,
  durationMinutes: z.number().int().min(1).max(240),
  passScore: z.number().int().min(1),
  scoreScale: z.number().int().min(1),
  questionCount: z.object({
    min: z.number().int().min(1),
    max: z.number().int().min(1),
    default: z.number().int().min(1),
  }),
  domains: z.array(DomainSchema).min(1),
});
export type Exam = z.infer<typeof ExamSchema>;
export type ExamDomain = Exam['domains'][number];

export const BundleSchema = z.object({
  exam: ExamSchema,
  questions: z.array(QuestionSchema),
});
export type Bundle = z.infer<typeof BundleSchema>;

export const ExamSummarySchema = z.object({
  id: ExamSchema.shape.id,
  code: z.string(),
  name: LocalizedSchema,
  questions: z.number().int().min(0),
});
export const ExamIndexSchema = z.array(ExamSummarySchema);
export type ExamSummary = z.infer<typeof ExamSummarySchema>;

const BLANK = /_{3,}/g;
export const countBlanks = (text: string): number => text.match(BLANK)?.length ?? 0;

function sameKeys(record: Record<string, unknown>, keys: string[]): boolean {
  const recordKeys = Object.keys(record).sort();
  const expected = [...keys].sort();
  return recordKeys.length === expected.length && recordKeys.every((k, i) => k === expected[i]);
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  return [...new Set(values.filter((v) => (seen.has(v) ? true : (seen.add(v), false))))];
}

/** Checks the rules a schema alone cannot express. Returns one message per problem. */
export function validateBundle(bundle: Bundle): string[] {
  const { exam, questions } = bundle;
  const errors: string[] = [];

  const { min, max, default: def } = exam.questionCount;
  if (!(min <= def && def <= max)) errors.push(`exam ${exam.id}: questionCount must satisfy min <= default <= max`);
  if (exam.passScore > exam.scoreScale) errors.push(`exam ${exam.id}: passScore above scoreScale`);

  const minSum = exam.domains.reduce((s, d) => s + d.weight[0], 0);
  const maxSum = exam.domains.reduce((s, d) => s + d.weight[1], 0);
  if (minSum > 100 || maxSum < 100) errors.push(`exam ${exam.id}: domain weight ranges cannot add up to 100%`);
  for (const d of exam.domains) {
    if (d.weight[0] > d.weight[1]) errors.push(`domain ${d.id}: weight range is inverted`);
  }

  const requirementIds = exam.domains.flatMap((d) => d.sections.flatMap((s) => s.requirements.map((r) => r.id)));
  for (const dup of duplicates(exam.domains.map((d) => d.id))) errors.push(`exam ${exam.id}: duplicated domain ${dup}`);
  for (const dup of duplicates(requirementIds)) errors.push(`exam ${exam.id}: duplicated requirement ${dup}`);
  const knownRequirements = new Set(requirementIds);

  for (const dup of duplicates(questions.map((q) => q.id))) errors.push(`question ${dup}: duplicated id`);

  for (const q of questions) {
    const where = `question ${q.id}`;
    if (!knownRequirements.has(q.requirement)) errors.push(`${where}: unknown requirement ${q.requirement}`);

    switch (q.format) {
      case 'single-choice':
      case 'fill-in':
      case 'multi-select': {
        const keys = q.options.map((o) => o.key);
        for (const dup of duplicates(keys)) errors.push(`${where}: duplicated option ${dup}`);
        const answers = q.format === 'multi-select' ? q.answer : [q.answer];
        for (const dup of duplicates(answers)) errors.push(`${where}: duplicated answer ${dup}`);
        for (const a of answers) if (!keys.includes(a)) errors.push(`${where}: answer ${a} is not an option`);
        if (q.format === 'multi-select' && q.answer.length >= q.options.length) {
          errors.push(`${where}: every option is correct`);
        }
        if (q.format === 'fill-in') {
          for (const lang of LANGS) {
            const blanks = countBlanks(q.stem[lang]);
            if (blanks === 0) errors.push(`${where}: stem (${lang}) has no blank`);
            if (blanks > 1) {
              for (const o of q.options) {
                if (o.text[lang].split(';').length !== blanks) {
                  errors.push(`${where}: option ${o.key} (${lang}) must have ${blanks} parts separated by ";"`);
                }
              }
            }
          }
        }
        break;
      }
      case 'yes-no': {
        const keys = q.statements.map((s) => s.key);
        for (const dup of duplicates(keys)) errors.push(`${where}: duplicated statement ${dup}`);
        if (!sameKeys(q.answer, keys)) errors.push(`${where}: answer must cover exactly the statements`);
        break;
      }
      case 'matching': {
        const itemKeys = q.items.map((i) => i.key);
        const optionKeys = q.options.map((o) => o.key);
        for (const dup of duplicates(itemKeys)) errors.push(`${where}: duplicated item ${dup}`);
        for (const dup of duplicates(optionKeys)) errors.push(`${where}: duplicated option ${dup}`);
        if (!sameKeys(q.answer, itemKeys)) errors.push(`${where}: answer must cover exactly the items`);
        for (const [item, option] of Object.entries(q.answer)) {
          if (!optionKeys.includes(option)) errors.push(`${where}: item ${item} points to unknown option ${option}`);
        }
        break;
      }
    }
  }

  return errors;
}
