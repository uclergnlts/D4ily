import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { historyService } from '../api/services/historyService';
import { useAuthStore } from '../store/useAuthStore';

export function useReadingHistory(page: number = 1) {
    const token = useAuthStore(s => s.token);

    return useQuery({
        queryKey: ['history', page],
        queryFn: () => historyService.getHistory(page),
        enabled: !!token,
        staleTime: 1000 * 60 * 5,
    });
}

export function useTrackReading() {
    const token = useAuthStore(s => s.token);

    return useMutation({
        mutationFn: ({ articleId, countryCode }: { articleId: string; countryCode: string }) => {
            if (!token) return Promise.resolve();
            return historyService.addToHistory(articleId, countryCode);
        },
    });
}

export function useClearHistory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => historyService.clearHistory(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['history'] });
        },
    });
}
