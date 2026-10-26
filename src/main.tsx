import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { createRouter } from './app/router';
import { I18nProvider } from './i18n/I18nProvider';
import './styles/tokens.css';
import './styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('missing #root element');

createRoot(root).render(
  <StrictMode>
    <I18nProvider>
      <RouterProvider router={createRouter()} />
    </I18nProvider>
  </StrictMode>,
);
