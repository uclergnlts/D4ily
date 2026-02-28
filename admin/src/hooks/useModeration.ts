import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moderationService } from '../api/services/moderationService';
import toast from 'react-hot-toast';

export function useBlacklist(page = 1, limit = 50, category?: string) {
  return useQuery({
    queryKey: ['blacklist', page, limit, category],
    queryFn: () => moderationService.getBlacklist(page, limit, category),
  });
}

export function useAddBlacklistWord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ word, category }: { word: string; category: string }) =>
      moderationService.addBlacklistWord(word, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blacklist'] });
      toast.success('Word added to blacklist');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRemoveBlacklistWord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (wordId: string) => moderationService.removeBlacklistWord(wordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blacklist'] });
      toast.success('Word removed from blacklist');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useModerationQueue(page = 1, limit = 20, status = 'pending', contentType?: string) {
  return useQuery({
    queryKey: ['moderation-queue', page, limit, status, contentType],
    queryFn: () => moderationService.getQueue(page, limit, status, contentType),
  });
}

export function useModerationDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, action, reason }: { itemId: string; action: 'approve' | 'reject' | 'escalate'; reason?: string }) =>
      moderationService.makeDecision(itemId, action, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation-queue'] });
      toast.success('Decision applied');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
