import type { Question } from '../../content/schema';
import type { Catalog } from '../../domain/catalog';
import { useI18n } from '../../i18n/useI18n';
import styles from './question.module.css';

function AiTag() {
  const { t } = useI18n();
  return (
    <li className={styles.tag} data-kind="ai" title={t.question.aiTitle}>
      <svg className={styles.aiIcon} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10 3 11.9 8.1 17 10l-5.1 1.9L10 17l-1.9-5.1L3 10l5.1-1.9L10 3Z" />
        <path d="M18 14l.9 2.1L21 17l-2.1.9L18 20l-.9-2.1L15 17l2.1-.9L18 14Z" />
      </svg>
      <span aria-hidden="true">{t.question.ai}</span>
      <span className="visually-hidden">{t.question.aiTitle}</span>
    </li>
  );
}

/** Tags and breadcrumb. `minimal` shows only the format (used during the exam, to avoid hints). */
export function QuestionMeta({ question, catalog, minimal = false }: { question: Question; catalog: Catalog; minimal?: boolean }) {
  const { l, t } = useI18n();
  const info = catalog.requirements.get(question.requirement);

  if (minimal) {
    return (
      <ul className={styles.meta}>
        <AiTag />
        <li className={styles.tag} data-kind="format">
          {t.formats[question.format]}
        </li>
      </ul>
    );
  }

  return (
    <>
      <ul className={styles.meta}>
        <AiTag />
        <li className={styles.tag} data-kind="id">
          {question.id}
        </li>
        <li className={styles.tag} data-kind="format">
          {t.formats[question.format]}
        </li>
        {info && <li className={styles.tag}>{l(info.domain.name)}</li>}
        <li className={styles.tag} data-kind={question.level === 'detail' ? 'detail' : undefined}>
          {t.levels[question.level]}
        </li>
        <li className={styles.tag} data-kind="subject">
          {question.subject}
        </li>
      </ul>
      {info && (
        <p className={styles.crumbs}>
          {l(info.section.name)} › {l(info.requirement.name)}
        </p>
      )}
    </>
  );
}
