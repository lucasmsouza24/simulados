export type Rng = () => number;

/** Deterministic generator for tests (mulberry32). */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export type WeightRanges = ReadonlyArray<{ id: string; range: readonly [number, number] }>;

export const midWeights = (ranges: WeightRanges): Record<string, number> =>
  Object.fromEntries(ranges.map(({ id, range }) => [id, (range[0] + range[1]) / 2]));

/**
 * Draws one weight per domain, uniformly inside each range, adding up to 100.
 * All domains but the last are drawn; the last takes the remainder and the draw is retried until it fits its range.
 */
export function sampleWeights(ranges: WeightRanges, rng: Rng, maxTries = 10_000): Record<string, number> {
  if (ranges.length === 0) return {};
  const last = ranges[ranges.length - 1]!;
  const head = ranges.slice(0, -1);
  for (let attempt = 0; attempt < maxTries; attempt++) {
    const drawn = head.map(({ id, range: [lo, hi] }) => [id, lo + rng() * (hi - lo)] as const);
    const rest = 100 - drawn.reduce((s, [, w]) => s + w, 0);
    if (rest >= last.range[0] && rest <= last.range[1]) return Object.fromEntries([...drawn, [last.id, rest]]);
  }
  return midWeights(ranges);
}

/**
 * Splits `total` slots across domains proportionally to `weights` (largest remainder),
 * never exceeding what each domain has available; leftovers flow to the domains that still have room.
 */
export function allocate(
  total: number,
  weights: Record<string, number>,
  available: Record<string, number>,
  order: readonly string[],
): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(order.map((id) => [id, 0]));
  let remaining = Math.min(total, order.reduce((s, id) => s + (available[id] ?? 0), 0));
  let open = order.filter((id) => (available[id] ?? 0) > 0 && (weights[id] ?? 0) > 0);
  if (open.length === 0) open = order.filter((id) => (available[id] ?? 0) > 0);

  while (remaining > 0 && open.length > 0) {
    const weightSum = open.reduce((s, id) => s + (weights[id] || 1), 0);
    const shares = open.map((id) => {
      const raw = (remaining * (weights[id] || 1)) / weightSum;
      return { id, n: Math.floor(raw), frac: raw - Math.floor(raw) };
    });
    let left = remaining - shares.reduce((s, x) => s + x.n, 0);
    for (const s of [...shares].sort((x, y) => y.frac - x.frac)) {
      if (left === 0) break;
      s.n++;
      left--;
    }
    remaining = 0;
    for (const s of shares) {
      const room = (available[s.id] ?? 0) - (counts[s.id] ?? 0);
      const take = Math.min(s.n, room);
      counts[s.id] = (counts[s.id] ?? 0) + take;
      remaining += s.n - take;
    }
    open = open.filter((id) => (counts[id] ?? 0) < (available[id] ?? 0));
  }
  return counts;
}

/** Picks `n` items rotating across groups (in random order) so the selection covers as many groups as possible. */
export function pickSpread<T>(pool: readonly T[], n: number, groupOf: (item: T) => string, rng: Rng): T[] {
  const groups = new Map<string, T[]>();
  for (const item of shuffle(pool, rng)) {
    const key = groupOf(item);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  const queues = shuffle([...groups.values()], rng);
  const out: T[] = [];
  while (out.length < n && queues.some((q) => q.length > 0)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next !== undefined && out.length < n) out.push(next);
    }
  }
  return out;
}
