import { createContext } from 'react';
import type { Lang } from '../content/schema';
import type { Messages } from './pt';

export interface I18n {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Messages;
}

export const I18nContext = createContext<I18n | null>(null);
