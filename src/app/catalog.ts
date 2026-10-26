import { createContext, use } from 'react';
import type { Catalog } from '../domain/catalog';

export const CatalogContext = createContext<Catalog | null>(null);

export function useCatalog(): Catalog {
  const catalog = use(CatalogContext);
  if (!catalog) throw new Error('useCatalog must be used inside an exam route');
  return catalog;
}
