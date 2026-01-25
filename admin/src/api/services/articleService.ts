import apiClient from '../client';
import type { ApiResponse, Article, CountryCode } from '../../types';

interface ArticlesResponse {
  articles: Article[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
    total?: number;
  };
}

export const articleService = {
  getAll: async (
    country: CountryCode,
    page = 1,
    limit = 20,
    filters?: {
      category?: number;
      sentiment?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<ArticlesResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters?.category) params.append('category', filters.category.toString());
    if (filters?.sentiment) params.append('sentiment', filters.sentiment);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);

    const response = await apiClient.get<ApiResponse<ArticlesResponse>>(
      `/admin/articles?country=${country}&${params.toString()}`
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch articles');
    }
    return response.data.data;
  },

  delete: async (country: CountryCode, articleId: string): Promise<void> => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/admin/articles/${country}/${articleId}`
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete article');
    }
  },
};
