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
      toast.success(`Created ${data.digestsCreated} digests`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
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
