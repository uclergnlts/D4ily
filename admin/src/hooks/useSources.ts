import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sourceService } from '../api/services/sourceService';
import type { CreateSourceForm, UpdateSourceForm } from '../types';
import toast from 'react-hot-toast';

export function useSources() {
  return useQuery({
    queryKey: ['sources'],
    queryFn: () => sourceService.getAll(),
  });
}

export function useCreateSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSourceForm) => sourceService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      toast.success('Source created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateSourceForm }) =>
      sourceService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      toast.success('Source updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => sourceService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      toast.success('Source deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useScrapeSource() {
  return useMutation({
    mutationFn: (id: number) => sourceService.scrape(id),
    onSuccess: (data) => {
      toast.success(`Scraped ${data.processed} articles from ${data.source}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useScrapeAllSources() {
  return useMutation({
    mutationFn: () => sourceService.scrapeAll(),
    onSuccess: (data) => {
      toast.success(`Scraped ${data.totalProcessed} articles from all sources`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
