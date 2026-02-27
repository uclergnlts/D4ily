import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { twitterService } from '../api/services/twitterService';
import type { CountryCode, CreateTwitterAccountForm } from '../types';
import toast from 'react-hot-toast';

export function useTwitterAccounts(country?: CountryCode) {
  return useQuery({
    queryKey: ['twitter-accounts', country],
    queryFn: () => twitterService.getAll(country),
  });
}

export function useCreateTwitterAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTwitterAccountForm) => twitterService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['twitter-accounts'] });
      toast.success('Twitter account created');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateTwitterAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateTwitterAccountForm> }) =>
      twitterService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['twitter-accounts'] });
      toast.success('Twitter account updated');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteTwitterAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => twitterService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['twitter-accounts'] });
      toast.success('Twitter account deleted');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
