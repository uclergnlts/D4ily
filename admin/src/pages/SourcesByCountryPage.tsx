import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import {
  useSources,
  useCreateSource,
  useUpdateSource,
  useDeleteSource,
  useScrapeSource,
} from '../hooks/useSources';
import type { RssSource, CreateSourceForm, CountryCode } from '../types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createColumnHelper } from '@tanstack/react-table';
import { Plus, RefreshCw, Pencil, Trash2, Play } from 'lucide-react';

const COUNTRY_INFO: Record<string, { name: string; flag: string }> = {
  tr: { name: 'Turkey', flag: '🇹🇷' },
  de: { name: 'Germany', flag: '🇩🇪' },
  us: { name: 'USA', flag: '🇺🇸' },
};

const sourceSchema = z.object({
  sourceName: z.string().min(1, 'Source name is required'),
  sourceLogoUrl: z.string().url().optional().or(z.literal('')),
  rssUrl: z.string().url().optional().or(z.literal('')),
  countryCode: z.enum(['tr', 'de', 'us']),
  isActive: z.boolean(),
  scrapeIntervalMinutes: z.coerce.number().int().positive(),
});

type SourceFormData = z.infer<typeof sourceSchema>;

const columnHelper = createColumnHelper<RssSource>();

export function SourcesByCountryPage() {
  const { countryCode } = useParams<{ countryCode: string }>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<RssSource | null>(null);

  const country = countryCode as CountryCode;
  const countryInfo = COUNTRY_INFO[country] || { name: country?.toUpperCase(), flag: '🌍' };

  const { data: allSources, isLoading } = useSources();
  const createMutation = useCreateSource();
  const updateMutation = useUpdateSource();
  const deleteMutation = useDeleteSource();
  const scrapeMutation = useScrapeSource();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SourceFormData>({
    resolver: zodResolver(sourceSchema),
    defaultValues: {
      countryCode: country,
      isActive: true,
      scrapeIntervalMinutes: 30,
    },
  });

  // Filter sources by country
  const sources = allSources?.filter((s) => s.countryCode === country) ?? [];

  const columns = [
    columnHelper.accessor('sourceName', {
      header: 'Source',
      cell: (info) => (
        <div className="flex items-center gap-3">
          {info.row.original.sourceLogoUrl && (
            <img
              src={info.row.original.sourceLogoUrl}
              alt=""
              className="h-8 w-8 rounded object-cover"
            />
          )}
          <span className="font-medium">{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor('rssUrl', {
      header: 'RSS URL',
      cell: (info) => (
        <span className="text-sm text-gray-500 truncate max-w-xs block">
          {info.getValue() || '-'}
        </span>
      ),
    }),
    columnHelper.accessor('isActive', {
      header: 'Status',
      cell: (info) => (
        <Badge variant={info.getValue() ? 'success' : 'danger'}>
          {info.getValue() ? 'Active' : 'Inactive'}
        </Badge>
      ),
    }),
    columnHelper.accessor('govAlignmentScore', {
      header: 'Alignment',
      cell: (info) => {
        const score = info.getValue();
        const label = info.row.original.govAlignmentLabel;
        return (
          <div className="text-sm">
            <span className="font-medium">{score > 0 ? '+' : ''}{score}</span>
            {label && <span className="text-gray-500 ml-1">({label})</span>}
          </div>
        );
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => scrapeMutation.mutate(info.row.original.id)}
            disabled={scrapeMutation.isPending}
            title="Scrape"
          >
            <Play className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditingSource(info.row.original);
              reset({
                sourceName: info.row.original.sourceName,
                sourceLogoUrl: info.row.original.sourceLogoUrl || '',
                rssUrl: info.row.original.rssUrl || '',
                countryCode: info.row.original.countryCode,
                isActive: info.row.original.isActive,
                scrapeIntervalMinutes: info.row.original.scrapeIntervalMinutes,
              });
              setIsModalOpen(true);
            }}
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (confirm('Are you sure you want to delete this source?')) {
                deleteMutation.mutate(info.row.original.id);
              }
            }}
            disabled={deleteMutation.isPending}
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    }),
  ];

  const onSubmit = (data: SourceFormData) => {
    const formData: CreateSourceForm = {
      sourceName: data.sourceName,
      sourceLogoUrl: data.sourceLogoUrl || undefined,
      rssUrl: data.rssUrl || undefined,
      countryCode: data.countryCode,
      isActive: data.isActive,
      scrapeIntervalMinutes: data.scrapeIntervalMinutes,
    };

    if (editingSource) {
      updateMutation.mutate(
        { id: editingSource.id, data: formData },
        {
          onSuccess: () => {
            setIsModalOpen(false);
            setEditingSource(null);
            reset({ countryCode: country, isActive: true, scrapeIntervalMinutes: 30 });
          },
        }
      );
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => {
          setIsModalOpen(false);
          reset({ countryCode: country, isActive: true, scrapeIntervalMinutes: 30 });
        },
      });
    }
  };

  const handleScrapeAll = () => {
    // Scrape all sources for this country
    sources.forEach((source) => {
      if (source.isActive && source.rssUrl) {
        scrapeMutation.mutate(source.id);
      }
    });
  };

  return (
    <div>
      <Header
        title={`${countryInfo.flag} ${countryInfo.name} Sources`}
        subtitle={`Manage RSS sources for ${countryInfo.name}`}
      />

      <div className="p-8">
        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {sources.length} source{sources.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              onClick={handleScrapeAll}
              disabled={scrapeMutation.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Scrape All {countryInfo.name}
            </Button>
            <Button
              onClick={() => {
                setEditingSource(null);
                reset({
                  sourceName: '',
                  sourceLogoUrl: '',
                  rssUrl: '',
                  countryCode: country,
                  isActive: true,
                  scrapeIntervalMinutes: 30,
                });
                setIsModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Source
            </Button>
          </div>
        </div>

        {/* Sources Table */}
        <Card className="p-0 overflow-hidden">
          <DataTable columns={columns} data={sources} isLoading={isLoading} />
        </Card>
      </div>

      {/* Source Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSource(null);
        }}
        title={editingSource ? 'Edit Source' : `Add Source to ${countryInfo.name}`}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Source Name"
            {...register('sourceName')}
            error={errors.sourceName?.message}
            placeholder="e.g., CNN, BBC, Hürriyet"
          />
          <Input
            label="Logo URL"
            {...register('sourceLogoUrl')}
            error={errors.sourceLogoUrl?.message}
            placeholder="https://example.com/logo.png"
          />
          <Input
            label="RSS URL"
            {...register('rssUrl')}
            error={errors.rssUrl?.message}
            placeholder="https://example.com/rss/feed.xml"
          />
          <input type="hidden" {...register('countryCode')} value={country} />
          <Input
            label="Scrape Interval (minutes)"
            type="number"
            {...register('scrapeIntervalMinutes')}
            error={errors.scrapeIntervalMinutes?.message}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              {...register('isActive')}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Active
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                setEditingSource(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              {editingSource ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
