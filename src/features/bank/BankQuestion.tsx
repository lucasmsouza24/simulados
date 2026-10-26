import { useImperativeHandle, type Ref } from 'react';
import { useCatalog } from '../../app/catalog';
import { Explanation, Verdict } from '../../components/question/Explanation';
import { QuestionBody } from '../../components/question/QuestionBody';
import { QuestionMeta } from '../../components/question/QuestionMeta';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import type { Question } from '../../content/schema';
import { asChoices, grade, isComplete, type Response } from '../../domain/grade';
import { useI18n } from '../../i18n/useI18n';
import { useBankProgress } from './bankProgress';
import styles from './bank.module.css';

export interface BankQuestionHandle {
  pick: (key: string) => void;
  check: () => void;
  reveal: () => void;
}

export function BankQuestion({ question, study, ref }: { question: Question; study: boolean; ref?: Ref<BankQuestionHandle> }) {
  const catalog = useCatalog();
  const { t } = useI18n();
  const { entries, update, reset } = useBankProgress();
  const entry = entries[question.id] ?? {};
  const shown = study || Boolean(entry.checked || entry.revealed);
  const canCheck = !shown && isComplete(question, entry.response);

  const respond = (response: Response | undefined) => {
    if (!shown) update(question.id, { response });
  };
  const check = () => {
    if (canCheck) update(question.id, { checked: true, correct: grade(question, entry.response).correct });
  };
  const reveal = () => {
    if (!shown) update(question.id, { revealed: true });
  };

  useImperativeHandle(ref, () => ({
    pick: (key) => {
      if (shown) return;
      if (question.format === 'multi-select' && question.options.some((o) => o.key === key)) {
        const selected = asChoices(entry.response);
        const next = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key].sort();
        respond(next.length ? next : undefined);
      } else if ((question.format === 'single-choice' || question.format === 'fill-in') && question.options.some((o) => o.key === key)) {
        respond(key);
      }
    },
    check,
    reveal,
  }));

  return (
    <Card>
      <QuestionMeta question={question} catalog={catalog} />
      <QuestionBody question={question} response={entry.response} onChange={respond} reveal={shown} />
      <div className={styles.actions}>
        {!shown && (
          <>
            <Button disabled={!canCheck} onClick={check}>
              {t.bank.check}
            </Button>
            <Button variant="ghost" onClick={reveal}>
              {t.bank.reveal}
            </Button>
          </>
        )}
        {!study && (entry.checked || entry.revealed) && (
          <Button variant="ghost" onClick={() => reset(question.id)}>
            {t.bank.retry}
          </Button>
        )}
      </div>
      <div aria-live="polite">{shown && <Verdict question={question} response={entry.response} graded={Boolean(entry.checked)} />}</div>
      {shown && <Explanation question={question} />}
    </Card>
  );
}
