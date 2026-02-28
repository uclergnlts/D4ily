import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Header } from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { useCampaigns, useCreateCampaign, useSendCampaign } from '../hooks/useCampaigns';
import type { CreateCampaignForm } from '../api/services/campaignService';
import { Plus, Send, ChevronLeft, ChevronRight, Megaphone } from 'lucide-react';
import { formatDate } from '../lib/utils';

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All Users' },
  { value: 'free', label: 'Free Users' },
  { value: 'premium', label: 'Premium Users' },
  { value: 'inactive', label: 'Inactive Users' },
];

export function CampaignsPage() {
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const { data, isLoading } = useCampaigns(page);
  const createMutation = useCreateCampaign();
  const sendMutation = useSendCampaign();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateCampaignForm>({
    defaultValues: { name: '', title: '', body: '', targetAudience: 'all' },
  });

  const onSubmit = (formData: CreateCampaignForm) => {
    createMutation.mutate(formData, {
      onSuccess: () => {
        setIsCreateOpen(false);
        reset();
      },
    });
  };

  const handleSend = (campaignId: string) => {
    setSendingId(campaignId);
    sendMutation.mutate(campaignId, {
      onSettled: () => setSendingId(null),
    });
  };

  const statusVariant = (status: string) => {
    if (status === 'sent') return 'success';
    if (status === 'scheduled') return 'warning';
    return 'default';
  };

  return (
    <div>
      <Header title="Campaigns" subtitle="Manage notification campaigns" />

      <div className="p-8 space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Create Campaign
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" /> All Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : !data?.campaigns.length ? (
              <p className="text-sm text-gray-500">No campaigns yet.</p>
            ) : (
              <>
                <div className="space-y-3">
                  {data.campaigns.map((campaign) => (
                    <div key={campaign.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{campaign.name}</h3>
                            <Badge variant={statusVariant(campaign.status)}>{campaign.status}</Badge>
                            <Badge variant="info">{campaign.targetAudience}</Badge>
                          </div>
                          <p className="text-sm font-medium text-gray-700">{campaign.title}</p>
                          <p className="text-sm text-gray-500">{campaign.body}</p>
                        </div>
                        {campaign.status !== 'sent' && (
                          <Button
                            size="sm"
                            onClick={() => handleSend(campaign.id)}
                            isLoading={sendingId === campaign.id}
                            className="flex items-center gap-1"
                          >
                            <Send className="h-3.5 w-3.5" /> Send
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                        <span>Created: {formatDate(campaign.createdAt)}</span>
                        {campaign.sentAt && <span>Sent: {formatDate(campaign.sentAt)}</span>}
                        {campaign.status === 'sent' && (
                          <>
                            <span>Sent: {campaign.sentCount}</span>
                            <span>Delivered: {campaign.deliveredCount}</span>
                            <span>Opened: {campaign.openedCount}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    {data.pagination.total} campaigns total
                  </p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">Page {page} / {data.pagination.totalPages || 1}</span>
                    <Button size="sm" variant="ghost" onClick={() => setPage(p => p + 1)} disabled={page >= data.pagination.totalPages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Campaign Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Campaign" size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Campaign Name"
            {...register('name', { required: 'Name is required' })}
            error={errors.name?.message}
            placeholder="e.g. New Feature Announcement"
          />
          <Input
            label="Notification Title"
            {...register('title', { required: 'Title is required' })}
            error={errors.title?.message}
            placeholder="Notification title"
          />
          <Input
            label="Notification Body"
            {...register('body', { required: 'Body is required' })}
            error={errors.body?.message}
            placeholder="Notification message"
          />
          <Select
            label="Target Audience"
            {...register('targetAudience')}
            options={AUDIENCE_OPTIONS}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Create Campaign</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
