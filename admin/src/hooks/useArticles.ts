import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { articleService } from '../api/services/articleService';
import type { CountryCode } from '../types';
import toast from 'react-hot-toast';

interface ArticleFilters {
  category?: number;
  sentiment?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useArticles(country: CountryCode, page = 1, limit = 20, filters?: ArticleFilters) {
  return useQuery({
    queryKey: ['articles', country, page, limit, filters],
    queryFn: () => articleService.getAll(country, page, limit, filters),
  });
}

export function useDeleteArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ country, articleId }: { country: CountryCode; articleId: string }) =>
      articleService.delete(country, articleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast.success('Article deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
