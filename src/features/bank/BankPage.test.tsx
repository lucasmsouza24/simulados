import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { matching, multi, single, yesNo } from '../../test/fixtures';
import { renderRoutes } from '../../test/render';

const questions = [single('N-1', 'N01'), multi('N-2', 'N02'), yesNo('A-1', 'A01'), matching('G-1', 'G01')];

describe('BankPage', () => {
  it('lists every question and opens the first one', async () => {
    renderRoutes(questions, '/test-exam/questoes');
    expect(await screen.findByText('4 of 4 questions')).toBeInTheDocument();
    expect(screen.getByText('stem N-1 (en)')).toBeInTheDocument();
  });

  it('filters by format through the URL', async () => {
    const { user, router } = renderRoutes(questions, '/test-exam/questoes');
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Format' }), 'yes-no');
    expect(await screen.findByText('1 of 4 questions')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?formato=yes-no');
    expect(screen.getByText('stem A-1 (en)')).toBeInTheDocument();
  });

  it('checks an answer and records it in the list', async () => {
    const { user } = renderRoutes(questions, '/test-exam/questoes/N-1');
    await user.click(await screen.findByRole('radio', { name: /option C/ }));
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText('Correct!')).toBeInTheDocument();
    expect(screen.getByText('Explanation')).toBeInTheDocument();
    const list = screen.getByRole('navigation', { name: 'Question list' });
    expect(within(list).getByText('(correct)')).toBeInTheDocument();
  });

  it('opens a question from a direct link', async () => {
    renderRoutes(questions, '/test-exam/questoes/G-1');
    expect(await screen.findByText('stem G-1 (en)')).toBeInTheDocument();
  });

  it('hides the bank while an exam is running', async () => {
    const { user, router } = renderRoutes(questions, '/test-exam');
    await user.click(await screen.findByRole('button', { name: 'Start exam' }));
    expect(screen.queryByRole('link', { name: 'Questions' })).not.toBeInTheDocument();

    await router.navigate('/test-exam/questoes');
    await waitFor(() => expect(router.state.location.pathname).toBe('/test-exam'));
    expect(await screen.findByText(/Question 1 of/)).toBeInTheDocument();
  });
});
