import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminApiClientContext } from './api/apiClientContext';
import { createAdminApiClient } from './api/client';
import { ToastProvider } from './components/Toast';
import { App } from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
    mutations: { retry: 0 },
  },
});

const apiClient = createAdminApiClient('');  // Empty baseUrl: uses relative paths (proxied by Vite / served by FastAPI)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AdminApiClientContext.Provider value={apiClient}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AdminApiClientContext.Provider>
    </QueryClientProvider>
  </StrictMode>,
);
