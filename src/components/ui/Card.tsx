import type { HTMLAttributes, ReactNode } from 'react';
import styles from './ui.module.css';

export function Card({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return <section className={[styles.card, className].filter(Boolean).join(' ')} {...rest} />;
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <p className={styles.notice} role="note">
      {children}
    </p>
  );
}

export type Tone = 'ok' | 'partial' | 'bad' | 'neutral';

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={styles.badge} data-tone={tone}>
      {children}
    </span>
  );
}
