import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app/App';
import { AppProviders } from './app/providers/AppProviders';
import { syncService } from './offline';
import './styles/index.css';

registerSW({ immediate: true });

window.addEventListener('online', () => {
  void syncService.synchronize();
});

const root = document.getElementById('root');
if (!root) throw new Error('Élément #root introuvable.');

createRoot(root).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
