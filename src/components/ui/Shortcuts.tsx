import { useI18n } from '../../i18n/useI18n';
import styles from './ui.module.css';

export interface Shortcut {
  keys: string[];
  label: string;
}

export function Shortcuts({ shortcuts }: { shortcuts: Shortcut[] }) {
  const { t } = useI18n();
  return (
    <dl className={styles.shortcuts} aria-label={t.shortcuts.title}>
      {shortcuts.map((s) => (
        <div key={s.label}>
          <dt>
            {s.keys.map((k) => (
              <kbd key={k}>{k}</kbd>
            ))}
          </dt>
          <dd>{s.label}</dd>
        </div>
      ))}
    </dl>
  );
}
