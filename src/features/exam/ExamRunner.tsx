import { useEffect, useRef, useState } from 'react';
import { useCatalog } from '../../app/catalog';
import { QuestionBody } from '../../components/question/QuestionBody';
import { QuestionMeta } from '../../components/question/QuestionMeta';
import { Button, ToggleChip } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Dialog } from '../../components/ui/Dialog';
import { Shortcuts } from '../../components/ui/Shortcuts';
import { CONFIDENCE } from '../../domain/export';
import { asChoices, isAnswered } from '../../domain/grade';
import { useHotkeys } from '../../hooks/useHotkeys';
import { useI18n } from '../../i18n/useI18n';
import type { ExamSession } from './session';
import { useExamSession } from './sessionContext';
import styles from './exam.module.css';

export function ExamRunner({ session }: { session: ExamSession }) {
  const catalog = useCatalog();
  const { t } = useI18n();
  const { answer, setConfidence, toggleFlag, goTo, finish, discard } = useExamSession();
  const [dialog, setDialog] = useState<'finish' | 'giveUp' | null>(null);
  const stemRef = useRef<HTMLParagraphElement>(null);
  const firstRender = useRef(true);

  const questions = session.questionIds.flatMap((id) => catalog.byId.get(id) ?? []);
  const total = questions.length;
  const index = Math.min(session.current, total - 1);
  const question = questions[index];
  const current = question ? (session.answers[question.id] ?? {}) : {};

  const answered = questions.filter((q) => isAnswered(q, session.answers[q.id]?.response));
  const blanks = questions.map((q, i) => ({ q, i })).filter(({ q }) => !isAnswered(q, session.answers[q.id]?.response));
  const flagged = questions.map((q, i) => ({ q, i })).filter(({ q }) => session.answers[q.id]?.flagged);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    stemRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [index]);

  const go = (i: number) => {
    if (i >= 0 && i < total) goTo(i);
  };

  const pickByKey = (key: string) => {
    if (!question) return;
    if (question.format === 'multi-select') {
      if (!question.options.some((o) => o.key === key)) return;
      const selected = asChoices(current.response);
      const next = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key].sort();
      answer(question.id, next.length ? next : undefined);
    } else if (question.format === 'single-choice' || question.format === 'fill-in') {
      if (!question.options.some((o) => o.key === key)) return;
      answer(question.id, current.response === key ? undefined : key);
    }
  };

  useHotkeys({
    ArrowLeft: () => go(index - 1),
    ArrowRight: () => go(index + 1),
    a: () => pickByKey('A'),
    b: () => pickByKey('B'),
    c: () => pickByKey('C'),
    d: () => pickByKey('D'),
    e: () => pickByKey('E'),
    m: () => question && toggleFlag(question.id),
  });

  if (!question) return null;

  const jump = (i: number) => {
    setDialog(null);
    go(i);
  };

  return (
    <div className={styles.page}>
      <h1 className="visually-hidden">{t.exam.title}</h1>
      <div className={styles.bar}>
        <p className={styles.barInfo}>
          <strong>{t.exam.progress(index + 1, total)}</strong> · {t.exam.answered(answered.length, total)}
        </p>
        <Button
          variant="ghost"
          className={current.flagged ? styles.flagged : undefined}
          aria-pressed={Boolean(current.flagged)}
          onClick={() => toggleFlag(question.id)}
        >
          ⚑ {current.flagged ? t.exam.flagged : t.exam.flag}
        </Button>
        <Button variant="danger" onClick={() => setDialog('giveUp')}>
          {t.exam.giveUp}
        </Button>
        <Button onClick={() => setDialog('finish')}>{t.exam.finish}</Button>
      </div>
      <progress className={styles.progress} max={total} value={answered.length} aria-label={t.exam.answered(answered.length, total)} />

      <Card aria-label={t.exam.progress(index + 1, total)}>
        <QuestionMeta question={question} catalog={catalog} minimal />
        <QuestionBody
          key={question.id}
          question={question}
          response={current.response}
          onChange={(r) => answer(question.id, r)}
          allowClear
          stemRef={stemRef}
        />
        {session.config.askConfidence && (
          <div className={styles.confidence} role="group" aria-labelledby={`conf-${question.id}`}>
            <span className={styles.confidenceLabel} id={`conf-${question.id}`}>
              {t.exam.confidence}
            </span>
            {CONFIDENCE.map((c) => (
              <ToggleChip
                key={c}
                pressed={current.confidence === c}
                onToggle={() => setConfidence(question.id, current.confidence === c ? undefined : c)}
              >
                {t.exam.conf[c]}
              </ToggleChip>
            ))}
          </div>
        )}
      </Card>

      <div className={styles.pager}>
        <Button variant="ghost" disabled={index === 0} onClick={() => go(index - 1)}>
          {t.pager.prev}
        </Button>
        <span>{t.pager.position(index + 1, total)}</span>
        <Button variant="ghost" disabled={index >= total - 1} onClick={() => go(index + 1)}>
          {t.pager.next}
        </Button>
      </div>

      <nav aria-label={t.exam.grid}>
        <ol className={styles.grid}>
          {questions.map((q, i) => {
            const isDone = isAnswered(q, session.answers[q.id]?.response);
            const isFlagged = Boolean(session.answers[q.id]?.flagged);
            return (
              <li key={q.id}>
                <button
                  type="button"
                  className={styles.gridButton}
                  data-answered={isDone}
                  data-flagged={isFlagged}
                  aria-current={i === index ? 'step' : undefined}
                  aria-label={t.exam.gridItem(i + 1, isDone, isFlagged)}
                  onClick={() => go(i)}
                >
                  {i + 1}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      <ul className={styles.legend} aria-hidden="true">
        <li>
          <span className={styles.swatch} data-kind="answered" /> {t.exam.legend.answered}
        </li>
        <li>
          <span className={styles.swatch} data-kind="flagged" /> {t.exam.legend.flagged}
        </li>
        <li>
          <span className={styles.swatch} data-kind="current" /> {t.exam.legend.current}
        </li>
      </ul>
      <Shortcuts
        shortcuts={[
          { keys: ['←', '→'], label: t.shortcuts.navigate },
          { keys: ['A–E'], label: t.shortcuts.pick },
          { keys: ['M'], label: t.shortcuts.flag },
        ]}
      />

      <Dialog
        open={dialog === 'finish'}
        title={t.exam.finishTitle}
        onClose={() => setDialog(null)}
        actions={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              {t.exam.keepGoing}
            </Button>
            <Button onClick={finish}>{t.exam.confirmFinish}</Button>
          </>
        }
      >
        {blanks.length === 0 && flagged.length === 0 && <p>{t.exam.finishAll}</p>}
        {blanks.length > 0 && <JumpList label={t.exam.finishBlank(blanks.length)} items={blanks} onJump={jump} />}
        {flagged.length > 0 && <JumpList label={t.exam.finishFlagged(flagged.length)} items={flagged} onJump={jump} />}
      </Dialog>

      <Dialog
        open={dialog === 'giveUp'}
        title={t.exam.giveUpTitle}
        onClose={() => setDialog(null)}
        actions={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              {t.exam.keepGoing}
            </Button>
            <Button variant="danger" onClick={discard}>
              {t.exam.confirmGiveUp}
            </Button>
          </>
        }
      >
        <p>{t.exam.giveUpText}</p>
      </Dialog>
    </div>
  );
}

function JumpList({ label, items, onJump }: { label: string; items: { i: number }[]; onJump: (i: number) => void }) {
  const { t } = useI18n();
  return (
    <>
      <p>{label}</p>
      <ul className={styles.jumpList}>
        {items.map(({ i }) => (
          <li key={i}>
            <Button variant="ghost" size="small" aria-label={t.exam.goTo(i + 1)} onClick={() => onJump(i)}>
              {i + 1}
            </Button>
          </li>
        ))}
      </ul>
    </>
  );
}
