import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './global.css';
import App from './App';
import { captureInstallPrompt } from './lib/install';

// Android 的安裝事件可能很早就送出，要在 React 掛載前開始接收
captureInstallPrompt();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
