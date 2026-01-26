import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';

interface Category {
    id: string;
    name: string;
}

const CATEGORIES: Category[] = [
    { id: 'all', name: 'Senin Akışın' },
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
        <View className={`bg-transparent border-b border-zinc-100 dark:border-zinc-800 ${className}`}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                className="flex-row"
            >
                {CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                        <TouchableOpacity
                            key={cat.id}
                            onPress={() => onSelectCategory(cat.id)}
                            className="mr-6 py-4 relative"
                        >
                            <Text className={`text-[15px] font-semibold tracking-tight ${isSelected
                                ? 'text-black dark:text-white'
                                : 'text-zinc-500 dark:text-zinc-400'
                                }`}>
                                {cat.name}
                            </Text>
                            {isSelected && (
                                <View className="absolute bottom-0 left-0 right-0 h-[2px] bg-black dark:bg-white rounded-full" />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
});

FeedFilterBar.displayName = 'FeedFilterBar';
