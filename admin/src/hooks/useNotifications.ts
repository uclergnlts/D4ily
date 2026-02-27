import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../api/services/notificationService';
import toast from 'react-hot-toast';

export function useNotificationHistory(limit = 50) {
  return useQuery({
    queryKey: ['notifications', 'history', limit],
    queryFn: () => notificationService.getHistory(limit),
  });
}

export function useDeviceStats() {
  return useQuery({
    queryKey: ['notifications', 'devices'],
    queryFn: () => notificationService.getDeviceStats(),
  });
}

export function useSendNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; body: string; type?: string; userIds?: string[] }) =>
      notificationService.send(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(`Notification sent to ${result.targetUsers} users (${result.success} delivered)`);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
