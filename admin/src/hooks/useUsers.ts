import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../api/services/userService';
import type { UpdateUserForm } from '../types';
import toast from 'react-hot-toast';

export function useUsers(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['users', page, limit],
    queryFn: () => userService.getAll(page, limit),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => userService.getById(id),
    enabled: !!id,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserForm }) =>
      userService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUserDetails(id: string) {
  return useQuery({
    queryKey: ['users', id, 'details'],
    queryFn: () => userService.getDetails(id),
    enabled: !!id,
  });
}

export function useBanUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason, durationDays }: { id: string; reason: string; durationDays?: number }) =>
      userService.ban(id, reason, durationDays),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User banned successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUnbanUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => userService.unban(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User unbanned successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
