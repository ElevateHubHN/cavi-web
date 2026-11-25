import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/archivo/700.css';
import '@fontsource/archivo/800.css';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/ibm-plex-mono/500.css';
import './index.css';
import { App } from './App';

const raiz = document.getElementById('root');
if (raiz) {
  createRoot(raiz).render(
    <StrictMode>
      <BrowserRouter basename="/panel">
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
}
