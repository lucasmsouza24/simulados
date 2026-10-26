import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { Question } from '../content/schema';
import { CatalogContext } from '../app/catalog';
import { ExamLayout } from '../app/ExamLayout';
import { BankPage } from '../features/bank/BankPage';
import { BankProgressProvider } from '../features/bank/BankProgressProvider';
import { ExamPage } from '../features/exam/ExamPage';
import { ExamSessionProvider } from '../features/exam/ExamSessionProvider';
import { I18nProvider } from '../i18n/I18nProvider';
import { makeCatalog } from './fixtures';

/** Renders inside the providers an exam route has, without the router. */
export function renderInExam(ui: ReactNode, questions: Question[]) {
  const catalog = makeCatalog(questions);
  return {
    user: userEvent.setup(),
    catalog,
    ...render(
      <I18nProvider>
        <CatalogContext value={catalog}>
          <ExamSessionProvider catalog={catalog}>
            <BankProgressProvider>{ui}</BankProgressProvider>
          </ExamSessionProvider>
        </CatalogContext>
      </I18nProvider>,
    ),
  };
}

/** Full exam routes over an in-memory router and fixture content. */
export function renderRoutes(questions: Question[], initialPath: string) {
  const catalog = makeCatalog(questions);
  const router = createMemoryRouter(
    [
      {
        path: ':examId',
        loader: () => catalog,
        element: <ExamLayout />,
        children: [
          { index: true, element: <ExamPage /> },
          { path: 'questoes', element: <BankPage /> },
          { path: 'questoes/:questionId', element: <BankPage /> },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  );
  return {
    user: userEvent.setup(),
    router,
    catalog,
    ...render(
      <I18nProvider>
        <RouterProvider router={router} />
      </I18nProvider>,
    ),
  };
}
