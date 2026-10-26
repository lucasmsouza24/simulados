import { useEffect, useState, type ReactNode } from 'react';
import { z } from 'zod';
import { LANGS, type Lang } from '../content/schema';
import { readStorage, writeStorage } from '../lib/storage';
import { I18nContext } from './context';
import { en } from './en';
import { pt, type Messages } from './pt';

const MESSAGES: Record<Lang, Messages> = { pt, en };
const LangSchema = z.enum(LANGS);

function initialLang(): Lang {
  const stored = readStorage('lang', LangSchema);
  if (stored) return stored;
  return navigator.language?.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
    writeStorage('lang', lang);
  }, [lang]);

  return <I18nContext value={{ lang, setLang, t: MESSAGES[lang] }}>{children}</I18nContext>;
}
