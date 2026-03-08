import { createContext, useContext } from 'react';
import type { AdminApiClient } from './client';

export const AdminApiClientContext = createContext<AdminApiClient | null>(null);

export function useAdminApiClient(): AdminApiClient {
  const client = useContext(AdminApiClientContext);
  if (!client) {
    throw new Error('useAdminApiClient must be used within an AdminApiClientContext.Provider');
  }
  return client;
}
