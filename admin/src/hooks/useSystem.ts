import { useQuery } from '@tanstack/react-query';
import { systemService } from '../api/services/systemService';

export function useSystemHealth() {
  return useQuery({
    queryKey: ['system', 'health'],
    queryFn: () => systemService.getHealth(),
    refetchInterval: 60000,
  });
}

export function useCronLogs(limit = 50, job?: string) {
  return useQuery({
    queryKey: ['cron', 'logs', limit, job],
    queryFn: () => systemService.getCronLogs(limit, job),
    refetchInterval: 30000,
  });
}
