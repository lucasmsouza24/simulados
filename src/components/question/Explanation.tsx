import type { Question } from '../../content/schema';
import { grade, isAnswered, type Response } from '../../domain/grade';
import { useI18n } from '../../i18n/useI18n';
import { learnUrl } from '../../lib/links';
import { answerKeyLines } from './answerKey';
import styles from './question.module.css';

export function Explanation({ question }: { question: Question }) {
  const { l, t, lang } = useI18n();
  const href = learnUrl(question.learnUrl, lang);

  return (
    <div className={styles.explain}>
      <section>
        <h3>{t.explanation.answer}</h3>
        {answerKeyLines(question, l, t.question.yes, t.question.no).map((line) => (
          <p key={line} className={styles.answerKey}>
            {line}
          </p>
        ))}
      </section>
      <section>
        <h3>{t.explanation.why}</h3>
        <p>{l(question.explanation)}</p>
      </section>
      <section>
        <h3>{t.explanation.traps}</h3>
        <p>{l(question.distractors)}</p>
      </section>
      {href && (
        <section>
          <h3>{t.explanation.learn}</h3>
          <p>
            <a className={styles.learnLink} href={href} target="_blank" rel="noopener noreferrer">
              {href}
            </a>
          </p>
        </section>
      )}
    </div>
  );
}

/** "graded" compares with the response; otherwise the answer was only revealed. */
export function Verdict({ question, response, graded }: { question: Question; response: Response | undefined; graded: boolean }) {
  const { t } = useI18n();
  if (!graded) {
    return (
      <p className={styles.verdict} data-tone="neutral">
        {t.verdict.revealed}
      </p>
    );
  }
  if (!isAnswered(question, response)) {
    return (
      <p className={styles.verdict} data-tone="bad">
        {t.verdict.blank}
      </p>
    );
  }
  const g = grade(question, response);
  const text = g.correct ? t.verdict.correct : g.total ? t.verdict.partial(g.right ?? 0, g.total) : t.verdict.incorrect;
  return (
    <p className={styles.verdict} data-tone={g.correct ? 'ok' : 'bad'}>
      {text}
    </p>
  );
}
