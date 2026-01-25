import { useQuery } from '@tanstack/react-query';
import { userService } from '../api/services/userService';
import { useAuthStore } from '../store/useAuthStore';

export function useUserProfile() {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['user', 'profile'],
        queryFn: () => userService.getProfile(),
        enabled: !!user,
    });
}

export function useUserReputation() {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['user', 'reputation'],
        queryFn: () => userService.getReputation(),
        enabled: !!user,
    });
}
