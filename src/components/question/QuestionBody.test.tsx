import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import type { Question } from '../../content/schema';
import type { Response } from '../../domain/grade';
import { I18nProvider } from '../../i18n/I18nProvider';
import { fillIn, matching, multi, single, yesNo } from '../../test/fixtures';
import { QuestionBody } from './QuestionBody';

function Harness({ question, reveal = false, initial }: { question: Question; reveal?: boolean; initial?: Response }) {
  const [response, setResponse] = useState<Response | undefined>(initial);
  return (
    <I18nProvider>
      <QuestionBody question={question} response={response} onChange={setResponse} reveal={reveal} allowClear />
      <output data-testid="response">{JSON.stringify(response ?? null)}</output>
    </I18nProvider>
  );
}

const value = () => JSON.parse(screen.getByTestId('response').textContent ?? 'null');

describe('QuestionBody', () => {
  it('selects and clears a single choice', async () => {
    const user = userEvent.setup();
    render(<Harness question={single('Q1')} />);
    await user.click(screen.getByRole('radio', { name: /option B/ }));
    expect(value()).toBe('B');
    await user.click(screen.getByRole('radio', { name: /option B/ }));
    expect(value()).toBeNull();
  });

  it('toggles multi-select options and shows the counter', async () => {
    const user = userEvent.setup();
    render(<Harness question={multi('Q1')} />);
    await user.click(screen.getByRole('checkbox', { name: /option E/ }));
    await user.click(screen.getByRole('checkbox', { name: /option B/ }));
    expect(value()).toEqual(['B', 'E']);
    expect(screen.getByText(/2 of 2 selected/)).toBeInTheDocument();
  });

  it('fills the blanks of a fill-in stem with the chosen option', async () => {
    const user = userEvent.setup();
    render(<Harness question={fillIn('Q1')} />);
    await user.click(screen.getByRole('radio', { name: /IaaS; SaaS/ }));
    expect(screen.getByText('IaaS')).toBeInTheDocument();
    expect(screen.getByText('SaaS')).toBeInTheDocument();
  });

  it('answers yes/no per statement', async () => {
    const user = userEvent.setup();
    render(<Harness question={yesNo('Q1')} />);
    const groups = screen.getAllByRole('radiogroup');
    await user.click(within(groups[0]!).getByRole('radio', { name: 'No' }));
    await user.click(within(groups[2]!).getByRole('radio', { name: 'Yes' }));
    expect(value()).toEqual({ '1': false, '3': true });
  });

  it('matches items with a labelled select', async () => {
    const user = userEvent.setup();
    render(<Harness question={matching('Q1')} />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'option 2 (en)' }), 'A');
    expect(value()).toEqual({ '2': 'A' });
  });

  it('locks inputs and marks right and wrong answers when revealed', () => {
    render(<Harness question={single('Q1')} reveal initial="A" />);
    const radios = screen.getAllByRole('radio');
    for (const radio of radios) expect(radio).toBeDisabled();
    expect(screen.getByRole('radio', { name: /option C/ }).closest('label')).toHaveAttribute('data-state', 'correct');
    expect(screen.getByRole('radio', { name: /option A/ }).closest('label')).toHaveAttribute('data-state', 'wrong');
  });
});
