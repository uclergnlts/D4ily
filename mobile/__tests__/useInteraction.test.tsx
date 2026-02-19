import { renderHook, waitFor } from '@testing-library/react-native/pure';
import { useSavedArticles } from '../src/hooks/useInteraction';
import { interactionService } from '../src/api/services/interactionService';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock service
jest.mock('../src/api/services/interactionService', () => ({
    interactionService: {
        getSavedArticles: jest.fn(),
    },
}));

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: Infinity,
            },
        },
    });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('useInteraction', () => {
    it('useSavedArticles fetches data correctly', async () => {
        (interactionService.getSavedArticles as jest.Mock).mockResolvedValue(['article1', 'article2']);

        const { result } = renderHook(() => useSavedArticles('tr'), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(['article1', 'article2']);
        expect(interactionService.getSavedArticles).toHaveBeenCalledWith();
    });
});
