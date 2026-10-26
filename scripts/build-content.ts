/**
 * Validates content/<exam>/ and writes the files the app downloads:
 * public/data/exams.json (index) and public/data/<exam>.json (exam + questions).
 * Fails (exit 1) on any schema or consistency error, so broken content never reaches a build.
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { BundleSchema, ExamSchema, QuestionSchema, validateBundle, type Bundle, type ExamSummary } from '../src/content/schema.ts';

const readJson = (file: string): unknown => JSON.parse(readFileSync(file, 'utf8'));

const describe = (file: string, error: z.ZodError) =>
  error.issues.map((i) => `${file}: ${i.path.join('.') || '(root)'} ${i.message}`);

export function loadBundles(contentDir: string): { bundles: Bundle[]; errors: string[] } {
  const bundles: Bundle[] = [];
  const errors: string[] = [];

  const examDirs = readdirSync(contentDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  for (const name of examDirs) {
    const dir = join(contentDir, name);
    const examFile = join(dir, 'exam.json');
    const exam = ExamSchema.safeParse(readJson(examFile));
    if (!exam.success) {
      errors.push(...describe(examFile, exam.error));
      continue;
    }
    if (exam.data.id !== name) errors.push(`${examFile}: id "${exam.data.id}" must match the folder name`);

    const questionsDir = join(dir, 'questions');
    const questions = [];
    for (const file of readdirSync(questionsDir).filter((f) => f.endsWith('.json')).sort()) {
      const path = join(questionsDir, file);
      const parsed = z.array(QuestionSchema).safeParse(readJson(path));
      if (!parsed.success) {
        errors.push(...describe(path, parsed.error));
        continue;
      }
      questions.push(...parsed.data);
    }

    const bundle = BundleSchema.parse({ exam: exam.data, questions });
    errors.push(...validateBundle(bundle));
    bundles.push(bundle);
  }

  return { bundles, errors };
}

function main() {
  const root = resolve(import.meta.dirname, '..');
  const { bundles, errors } = loadBundles(join(root, 'content'));
  if (errors.length) {
    console.error(`content has ${errors.length} error(s):\n- ${errors.join('\n- ')}`);
    process.exit(1);
  }

  const out = join(root, 'public', 'data');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  const index: ExamSummary[] = bundles.map((b) => ({
    id: b.exam.id,
    code: b.exam.code,
    name: b.exam.name,
    questions: b.questions.length,
  }));
  writeFileSync(join(out, 'exams.json'), JSON.stringify(index));
  for (const b of bundles) writeFileSync(join(out, `${b.exam.id}.json`), JSON.stringify(b));

  console.log(`content ok: ${bundles.map((b) => `${b.exam.id} (${b.questions.length} questions)`).join(', ')}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
