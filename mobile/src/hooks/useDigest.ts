import { useQuery } from '@tanstack/react-query';
import { digestService } from '../api/services/digestService';

export function useLatestDigest(country: string = 'tr') {
    return useQuery({
        queryKey: ['digest', 'latest', country],
        queryFn: () => digestService.getLatestDigest(country),
        staleTime: 1000 * 60 * 60, // 1 hour
    });
}

export function useDigests(country: string = 'tr') {
    return useQuery({
        queryKey: ['digests', country],
        queryFn: () => digestService.getDigests(country),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useDigestDetail(country: string, digestId: string) {
    return useQuery({
        queryKey: ['digest', digestId],
        queryFn: () => digestService.getDigestById(country, digestId),
        enabled: !!digestId,
    });
}

export function useNewsLocations(days: number = 7) {
    return useQuery({
        queryKey: ['digest', 'locations', days],
        queryFn: () => digestService.getNewsLocations(days),
        staleTime: 1000 * 60 * 15, // 15 minutes
    });
}
