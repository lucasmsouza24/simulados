import { data, type LoaderFunctionArgs } from 'react-router';
import { BundleSchema } from '../content/schema';
import { buildCatalog, type Catalog } from '../domain/catalog';

export const DEFAULT_EXAM = 'az-900';
const EXAM_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const cache = new Map<string, Promise<Catalog>>();

async function fetchCatalog(examId: string): Promise<Catalog> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${examId}.json`);
  if (res.status === 404) throw data('exam not found', { status: 404 });
  if (!res.ok) throw new Error(`failed to load exam ${examId}: HTTP ${res.status}`);
  const bundle = BundleSchema.parse(await res.json());
  return buildCatalog(bundle);
}

/** Loads and validates one exam; the id is checked before it reaches a URL. */
export function loadCatalog(examId: string | undefined): Promise<Catalog> {
  if (!examId || !EXAM_ID.test(examId)) return Promise.reject(data('exam not found', { status: 404 }));
  let pending = cache.get(examId);
  if (!pending) {
    pending = fetchCatalog(examId);
    cache.set(examId, pending);
    pending.catch(() => cache.delete(examId));
  }
  return pending;
}

export const examLoader = ({ params }: LoaderFunctionArgs) => loadCatalog(params.examId);
