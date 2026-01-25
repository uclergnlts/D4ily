import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { interactionService } from '../api/services/interactionService';

// Comments
export function useComments(country: string, articleId: string) {
    return useQuery({
        queryKey: ['comments', country, articleId],
        queryFn: () => interactionService.getComments(country, articleId),
        enabled: !!articleId,
    });
}

export function usePostComment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ country, articleId, content, parentCommentId }: { country: string, articleId: string, content: string, parentCommentId?: string | null }) =>
            interactionService.postComment(country, articleId, content, parentCommentId),
        onSuccess: (_, { country, articleId }) => {
            queryClient.invalidateQueries({ queryKey: ['comments', country, articleId] });
            queryClient.invalidateQueries({ queryKey: ['article', articleId] }); // update comment count if possible
        },
    });
}

// Reactions
export function useArticleReactionStatus(country: string, articleId: string) {
    return useQuery({
        queryKey: ['reactionStatus', country, articleId],
        queryFn: () => interactionService.getReactionStatus(country, articleId),
        enabled: !!articleId,
    });
}

export function useToggleBookmark() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ country, articleId }: { country: string, articleId: string }) =>
            interactionService.toggleBookmark(country, articleId),
        onSuccess: (_, { country, articleId }) => {
            queryClient.invalidateQueries({ queryKey: ['reactionStatus', country, articleId] });
            // Also update lists if needed
        },
    });
}
