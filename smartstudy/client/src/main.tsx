import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App';
import { AppProvider } from './context/AppContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
        <Toaster
          theme="dark"
          position="bottom-right"
          richColors
          toastOptions={{ style: { background: 'rgba(17,17,29,.92)', border: '1px solid rgba(255,255,255,.1)', backdropFilter: 'blur(16px)' } }}
        />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
