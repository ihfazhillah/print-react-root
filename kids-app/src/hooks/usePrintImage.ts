import { useMutation } from '@tanstack/react-query';
import { useApiClient } from '../api/apiClientContext';
import type { PrintResponse } from '../types/api';
import { ApiRequestError } from '../api/client';

export function usePrintImage() {
  const client = useApiClient();

  return useMutation<PrintResponse, ApiRequestError, string>({
    mutationFn: (url: string) => client.printImage(url),
    retry: false,
  });
}
