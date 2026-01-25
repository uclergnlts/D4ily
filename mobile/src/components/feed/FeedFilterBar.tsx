import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';

interface Category {
    id: string;
    name: string;
}

const CATEGORIES: Category[] = [
    { id: 'all', name: 'Tümü' },
    { id: 'gundem', name: 'Gündem' },
    { id: 'siyaset', name: 'Siyaset' },
    { id: 'ekonomi', name: 'Ekonomi' },
    { id: 'dunya', name: 'Dünya' },
    { id: 'teknoloji', name: 'Teknoloji' },
    { id: 'spor', name: 'Spor' },
    { id: 'saglik', name: 'Sağlık' },
];

interface FeedFilterBarProps {
    selectedCategory: string;
    onSelectCategory: (id: string) => void;
    className?: string;
}

export const FeedFilterBar = React.memo(({ selectedCategory, onSelectCategory, className }: FeedFilterBarProps) => {
    return (
        <View className={`bg-white dark:bg-zinc-900 ${className}`}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
                className="flex-row"
            >
                {CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                        <TouchableOpacity
                            key={cat.id}
                            onPress={() => onSelectCategory(cat.id)}
                            className={`mr-3 px-6 py-2 rounded-full border transition-all active:scale-95 ${isSelected
                                ? 'bg-[#1A1A1A] border-[#1A1A1A] dark:bg-white dark:border-white'
                                : 'bg-white border-zinc-100 dark:bg-zinc-800/50 dark:border-zinc-700'
                                }`}
                            style={{
                                shadowColor: "#000",
                                shadowOffset: {
                                    width: 0,
                                    height: 1,
                                },
                                shadowOpacity: 0.05,
                                shadowRadius: 2,
                                elevation: 2,
                            }}
                        >
                            <Text className={`text-[13px] font-bold tracking-wide ${isSelected
                                ? 'text-white dark:text-zinc-900'
                                : 'text-zinc-500 dark:text-zinc-400'
                                }`}>
                                {cat.name}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
});
