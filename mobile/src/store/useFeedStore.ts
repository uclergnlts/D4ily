import { create } from 'zustand';

interface FeedState {
    isBalanced: boolean;
    toggleBalanced: () => void;
    setBalanced: (value: boolean) => void;
}

export const useFeedStore = create<FeedState>((set) => ({
    isBalanced: false,
    toggleBalanced: () => set((state) => ({ isBalanced: !state.isBalanced })),
    setBalanced: (value) => set({ isBalanced: value }),
}));
