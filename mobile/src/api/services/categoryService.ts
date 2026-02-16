import { client } from '../client';
import { ApiResponse } from '../../types';

export interface Category {
    id: number;
    name: string;
    slug: string;
    icon: string | null;
    color: string | null;
}

export interface UserCategoryPref {
    id: string;
    categoryId: number;
    categoryName: string;
    categorySlug: string;
    categoryIcon: string | null;
    categoryColor: string | null;
}

export const categoryService = {
    getAllCategories: async (): Promise<Category[]> => {
        const response = await client.get<ApiResponse<Category[]>>('/categories');
        if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to fetch categories');
        }
        return response.data.data;
    },

    getUserCategories: async (): Promise<UserCategoryPref[]> => {
        const response = await client.get<ApiResponse<UserCategoryPref[]>>('/user/categories');
        if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to fetch preferences');
        }
        return response.data.data;
    },

    setUserCategories: async (categoryIds: number[]): Promise<void> => {
        await client.post('/user/categories', { categoryIds });
    },

    addCategory: async (categoryId: number): Promise<void> => {
        await client.post(`/user/categories/${categoryId}`);
    },

    removeCategory: async (categoryId: number): Promise<void> => {
        await client.delete(`/user/categories/${categoryId}`);
    },
};
