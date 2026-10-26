import { useId, type Ref } from 'react';
import type { Choice, Question } from '../../content/schema';
import { asChoice, asChoices, asMatching, asYesNo, type Response } from '../../domain/grade';
import { useI18n } from '../../i18n/useI18n';
import styles from './question.module.css';

type OnChange = (response: Response | undefined) => void;

interface QuestionBodyProps {
  question: Question;
  response: Response | undefined;
  /** Omit for a read-only view. */
  onChange?: OnChange;
  /** Highlights right and wrong answers and locks the inputs. */
  reveal?: boolean;
  /** Clicking the selected single-choice option again clears it. */
  allowClear?: boolean;
  stemRef?: Ref<HTMLParagraphElement>;
}

export function QuestionBody({ question, response, onChange, reveal = false, allowClear = false, stemRef }: QuestionBodyProps) {
  const readOnly = reveal || !onChange;
  const change: OnChange = (r) => {
    if (!readOnly) onChange?.(r);
  };

  return (
    <>
      <Stem question={question} response={response} reveal={reveal} stemRef={stemRef} />
      {question.format === 'yes-no' ? (
        <YesNoTable question={question} response={response} onChange={change} readOnly={readOnly} reveal={reveal} />
      ) : question.format === 'matching' ? (
        <MatchingTable question={question} response={response} onChange={change} readOnly={readOnly} reveal={reveal} />
      ) : (
        <ChoiceOptions question={question} response={response} onChange={change} readOnly={readOnly} reveal={reveal} allowClear={allowClear} />
      )}
    </>
  );
}

function Stem({ question, response, reveal, stemRef }: { question: Question; response: Response | undefined; reveal: boolean; stemRef?: Ref<HTMLParagraphElement> }) {
  const { l, t } = useI18n();
  const text = l(question.stem);
  if (question.format !== 'fill-in') {
    return (
      <p className={styles.stem} ref={stemRef} tabIndex={-1}>
        {text}
      </p>
    );
  }

  const parts = text.split(/_{3,}/);
  const blanks = parts.length - 1;
  const key = reveal ? question.answer : asChoice(response);
  const chosen = question.options.find((o) => o.key === key);
  const pieces = chosen ? l(chosen.text).split(';').map((s) => s.trim()) : [];
  const fills = blanks > 1 && pieces.length === blanks ? pieces : chosen ? [l(chosen.text)] : [];

  return (
    <p className={styles.stem} ref={stemRef} tabIndex={-1}>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < blanks &&
            (fills[i] ? (
              <span className={styles.blank}>{fills[i]}</span>
            ) : (
              <span className={styles.blank}>
                <span className="visually-hidden">({t.question.blank})</span>
                {'\u00a0'}
              </span>
            ))}
        </span>
      ))}
    </p>
  );
}

interface PartProps<Q extends Question['format']> {
  question: Extract<Question, { format: Q }>;
  response: Response | undefined;
  onChange: OnChange;
  readOnly: boolean;
  reveal: boolean;
}

