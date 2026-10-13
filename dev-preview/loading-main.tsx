import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import { LoadingScreen } from '@/app/components/shared/LoadingScreen';
import '@/styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider attribute='class' defaultTheme='dark' enableSystem={true} storageKey='theme'>
      <LoadingScreen />
    </ThemeProvider>
  </React.StrictMode>,
);
