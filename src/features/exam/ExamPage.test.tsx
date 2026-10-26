import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { single, yesNo } from '../../test/fixtures';
import { renderInExam } from '../../test/render';
import { ExamPage } from './ExamPage';

const questions = [
  single('N-1', 'N01'),
  single('N-2', 'N02'),
  yesNo('A-1', 'A01'),
  single('A-2', 'A01'),
  single('G-1', 'G01'),
  single('G-2', 'G01'),
];

const stored = () => JSON.parse(localStorage.getItem('simulados:v1:exam:test-exam') ?? 'null');

describe('ExamPage', () => {
  it('runs an exam from setup to results', async () => {
    const { user } = renderInExam(<ExamPage />, questions);

    expect(screen.getByRole('heading', { name: 'Practice exam' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Start exam' }));

    expect(screen.getByText('Question 1 of 4')).toBeInTheDocument();
    expect(stored()).toMatchObject({ status: 'running', questionIds: expect.any(Array) });

    const session = stored();
    const first = session.questionIds[0] as string;
    if (first === 'A-1') {
      const [s1, s2, s3] = screen.getAllByRole('radiogroup');
      await user.click(within(s1!).getByRole('radio', { name: 'No' }));
      await user.click(within(s2!).getByRole('radio', { name: 'Yes' }));
      await user.click(within(s3!).getByRole('radio', { name: 'Yes' }));
    } else {
      await user.click(screen.getByRole('radio', { name: /option C/ }));
    }
    expect(screen.getByText(/1 of 4 answered/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Finish' }));
    const dialog = screen.getByRole('dialog', { name: 'Finish the exam?' });
    expect(within(dialog).getByText('3 unanswered questions:')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Finish' }));

    expect(screen.getByRole('heading', { name: 'Exam result' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All (4)' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Wrong (3)' })).toBeInTheDocument();
    expect(stored()).toMatchObject({ status: 'done' });
  });

  it('flags a question and gives up', async () => {
    const { user } = renderInExam(<ExamPage />, questions);
    await user.click(screen.getByRole('button', { name: 'Start exam' }));

    await user.click(screen.getByRole('button', { name: /Mark for review/ }));
    expect(screen.getByRole('button', { name: /Marked for review/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Question 1, marked for review' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Give up' }));
    const dialog = screen.getByRole('dialog', { name: 'Give up this exam?' });
    await user.click(within(dialog).getByRole('button', { name: 'Give up' }));

    expect(screen.getByRole('button', { name: 'Start exam' })).toBeInTheDocument();
    expect(stored()).toBeNull();
  });

  it('discards tampered storage instead of crashing', () => {
    localStorage.setItem('simulados:v1:exam:test-exam', JSON.stringify({ version: 1, status: 'running', questionIds: 'nope' }));
    renderInExam(<ExamPage />, questions);
    expect(screen.getByRole('button', { name: 'Start exam' })).toBeInTheDocument();
    expect(localStorage.getItem('simulados:v1:exam:test-exam')).toBeNull();
  });

  it('finishes an expired exam when the page opens', () => {
    const now = Date.now();
    localStorage.setItem(
      'simulados:v1:exam:test-exam',
      JSON.stringify({
        version: 1,
        examId: 'test-exam',
        status: 'running',
        config: { count: 4, minutes: 1, askConfidence: true },
        weights: {},
        questionIds: ['N-1', 'A-2'],
        answers: { 'N-1': { response: 'C' } },
        current: 0,
        startedAt: now - 120_000,
        endsAt: now - 60_000,
      }),
    );
    renderInExam(<ExamPage />, questions);
    expect(screen.getByRole('heading', { name: 'Exam result' })).toBeInTheDocument();
    expect(screen.getByText('Time ran out and the exam was finished.')).toBeInTheDocument();
  });
});
