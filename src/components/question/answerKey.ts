import type { Localized, Question } from '../../content/schema';

/** Human-readable answer key, one line per answer part. */
export function answerKeyLines(question: Question, l: (text: Localized) => string, yes: string, no: string): string[] {
  const option = (key: string | undefined) => {
    const found = 'options' in question ? question.options.find((o) => o.key === key) : undefined;
    return found ? l(found.text) : '';
  };
  switch (question.format) {
    case 'single-choice':
    case 'fill-in':
      return [`${question.answer} — ${option(question.answer)}`];
    case 'multi-select':
      return question.answer.map((k) => `${k} — ${option(k)}`);
    case 'yes-no':
      return question.statements.map((s) => `${s.key}: ${question.answer[s.key] ? yes : no}`);
    case 'matching':
      return question.items.map((i) => `${i.key} → ${question.answer[i.key]} — ${option(question.answer[i.key])}`);
  }
}
