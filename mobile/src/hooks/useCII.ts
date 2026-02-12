import { useQuery } from '@tanstack/react-query';
import { ciiService, CIIData } from '../api/services/ciiService';

export function useAllCII() {
    return useQuery({
        queryKey: ['cii', 'all'],
        queryFn: () => ciiService.getAllCII(),
        staleTime: 1000 * 60 * 30, // 30 minutes
    });
}

export function useCII(country: string) {
    return useQuery({
        queryKey: ['cii', country],
        queryFn: () => ciiService.getCII(country),
        staleTime: 1000 * 60 * 30, // 30 minutes
    });
}

export type { CIIData };
