import { use } from 'react';
import type { Localized } from '../content/schema';
import { I18nContext, type I18n } from './context';

export function useI18n(): I18n & { l: (text: Localized) => string } {
  const ctx = use(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return { ...ctx, l: (text) => text[ctx.lang] };
}
