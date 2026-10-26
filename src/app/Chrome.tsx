import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { LANGS } from '../content/schema';
import { useI18n } from '../i18n/useI18n';
import styles from './layout.module.css';

const REPOSITORY_URL = 'https://github.com/lucasmsouza24/simulados';

export function SiteHeader({ home, subtitle, children }: { home: string; subtitle?: string; children?: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  return (
    <header className={styles.header}>
      <Link to={home} className={styles.brand}>
        {t.appName}
        {subtitle && <small>{subtitle}</small>}
      </Link>
      {children}
      <div className={styles.right}>
        <div className={styles.lang} role="group" aria-label={t.language}>
          {LANGS.map((code) => (
            <button key={code} type="button" lang={code} aria-pressed={lang === code} onClick={() => setLang(code)}>
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className={styles.footer}>
      <p>{t.footer.disclaimer}</p>
      <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
        {t.footer.source}
      </a>
    </footer>
  );
}

export function Message({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <main id="main" className={styles.message} tabIndex={-1}>
      <h1>{title}</h1>
      <p>{text}</p>
      {action}
    </main>
  );
}
