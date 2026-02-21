import React, { useMemo } from 'react';
import { createApiClient } from './client';
import { ApiClientContext } from './apiClientContext';
import { getBaseUrl, useServerConfig } from '../hooks/useServerConfig';

export { useApiClient } from './apiClientContext';

/** Production provider — builds a real ApiClient from the persisted server config. */
export function ApiClientProvider({ children }: { children: React.ReactNode }) {
  const { config } = useServerConfig();
  const baseUrl = getBaseUrl(config);
  const client = useMemo(() => createApiClient(baseUrl), [baseUrl]);

  return <ApiClientContext.Provider value={client}>{children}</ApiClientContext.Provider>;
}
