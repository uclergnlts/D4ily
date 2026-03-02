import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Newspaper, MessageSquare } from 'lucide-react-native';

import { useAppStore } from '../../src/store/useAppStore';
import { useThemeStore } from '../../src/store/useThemeStore';
import { useFeed } from '../../src/hooks/useFeed';
import { useTweets } from '../../src/hooks/useTweets';
import { NewsCard } from '../../src/components/article/NewsCard';
import { TweetCard } from '../../src/components/tweet/TweetCard';
import { CountrySelector } from '../../src/components/navigation/CountrySelector';
import type { Article, Tweet } from '../../src/types';

type ExploreTab = 'articles' | 'tweets';

const TABS: { id: ExploreTab; label: string; icon: React.ElementType }[] = [
    { id: 'articles', label: 'Haberler', icon: Newspaper },
    { id: 'tweets', label: 'Tweetler', icon: MessageSquare },
];

export default function ExploreScreen() {
    const { selectedCountry } = useAppStore();
    const activeScheme = useThemeStore(state => state.activeScheme);
    const isDark = activeScheme === 'dark';

    const [activeTab, setActiveTab] = useState<ExploreTab>('articles');
    const [containerWidth, setContainerWidth] = useState(0);

    // Data hooks
    const feedQuery = useFeed(selectedCountry);
    const tweetsQuery = useTweets(selectedCountry);

    // Animated tab indicator
    const indicatorPosition = useSharedValue(0);

    useEffect(() => {
        const tabIndex = TABS.findIndex(t => t.id === activeTab);
        const tabWidth = (containerWidth - 8) / 2;

        if (containerWidth > 0) {
            indicatorPosition.value = withSpring(tabIndex * tabWidth, {
                damping: 20,
                stiffness: 150,
            });
        }
    }, [activeTab, containerWidth, indicatorPosition]);

    const indicatorStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: indicatorPosition.value }],
        width: (containerWidth - 8) / 2,
    }));

    const handleLayout = (e: LayoutChangeEvent) => {
        setContainerWidth(e.nativeEvent.layout.width);
    };

    // Flatten paginated data
    const articles = useMemo(
        () => feedQuery.data?.pages.flatMap(p => p.articles) ?? [],
        [feedQuery.data],
    );

    const tweets = useMemo(
        () => tweetsQuery.data?.pages.flatMap(p => p.tweets) ?? [],
        [tweetsQuery.data],
    );

    const isLoading = activeTab === 'articles' ? feedQuery.isLoading : tweetsQuery.isLoading;
    const isRefreshing = activeTab === 'articles'
        ? (feedQuery.isRefetching && !feedQuery.isFetchingNextPage)
        : (tweetsQuery.isRefetching && !tweetsQuery.isFetchingNextPage);

    const onRefresh = useCallback(() => {
        if (activeTab === 'articles') feedQuery.refetch();
        else tweetsQuery.refetch();
    }, [activeTab, feedQuery, tweetsQuery]);

    const onEndReached = useCallback(() => {
        if (activeTab === 'articles' && feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) {
            feedQuery.fetchNextPage();
        }
        if (activeTab === 'tweets' && tweetsQuery.hasNextPage && !tweetsQuery.isFetchingNextPage) {
            tweetsQuery.fetchNextPage();
        }
    }, [activeTab, feedQuery, tweetsQuery]);

    const renderArticle = useCallback(({ item }: { item: Article }) => (
        <NewsCard article={item} />
    ), []);

    const renderTweet = useCallback(({ item }: { item: Tweet }) => (
        <TweetCard tweet={item} />
    ), []);

    return (
        <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark" edges={['top']}>
            {/* Header */}
            <View className="px-5 pt-4 pb-4 bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark">
                <View className="flex-row items-center justify-between mt-2">
                    <Text className="text-display-lg font-display-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
                        Haberler
                    </Text>

                    <CountrySelector />
                </View>
            </View>

            {/* Tab selector */}
            <View
                className="mx-4 my-3 bg-zinc-100 dark:bg-zinc-900/50 rounded-xl p-1 relative border border-zinc-200/50 dark:border-zinc-800"
                onLayout={handleLayout}
            >
                {/* Animated Indicator */}
                {containerWidth > 0 && (
                    <Animated.View
                        className="absolute top-1 left-1 bottom-1 bg-white dark:bg-zinc-800 rounded-lg shadow-sm"
                        style={indicatorStyle}
                    />
                )}

                {/* Tab Buttons */}
                <View className="flex-row">
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;
                        return (
                            <TouchableOpacity
                                key={tab.id}
                                onPress={() => setActiveTab(tab.id)}
                                className="flex-1 flex-row py-2.5 items-center justify-center gap-2 z-10"
                                activeOpacity={0.7}
                            >
                                <Icon size={16} color={isActive ? '#0A66C2' : '#a1a1aa'} />
                                <Text className={`text-xs font-bold leading-none ${isActive ? 'text-primary' : 'text-zinc-400 dark:text-zinc-500'}`}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Content */}
            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#0A66C2" />
                </View>
            ) : (
                <View className="flex-1 min-h-[2px]">
                    {activeTab === 'articles' ? (
                        /* @ts-ignore: FlashList types */
                        <FlashList<Article>
                            data={articles}
                            renderItem={renderArticle}
                            keyExtractor={(item) => item.id}
                            estimatedItemSize={120}
                            onEndReached={onEndReached}
                            onEndReachedThreshold={0.5}
                            refreshing={isRefreshing}
                            onRefresh={onRefresh}
                            contentContainerStyle={{ paddingVertical: 8 }}
                            ListFooterComponent={
                                feedQuery.isFetchingNextPage ? (
                                    <View className="py-6 items-center">
                                        <ActivityIndicator size="small" color="#0A66C2" />
                                    </View>
                                ) : null
                            }
                            ListEmptyComponent={
                                <View className="items-center justify-center py-20 px-4">
                                    <Text className="text-zinc-400 text-center font-medium">
                                        Henüz haber bulunamadı.
                                    </Text>
                                </View>
                            }
                        />
                    ) : (
                        /* @ts-ignore: FlashList types */
                        <FlashList<Tweet>
                            data={tweets}
                            renderItem={renderTweet}
                            keyExtractor={(item) => item.id}
                            estimatedItemSize={180}
                            onEndReached={onEndReached}
                            onEndReachedThreshold={0.5}
                            refreshing={isRefreshing}
                            onRefresh={onRefresh}
                            contentContainerStyle={{ paddingVertical: 8 }}
                            ListFooterComponent={
                                tweetsQuery.isFetchingNextPage ? (
                                    <View className="py-6 items-center">
                                        <ActivityIndicator size="small" color="#0A66C2" />
                                    </View>
                                ) : null
                            }
                            ListEmptyComponent={
                                <View className="items-center justify-center py-20 px-4">
                                    <Text className="text-zinc-400 text-center font-medium">
                                        Henüz tweet bulunamadı.
                                    </Text>
                                </View>
                            }
                        />
                    )}
                </View>
            )}
        </SafeAreaView>
    );
}
