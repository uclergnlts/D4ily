import { client } from '../client';
import { ApiResponse, Comment } from '../../types';

export const interactionService = {
    // Comments
    getComments: async (country: string, articleId: string) => {
        // Backend: GET /comments/:country/:articleId
        const response = await client.get<ApiResponse<{ comments: Comment[] }>>(`/comments/${country}/${articleId}`);

        if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to fetch comments');
        }

        return response.data.data.comments;
    },

    postComment: async (country: string, articleId: string, content: string, parentCommentId?: string | null) => {
        // Backend: POST /comments/:country
        const response = await client.post<ApiResponse<Comment>>(`/comments/${country}`, {
            articleId,
            content,
            parentCommentId
        });

        if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to post comment');
        }

        return response.data.data;
    },

    deleteComment: async (country: string, commentId: string) => {
        // Backend: DELETE /comments/:country/:commentId
        const response = await client.delete<ApiResponse<any>>(`/comments/${country}/${commentId}`);

        if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to delete comment');
        }

        return true;
    },

    likeComment: async (country: string, commentId: string) => {
        // Backend: POST /comments/:country/:commentId/like
        // Returns { liked: boolean, likeCount: number }
        const response = await client.post<ApiResponse<{ liked: boolean; likeCount: number }>>(`/comments/${country}/${commentId}/like`);

        if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to toggle like');
        }

        return response.data.data;
    },

    // Article Reactions
    toggleBookmark: async (country: string, articleId: string) => {
        // Backend: POST /reactions/bookmark
        const response = await client.post<ApiResponse<{ isBookmarked: boolean }>>('/reactions/bookmark', {
            countryCode: country,
            articleId
        });

        if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to bookmark');
        }

        return response.data;
    },

    // Fetch reaction status (like, bookmark) for a specific article
    getReactionStatus: async (country: string, articleId: string) => {
        // Backend: GET /reactions/status/:country/:articleId
        const response = await client.get<ApiResponse<{ reactionType: string | null; isBookmarked: boolean }>>(`/reactions/status/${country}/${articleId}`);

        if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to get status');
        }

        return response.data.data;
    },

    getBookmarks: async (page = 1) => {
        const response = await client.get<ApiResponse<{ bookmarks: any[] }>>(`/reactions/bookmarks`, {
            params: { page }
        });

        if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to fetch bookmarks');
        }

        return response.data.data.bookmarks;
    }
};
