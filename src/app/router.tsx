import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { DEFAULT_EXAM, examLoader } from '../data/api';
import { BankPage } from '../features/bank/BankPage';
import { ExamPage } from '../features/exam/ExamPage';
import { AppLayout } from './AppLayout';
import { ExamLayout } from './ExamLayout';
import { LoadingPage, NotFoundPage, RouteErrorPage } from './pages';

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to={`/${DEFAULT_EXAM}`} replace /> },
      {
        path: ':examId',
        loader: examLoader,
        element: <ExamLayout />,
        errorElement: <RouteErrorPage />,
        hydrateFallbackElement: <LoadingPage />,
        children: [
          { index: true, element: <ExamPage /> },
          { path: 'questoes', element: <BankPage /> },
          { path: 'questoes/:questionId', element: <BankPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const createRouter = () => createBrowserRouter(routes);
