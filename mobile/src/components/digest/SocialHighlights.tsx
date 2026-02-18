import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import type { SectionTweet } from '../../types';

interface SocialHighlightsProps {
    tweets: SectionTweet[];
    className?: string;
}

export const SocialHighlights = React.memo(function SocialHighlights({ tweets, className }: SocialHighlightsProps) {
    if (!tweets || tweets.length === 0) return null;

    return (
        <View className={className}>
            <Text
                className="text-lg text-zinc-900 dark:text-white mb-4 px-6"
                style={{ fontFamily: 'DMSans_700Bold' }}
            >
                Sosyal Medya Yansımaları
            </Text>

            <FlatList
                data={tweets}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                keyExtractor={(_, index) => `social-${index}`}
                renderItem={({ item }) => (
                    <View className="w-[280px] bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4">
                        {/* Header */}
                        <View className="flex-row items-center gap-2 mb-3">
                            <View className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-white items-center justify-center">
                                <Text className="text-white dark:text-zinc-900 text-xs font-bold">𝕏</Text>
                            </View>
                            <View className="flex-1">
                                <Text
                                    className="text-[14px] text-zinc-900 dark:text-white"
                                    style={{ fontFamily: 'DMSans_700Bold' }}
                                    numberOfLines={1}
                                >
                                    {item.author}
                                </Text>
                                <Text
                                    className="text-[12px] text-zinc-400"
                                    style={{ fontFamily: 'DMSans_400Regular' }}
                                    numberOfLines={1}
                                >
                                    {item.handle}
                                </Text>
                            </View>
                        </View>

                        {/* Tweet text */}
                        <Text
                            className="text-[14px] text-zinc-700 dark:text-zinc-300 leading-[21px]"
                            style={{ fontFamily: 'DMSans_400Regular' }}
                            numberOfLines={5}
                        >
                            {item.text}
                        </Text>
                    </View>
                )}
            />
        </View>
    );
});

SocialHighlights.displayName = 'SocialHighlights';
