import { describe, expect, it } from 'vitest';
import { makeCatalog, single } from '../test/fixtures';
import { composeExam, previewComposition } from './compose';
import { allocate, pickSpread, sampleWeights, seededRng, shuffle } from './sampling';

const RANGES = [
  { id: 'N', range: [25, 30] as const },
  { id: 'A', range: [35, 40] as const },
  { id: 'G', range: [30, 35] as const },
];

describe('sampleWeights', () => {
  it('stays inside every range and adds up to 100', () => {
    const rng = seededRng(1);
    for (let i = 0; i < 2000; i++) {
      const w = sampleWeights(RANGES, rng);
      for (const { id, range } of RANGES) {
        expect(w[id]).toBeGreaterThanOrEqual(range[0]);
        expect(w[id]).toBeLessThanOrEqual(range[1]);
      }
      expect((w.N ?? 0) + (w.A ?? 0) + (w.G ?? 0)).toBeCloseTo(100);
    }
  });
});

describe('allocate', () => {
  const order = ['N', 'A', 'G'];

  it('follows the weights when every domain has enough questions', () => {
    const counts = allocate(40, { N: 27.5, A: 37.5, G: 35 }, { N: 99, A: 99, G: 99 }, order);
    expect(counts).toEqual({ N: 11, A: 15, G: 14 });
  });

  it('moves missing slots to the domains that still have questions', () => {
    expect(allocate(40, { N: 27.5, A: 37.5, G: 35 }, { N: 40, A: 5, G: 0 }, order)).toEqual({ N: 35, A: 5, G: 0 });
  });

  it('never returns more than the bank has', () => {
    expect(allocate(60, { N: 27.5, A: 37.5, G: 35 }, { N: 10, A: 10, G: 10 }, order)).toEqual({ N: 10, A: 10, G: 10 });
  });
});

describe('pickSpread', () => {
  it('rotates across groups before repeating one', () => {
    const pool = Array.from({ length: 30 }, (_, i) => ({ id: i, group: `g${i % 6}` }));
    const picked = pickSpread(pool, 12, (x) => x.group, seededRng(7));
    const perGroup = new Map<string, number>();
    for (const p of picked) perGroup.set(p.group, (perGroup.get(p.group) ?? 0) + 1);
    expect(new Set(picked).size).toBe(12);
    expect([...perGroup.values()]).toEqual([2, 2, 2, 2, 2, 2]);
  });
});

describe('shuffle', () => {
  it('is a permutation and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, seededRng(3));
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual(input);
  });
});

describe('composeExam', () => {
  const questions = [
    ...Array.from({ length: 6 }, (_, i) => single(`N-${i}`, i % 2 ? 'N01' : 'N02')),
    ...Array.from({ length: 6 }, (_, i) => single(`A-${i}`, 'A01')),
  ];
  const catalog = makeCatalog(questions);

  it('draws unique questions and fills the missing domain from the others', () => {
    const { questionIds } = composeExam(catalog, 8, seededRng(11));
    expect(questionIds).toHaveLength(8);
    expect(new Set(questionIds).size).toBe(8);
  });

  it('previews the composition and flags missing domains', () => {
    const preview = previewComposition(catalog, 8);
    expect(preview.missingDomains).toEqual(['G']);
    expect(preview.totalAvailable).toBe(12);
    expect((preview.planned.N ?? 0) + (preview.planned.A ?? 0)).toBe(8);
  });
});
