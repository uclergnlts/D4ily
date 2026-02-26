import { useQuery } from '@tanstack/react-query';
import { digestService } from '../api/services/digestService';

function getDigestDayKey(): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Istanbul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(new Date());

    const year = parts.find((part) => part.type === 'year')?.value || '';
    const month = parts.find((part) => part.type === 'month')?.value || '';
    const day = parts.find((part) => part.type === 'day')?.value || '';
    return `${year}-${month}-${day}`;
}

export function useLatestDigest(country: string = 'tr') {
    const dayKey = getDigestDayKey();

    return useQuery({
        queryKey: ['digest', 'latest', country, dayKey],
        queryFn: () => digestService.getLatestDigest(country),
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnMount: 'always',
        refetchOnReconnect: true,
    });
}

export function useDigests(country: string = 'tr') {
    return useQuery({
        queryKey: ['digests', country],
        queryFn: () => digestService.getDigests(country),
        staleTime: 1000 * 60 * 10, // 10 minutes
    });
}

export function useDigestDetail(country: string, digestId: string) {
    return useQuery({
        queryKey: ['digest', digestId],
        queryFn: () => digestService.getDigestById(country, digestId),
        enabled: !!digestId,
        staleTime: 1000 * 60 * 30, // 30 minutes — digest content doesn't change often
    });
}

export function useNewsLocations(days: number = 7) {
    return useQuery({
        queryKey: ['digest', 'locations', days],
        queryFn: () => digestService.getNewsLocations(days),
        staleTime: 1000 * 60 * 15, // 15 minutes
    });
}
