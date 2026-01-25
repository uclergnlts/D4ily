import { useQuery } from '@tanstack/react-query';
import { digestService } from '../api/services/digestService';

export function useLatestDigest(country: string = 'tr') {
    return useQuery({
        queryKey: ['digest', 'latest', country],
        queryFn: () => digestService.getLatestDigest(country),
        staleTime: 1000 * 60 * 60, // 1 hour
    });
}

export function useDigestDetail(country: string, digestId: string) {
    return useQuery({
        queryKey: ['digest', digestId],
        queryFn: () => digestService.getDigestById(country, digestId),
        enabled: !!digestId,
    });
}
