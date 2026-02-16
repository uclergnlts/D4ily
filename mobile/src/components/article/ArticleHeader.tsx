import React from 'react';
import { View, Text } from 'react-native';
import { TimeAgo } from '../ui/TimeAgo';

interface ArticleHeaderProps {
    title: string;
    publishedAt: string;
    category?: string; // Optional category name
    className?: string;
}

export const ArticleHeader = React.memo(function ArticleHeader({ title, publishedAt, category, className }: ArticleHeaderProps) {
    return (
        <View className={`px-5 pt-8 pb-4 ${className}`}>
            {/* Meta Row: Category & Date */}
            <View className="flex-row items-center justify-between mb-5">
                {category ? (
                    <View className="bg-blue-600/10 dark:bg-blue-400/10 px-3 py-1.5 rounded-full">
                        <Text className="text-body-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest leading-none">
                            {category}
                        </Text>
                    </View>
                ) : <View />}

                <View className="bg-surface-subtle dark:bg-surface-subtle-dark px-3 py-1.5 rounded-full">
                    <TimeAgo
                        date={publishedAt}
                        className="text-body-xs text-zinc-500 dark:text-zinc-400 font-semibold leading-none"
                    />
                </View>
            </View>

            {/* Main Title: Modern & Big */}
            <Text className="text-display-2xl font-display text-zinc-900 dark:text-white tracking-tight mb-4 text-left">
                {title}
            </Text>

            {/* Divider */}
            <View className="h-[1px] w-full bg-zinc-100 dark:bg-zinc-800 mt-2" />
        </View>
    );
});

ArticleHeader.displayName = 'ArticleHeader';
