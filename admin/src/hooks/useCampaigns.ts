import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignService, type CreateCampaignForm } from '../api/services/campaignService';
import toast from 'react-hot-toast';

export function useCampaigns(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['campaigns', page, limit],
    queryFn: () => campaignService.getAll(page, limit),
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCampaignForm) => campaignService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign created');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useSendCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (campaignId: string) => campaignService.send(campaignId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success(`Campaign sent! ${data?.sentCount ?? 0} delivered, ${data?.failedCount ?? 0} failed`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
