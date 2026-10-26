import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateBundle } from '../src/content/schema.ts';
import { loadBundles } from './build-content.ts';

describe('content', () => {
  const { bundles, errors } = loadBundles(join(import.meta.dirname, '..', 'content'));

  it('has no schema or consistency errors', () => {
    expect(errors).toEqual([]);
  });

  it('covers every requirement of every exam', () => {
    for (const { exam, questions } of bundles) {
      const covered = new Set(questions.map((q) => q.requirement));
      const missing = exam.domains.flatMap((d) => d.sections.flatMap((s) => s.requirements.map((r) => r.id))).filter((id) => !covered.has(id));
      expect(missing, exam.id).toEqual([]);
    }
  });

  it('rejects answers that point to missing options', () => {
    const [bundle] = bundles;
    if (!bundle) throw new Error('no content');
    const q = bundle.questions.find((x) => x.format === 'single-choice');
    if (!q || q.format !== 'single-choice') throw new Error('no single-choice question');
    const broken = { ...bundle, questions: [{ ...q, answer: 'Z' }] };
    expect(validateBundle(broken).some((e) => e.includes('answer Z is not an option'))).toBe(true);
  });
});
