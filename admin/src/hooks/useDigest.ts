import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { digestService } from '../api/services/digestService';
import type { CountryCode, DigestTopic, DigestSection } from '../types';
import toast from 'react-hot-toast';

export function useDigestQuality(country: CountryCode, days: number) {
  return useQuery({
    queryKey: ['digest', 'quality', country, days],
    queryFn: () => digestService.getQuality(country, days),
  });
}

export function useDigests(country: CountryCode) {
  return useQuery({
    queryKey: ['digests', country],
    queryFn: () => digestService.getDigests(country),
  });
}

export function useDigestById(country: CountryCode, digestId?: string) {
  return useQuery({
    queryKey: ['digest', country, digestId],
    queryFn: () => digestService.getDigestById(country, digestId as string),
    enabled: !!digestId,
  });
}

export function useUpdateDigest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ country, digestId, data }: { country: CountryCode; digestId: string; data: { summaryText?: string; topTopics?: DigestTopic[]; sections?: DigestSection[] } }) =>
      digestService.updateDigest(country, digestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digests'] });
      toast.success('Digest updated');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteDigest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ country, digestId }: { country: CountryCode; digestId: string }) =>
      digestService.deleteDigest(country, digestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digests'] });
      toast.success('Digest deleted');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
