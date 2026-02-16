import { useQuery } from '@tanstack/react-query';
import { weeklyService } from '../api/services/weeklyService';

export function useLatestWeekly() {
    return useQuery({
        queryKey: ['weekly', 'latest'],
        queryFn: () => weeklyService.getLatest(),
        staleTime: 1000 * 60 * 30, // 30 minutes
    });
}

export function useWeeklyList() {
    return useQuery({
        queryKey: ['weekly', 'list'],
        queryFn: () => weeklyService.getList(),
        staleTime: 1000 * 60 * 30,
    });
}
