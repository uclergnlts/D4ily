import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { ChevronDown, ChevronUp, MessageCircle } from 'lucide-react-native';
import type { DigestSection, SectionTweet } from '../../types';

interface DigestSectionListProps {
    sections: DigestSection[];
    className?: string;
}

export const DigestSectionList = React.memo(function DigestSectionList({ sections, className }: DigestSectionListProps) {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
    const [tweetExpansion, setTweetExpansion] = useState<Record<number, boolean>>({});

    if (!sections || sections.length === 0) return null;

    const toggleSection = (index: number) => {
        setExpandedIndex(prev => prev === index ? null : index);
    };

    const toggleTweets = (index: number) => {
        setTweetExpansion(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const renderAvatar = (tweet: SectionTweet) => {
        const avatar = typeof tweet.profileImageUrl === 'string' ? tweet.profileImageUrl.trim() : '';
        const fallback = (tweet.author?.trim()?.charAt(0) || tweet.handle?.replace('@', '').charAt(0) || 'X').toUpperCase();

        if (avatar) {
            return (
                <Image
                    source={{ uri: avatar }}
                    className="w-7 h-7 rounded-full"
                    resizeMode="cover"
                />
            );
        }

        return (
            <View className="w-7 h-7 rounded-full bg-zinc-900 dark:bg-white items-center justify-center">
                <Text className="text-white dark:text-zinc-900 text-[10px] font-bold">{fallback}</Text>
            </View>
        );
    };

    return (
        <View className={className}>
            <Text
                className="text-lg text-zinc-900 dark:text-white mb-4 px-6"
                style={{ fontFamily: 'DMSans_700Bold' }}
            >
                Kategoriler
            </Text>

            <View className="px-4 gap-3">
                {sections.map((section, index) => {
                    const isExpanded = expandedIndex === index;
                    const isTweetExpanded = !!tweetExpansion[index];
                    const tweets = section.tweets || [];
                    const visibleTweets = isTweetExpanded ? tweets : tweets.slice(0, 4);

                    return (
                        <View
                            key={index}
                            className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden"
                        >
                            <TouchableOpacity
                                onPress={() => toggleSection(index)}
                                className="flex-row items-center justify-between p-4"
                                activeOpacity={0.7}
                            >
                                <View className="flex-row items-center gap-3 flex-1">
                                    <Text className="text-xl">{section.icon}</Text>
                                    <View className="flex-1">
                                        <Text
                                            className="text-[16px] text-zinc-900 dark:text-white"
                                            style={{ fontFamily: 'DMSans_700Bold' }}
                                        >
                                            {section.category}
                                        </Text>
                                        {typeof section.importanceScore === 'number' && (
                                            <Text className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5" style={{ fontFamily: 'DMSans_500Medium' }}>
                                                Onem skoru: %{Math.round(section.importanceScore * 100)}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                                {isExpanded
                                    ? <ChevronUp size={20} color="#a1a1aa" />
                                    : <ChevronDown size={20} color="#a1a1aa" />
                                }
                            </TouchableOpacity>

                            {isExpanded && (
                                <View className="px-4 pb-4">
                                    <Text
                                        className="text-[15px] text-zinc-600 dark:text-zinc-300 mb-3"
                                        style={{ fontFamily: 'DMSans_400Regular', lineHeight: 24 }}
                                    >
                                        {section.summary}
                                    </Text>

                                    {section.highlights.length > 0 && (
                                        <View className="mb-3 gap-2">
                                            {section.highlights.map((highlight, hIdx) => (
                                                <View key={hIdx} className="flex-row items-start gap-2">
                                                    <View className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                                                    <Text
                                                        className="text-[14px] text-zinc-700 dark:text-zinc-300 flex-1"
                                                        style={{ fontFamily: 'DMSans_500Medium', lineHeight: 21 }}
                                                    >
                                                        {highlight}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {tweets.length > 0 ? (
                                        <View className="gap-2">
                                            {visibleTweets.map((tweet, tIdx) => (
                                                <View key={tIdx} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
                                                    <View className="flex-row items-center gap-2 mb-1.5">
                                                        {renderAvatar(tweet)}
                                                        <Text
                                                            className="text-[12px] text-zinc-900 dark:text-zinc-200 flex-1"
                                                            style={{ fontFamily: 'DMSans_700Bold' }}
                                                            numberOfLines={1}
                                                        >
                                                            {tweet.author || tweet.handle}
                                                        </Text>
                                                        <Text
                                                            className="text-[11px] text-zinc-400"
                                                            style={{ fontFamily: 'DMSans_400Regular' }}
                                                            numberOfLines={1}
                                                        >
                                                            {tweet.handle}
                                                        </Text>
                                                    </View>
                                                    <Text
                                                        className="text-[13px] text-zinc-600 dark:text-zinc-300"
                                                        style={{ fontFamily: 'DMSans_400Regular', lineHeight: 20 }}
                                                    >
                                                        {tweet.text}
                                                    </Text>
                                                </View>
                                            ))}

                                            {tweets.length > 4 && (
                                                <TouchableOpacity onPress={() => toggleTweets(index)} className="self-start mt-1" activeOpacity={0.8}>
                                                    <Text className="text-[12px] text-blue-600 dark:text-blue-400" style={{ fontFamily: 'DMSans_700Bold' }}>
                                                        {isTweetExpanded ? 'Daha az goster' : `${tweets.length - 4} tweet daha goster`}
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    ) : section.tweetContext ? (
                                        <View className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 flex-row items-start gap-2">
                                            <MessageCircle size={14} color="#a1a1aa" className="mt-0.5" />
                                            <Text
                                                className="text-[13px] text-zinc-500 dark:text-zinc-400 flex-1"
                                                style={{ fontFamily: 'DMSans_400Regular', lineHeight: 20 }}
                                            >
                                                {section.tweetContext}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>
                            )}
                        </View>
                    );
                })}
            </View>
        </View>
    );
});

DigestSectionList.displayName = 'DigestSectionList';
