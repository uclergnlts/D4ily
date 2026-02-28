import { useQuery, useMutation } from '@tanstack/react-query';
import { cronService } from '../api/services/cronService';
import toast from 'react-hot-toast';

export function useCronStatus() {
  return useQuery({
    queryKey: ['cron', 'status'],
    queryFn: () => cronService.getStatus(),
  });
}

export function useRunDigest() {
  return useMutation({
    mutationFn: () => cronService.runDigest(),
    onSuccess: (data) => {
      if (data.accepted) {
        toast.success(data.message || 'Digest generation started in background');
      } else {
        toast(data.message || 'Digest generation is already in progress');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDigestStatus(polling: boolean) {
  return useQuery({
    queryKey: ['cron', 'digest', 'status'],
    queryFn: () => cronService.getDigestStatus(),
    refetchInterval: polling ? 3000 : false,
  });
}

export function useRunWeekly() {
  return useMutation({
    mutationFn: () => cronService.runWeekly(),
    onSuccess: () => {
      toast.success('Weekly comparison generated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRunScraper() {
  return useMutation({
    mutationFn: () => cronService.runScraper(),
    onSuccess: () => {
      toast.success('Scraper started in background');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
