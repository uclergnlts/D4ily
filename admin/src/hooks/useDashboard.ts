import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../api/services/dashboardService';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardService.getStats(),
  });
}
