import type { Question } from '../content/schema';
import type { Catalog } from './catalog';
import { allocate, midWeights, pickSpread, sampleWeights, shuffle, type Rng, type WeightRanges } from './sampling';

export const weightRanges = (catalog: Catalog): WeightRanges =>
  catalog.exam.domains.map((d) => ({ id: d.id, range: d.weight }));

export function poolsByDomain(catalog: Catalog): Record<string, Question[]> {
  const pools: Record<string, Question[]> = Object.fromEntries(catalog.exam.domains.map((d) => [d.id, []]));
  for (const q of catalog.questions) {
    const domain = catalog.requirements.get(q.requirement)?.domain.id;
    if (domain) pools[domain]?.push(q);
  }
  return pools;
}

export interface CompositionPreview {
  available: Record<string, number>;
  planned: Record<string, number>;
  missingDomains: string[];
  totalAvailable: number;
}

export function previewComposition(catalog: Catalog, count: number): CompositionPreview {
  const pools = poolsByDomain(catalog);
  const order = catalog.exam.domains.map((d) => d.id);
  const available = Object.fromEntries(order.map((id) => [id, pools[id]?.length ?? 0]));
  return {
    available,
    planned: allocate(count, midWeights(weightRanges(catalog)), available, order),
    missingDomains: order.filter((id) => available[id] === 0),
    totalAvailable: order.reduce((s, id) => s + (available[id] ?? 0), 0),
  };
}

export interface Composition {
  weights: Record<string, number>;
  questionIds: string[];
}

/** Draws the exam: weights inside the official ranges, slots per domain, questions spread across requirements. */
export function composeExam(catalog: Catalog, count: number, rng: Rng): Composition {
  const pools = poolsByDomain(catalog);
  const order = catalog.exam.domains.map((d) => d.id);
  const weights = sampleWeights(weightRanges(catalog), rng);
  const available = Object.fromEntries(order.map((id) => [id, pools[id]?.length ?? 0]));
  const plan = allocate(count, weights, available, order);
  const picked = order.flatMap((id) => pickSpread(pools[id] ?? [], plan[id] ?? 0, (q) => q.requirement, rng));
  return { weights, questionIds: shuffle(picked, rng).map((q) => q.id) };
}
