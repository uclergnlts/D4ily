import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { useArticles, useDeleteArticle } from '../hooks/useArticles';
import type { Article, CountryCode } from '../types';
import { createColumnHelper } from '@tanstack/react-table';
import { formatDate, truncate, getSentimentColor, getPoliticalToneLabel, getPoliticalToneColor } from '../lib/utils';
import { ChevronLeft, ChevronRight, Trash2, Eye } from 'lucide-react';
import { cn } from '../lib/utils';

const COUNTRY_INFO: Record<string, { name: string; flag: string }> = {
  tr: { name: 'Turkey', flag: '🇹🇷' },
  de: { name: 'Germany', flag: '🇩🇪' },
  us: { name: 'USA', flag: '🇺🇸' },
};

const columnHelper = createColumnHelper<Article>();

export function ArticlesByCountryPage() {
  const { countryCode } = useParams<{ countryCode: string }>();
  const country = (countryCode || 'tr') as CountryCode;
  const countryInfo = COUNTRY_INFO[country] || { name: country?.toUpperCase(), flag: '🌍' };

  const [page, setPage] = useState(1);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const { data, isLoading } = useArticles(country, page, 20);
  const deleteMutation = useDeleteArticle();

  const columns = [
    columnHelper.accessor('translatedTitle', {
      header: 'Title',
      cell: (info) => (
        <div className="max-w-md">
          <p className="font-medium">{truncate(info.getValue(), 60)}</p>
          <p className="text-sm text-gray-500">{truncate(info.row.original.summary, 80)}</p>
        </div>
      ),
    }),
    columnHelper.accessor('sentiment', {
      header: 'Sentiment',
      cell: (info) => {
        const sentiment = info.getValue();
        return sentiment ? (
          <Badge className={getSentimentColor(sentiment)}>
            {sentiment}
          </Badge>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    }),
    columnHelper.accessor('politicalTone', {
      header: 'Political',
      cell: (info) => {
        const score = info.getValue();
        return (
          <Badge className={getPoliticalToneColor(score)}>
            {score > 0 ? '+' : ''}{score}
          </Badge>
        );
      },
    }),
    columnHelper.accessor('sensationalismScore', {
      header: 'Sensationalism',
      cell: (info) => {
        const score = info.getValue();
        if (!score) return <span className="text-gray-400">-</span>;
        const percentage = Math.round(score * 100);
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full',
                  percentage > 70 ? 'bg-red-500' : percentage > 40 ? 'bg-yellow-500' : 'bg-green-500'
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{percentage}%</span>
          </div>
        );
      },
    }),
    columnHelper.accessor('publishedAt', {
      header: 'Published',
      cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.accessor('viewCount', {
      header: 'Views',
      cell: (info) => info.getValue().toLocaleString(),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedArticle(info.row.original)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (confirm('Are you sure you want to delete this article?')) {
                deleteMutation.mutate({ country, articleId: info.row.original.id });
              }
            }}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    }),
  ];

  return (
    <div>
      <Header
        title={`${countryInfo.flag} ${countryInfo.name} Articles`}
        subtitle={`View and manage articles from ${countryInfo.name}`}
      />

      <div className="p-8">
        {/* Articles Table */}
        <Card className="p-0 overflow-hidden">
          <DataTable columns={columns} data={data?.articles ?? []} isLoading={isLoading} />

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Page {page} {data?.pagination.total && `of ${Math.ceil(data.pagination.total / 20)}`}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPage((p) => p + 1)}
                disabled={!data?.pagination.hasMore}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Article Detail Modal */}
      <Modal
        isOpen={!!selectedArticle}
        onClose={() => setSelectedArticle(null)}
        title="Article Details"
        size="xl"
      >
        {selectedArticle && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{selectedArticle.translatedTitle}</h3>
              <p className="text-sm text-gray-500 mt-1">{selectedArticle.originalTitle}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm">{selectedArticle.summary}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Sentiment</p>
                <Badge className={getSentimentColor(selectedArticle.sentiment)}>
                  {selectedArticle.sentiment || 'N/A'}
                </Badge>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500">Political Tone</p>
                <Badge className={getPoliticalToneColor(selectedArticle.politicalTone)}>
                  {getPoliticalToneLabel(selectedArticle.politicalTone)} ({selectedArticle.politicalTone})
                </Badge>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500">Sensationalism</p>
                <p>{selectedArticle.sensationalismScore ? `${Math.round(selectedArticle.sensationalismScore * 100)}%` : 'N/A'}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500">Loaded Language</p>
                <p>{selectedArticle.loadedLanguageScore ? `${Math.round(selectedArticle.loadedLanguageScore * 100)}%` : 'N/A'}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500">Emotional Intensity</p>
                <p>{selectedArticle.emotionalIntensity ? `${Math.round(selectedArticle.emotionalIntensity * 100)}%` : 'N/A'}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500">Government Mentioned</p>
                <p>{selectedArticle.governmentMentioned ? 'Yes' : 'No'}</p>
              </div>
            </div>

            {selectedArticle.emotionalTone && (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Emotional Analysis</p>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(selectedArticle.emotionalTone).map(([emotion, value]) => (
                    <div key={emotion} className="text-center">
                      <div className="h-16 bg-gray-200 rounded relative overflow-hidden">
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-primary-500"
                          style={{ height: `${value * 100}%` }}
                        />
                      </div>
                      <p className="text-xs mt-1 capitalize">{emotion}</p>
                      <p className="text-xs text-gray-500">{Math.round(value * 100)}%</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 text-center pt-4 border-t">
              <div>
                <p className="text-2xl font-bold">{selectedArticle.viewCount}</p>
                <p className="text-sm text-gray-500">Views</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{selectedArticle.likeCount}</p>
                <p className="text-sm text-gray-500">Likes</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{selectedArticle.commentCount}</p>
                <p className="text-sm text-gray-500">Comments</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
