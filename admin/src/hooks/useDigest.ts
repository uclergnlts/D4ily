import { useQuery } from '@tanstack/react-query';
import { digestService } from '../api/services/digestService';
import type { CountryCode } from '../types';

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