function ChoiceOptions({
  question,
  response,
  onChange,
  readOnly,
  reveal,
  allowClear,
}: PartProps<'single-choice' | 'fill-in' | 'multi-select'> & { allowClear: boolean }) {
  const { l, t } = useI18n();
  const name = useId();
  const multi = question.format === 'multi-select';
  const selected = multi ? asChoices(response) : [asChoice(response)].filter((k): k is string => k !== undefined);
  const answers: string[] = multi ? question.answer : [question.answer];

  const state = (key: string) => {
    if (reveal) {
      if (answers.includes(key)) return 'correct';
      if (selected.includes(key)) return 'wrong';
      return undefined;
    }
    return selected.includes(key) ? 'selected' : undefined;
  };

  const toggle = (key: string) => {
    if (!multi) return onChange(key);
    const next = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key].sort();
    onChange(next.length ? next : undefined);
  };

  return (
    <fieldset className={styles.options} disabled={readOnly}>
      <legend className="visually-hidden">{t.question.options}</legend>
      {question.format === 'multi-select' && (
        <p className={styles.hint}>
          {t.question.choose(question.answer.length)}
          {!reveal && ` ${t.question.selected(selected.length, question.answer.length)}`}
        </p>
      )}
      {question.options.map((option: Choice) => (
        <label key={option.key} className={styles.option} data-kind={multi ? 'checkbox' : 'radio'} data-state={state(option.key)}>
          <input
            className="visually-hidden"
            type={multi ? 'checkbox' : 'radio'}
            name={name}
            value={option.key}
            checked={selected.includes(option.key)}
            onChange={() => toggle(option.key)}
            onClick={() => {
              if (!multi && allowClear && selected.includes(option.key)) onChange(undefined);
            }}
          />
          <span className={styles.key} aria-hidden="true">
            {option.key}
          </span>
          <span>
            <span className="visually-hidden">{option.key}. </span>
            {l(option.text)}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function YesNoTable({ question, response, onChange, readOnly, reveal }: PartProps<'yes-no'>) {
  const { l, t } = useI18n();
  const uid = useId();
  const r = asYesNo(response);

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">
            <span className="visually-hidden">#</span>
          </th>
          <th scope="col">{t.question.statement}</th>
          <th scope="col">
            {t.question.yes} / {t.question.no}
          </th>
        </tr>
      </thead>
      <tbody>
        {question.statements.map((s) => {
          const labelId = `${uid}-${s.key}`;
          const given = r[s.key];
          const rowState = reveal && given !== undefined ? (given === question.answer[s.key] ? 'correct' : 'wrong') : undefined;
          return (
            <tr key={s.key} data-state={rowState}>
              <td className={styles.n}>{s.key}</td>
              <td id={labelId}>{l(s.text)}</td>
              <td className={styles.control}>
                <div className={styles.yesNo} role="radiogroup" aria-labelledby={labelId}>
                  {[true, false].map((value) => (
                    <label key={String(value)} className={styles.yesNoOption} data-answer={reveal && question.answer[s.key] === value}>
                      <input
                        className="visually-hidden"
                        type="radio"
                        name={`${uid}-${s.key}`}
                        checked={given === value}
                        disabled={readOnly}
                        onChange={() => onChange({ ...r, [s.key]: value })}
                      />
                      {value ? t.question.yes : t.question.no}
                    </label>
                  ))}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function MatchingTable({ question, response, onChange, readOnly, reveal }: PartProps<'matching'>) {
  const { l, t } = useI18n();
  const uid = useId();
  const r = asMatching(response);
  const optionText = (key: string | undefined) => {
    const option = question.options.find((o) => o.key === key);
    return option ? `${option.key} — ${l(option.text)}` : '';
  };

  return (
    <>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">
              <span className="visually-hidden">#</span>
            </th>
            <th scope="col">{t.question.item}</th>
            <th scope="col">{t.explanation.answer}</th>
          </tr>
        </thead>
        <tbody>
          {question.items.map((item) => {
            const labelId = `${uid}-${item.key}`;
            const given = r[item.key];
            const rowState = reveal && given ? (given === question.answer[item.key] ? 'correct' : 'wrong') : undefined;
            return (
              <tr key={item.key} data-state={rowState}>
                <td className={styles.n}>{item.key}</td>
                <td id={labelId}>{l(item.text)}</td>
                <td className={styles.control}>
                  <select
                    className={styles.select}
                    aria-labelledby={labelId}
                    value={given ?? ''}
                    disabled={readOnly}
                    onChange={(e) => {
                      const next = { ...r };
                      if (e.target.value) next[item.key] = e.target.value;
                      else delete next[item.key];
                      onChange(Object.keys(next).length ? next : undefined);
                    }}
                  >
                    <option value="">{t.question.pick}</option>
                    {question.options.map((o) => (
                      <option key={o.key} value={o.key}>
                        {optionText(o.key)}
                      </option>
                    ))}
                  </select>
                  {reveal && (
                    <span className={styles.matchAnswer}>
                      <span aria-hidden="true">✓ </span>
                      {t.question.correctAnswer(optionText(question.answer[item.key]))}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className={styles.legend}>
        <h3>{t.question.options}</h3>
        <ul>
          {question.options.map((o) => (
            <li key={o.key}>
              <b>{o.key}</b>
              {l(o.text)}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
