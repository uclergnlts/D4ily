import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import type { SectionTweet } from '../../types';

interface SocialHighlightsProps {
    tweets: SectionTweet[];
    className?: string;
}

const EMPTY_TWEETS: SectionTweet[] = [];

export const SocialHighlights = React.memo(function SocialHighlights({ tweets, className }: SocialHighlightsProps) {
    const tweetList = tweets ?? EMPTY_TWEETS;

    const [expanded, setExpanded] = useState(false);
    const hasMore = tweetList.length > 6;
    const visibleTweets = useMemo(
        () => (expanded ? tweetList : tweetList.slice(0, 6)),
        [expanded, tweetList],
    );

    if (tweetList.length === 0) return null;

    const renderAvatar = (tweet: SectionTweet) => {
        const avatar = typeof tweet.profileImageUrl === 'string' ? tweet.profileImageUrl.trim() : '';
        const fallback = (tweet.author?.trim()?.charAt(0) || tweet.handle?.replace('@', '').charAt(0) || 'X').toUpperCase();

        if (avatar) {
            return (
                <Image
                    source={{ uri: avatar }}
                    className="w-9 h-9 rounded-full"
                    resizeMode="cover"
                />
            );
        }

        return (
            <View className="w-9 h-9 rounded-full bg-zinc-900 dark:bg-white items-center justify-center">
                <Text className="text-white dark:text-zinc-900 text-[11px] font-bold">{fallback}</Text>
            </View>
        );
    };

    return (
        <View className={className}>
            <Text
                className="text-lg text-zinc-900 dark:text-white mb-4 px-6"
                style={{ fontFamily: 'DMSans_700Bold' }}
            >
                X Yansimalari
            </Text>

            <View className="px-4 gap-3">
                {visibleTweets.map((item, index) => (
                    <View key={`social-${index}`} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4">
                        <View className="flex-row items-center gap-3 mb-2.5">
                            {renderAvatar(item)}
                            <View className="flex-1">
                                <Text
                                    className="text-[14px] text-zinc-900 dark:text-white"
                                    style={{ fontFamily: 'DMSans_700Bold' }}
                                    numberOfLines={1}
                                >
                                    {item.author || item.handle}
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

                        <Text
                            className="text-[14px] text-zinc-700 dark:text-zinc-300 leading-[21px]"
                            style={{ fontFamily: 'DMSans_400Regular' }}
                        >
                            {item.text}
                        </Text>
                    </View>
                ))}
            </View>

            {hasMore && (
                <View className="px-4 pt-3">
                    <TouchableOpacity
                        onPress={() => setExpanded(prev => !prev)}
                        className="self-center px-4 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800"
                        activeOpacity={0.8}
                    >
                        <Text className="text-[13px] text-zinc-700 dark:text-zinc-200" style={{ fontFamily: 'DMSans_700Bold' }}>
                            {expanded ? 'Daha az goster' : `${tweetList.length - 6} tweet daha goster`}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
});

SocialHighlights.displayName = 'SocialHighlights';
