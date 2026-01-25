import React, { useState } from 'react';
import { View, Text, ActivityIndicator, RefreshControl, Switch, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Link } from 'expo-router';
import { FlaskConical, Menu } from 'lucide-react-native';

import { useFeed } from '../../src/hooks/useFeed';
import { useBalancedFeed } from '../../src/hooks/useBalancedFeed';
import { ArticleCard } from '../../src/components/article/ArticleCard';
import { Article } from '../../src/types';

// Components
import { BalancedFeedScreen } from '../../src/components/feed/BalancedFeedScreen';
import { FeedFilterBar } from '../../src/components/feed/FeedFilterBar';
import { SideMenu } from '../../src/components/navigation/SideMenu';
import { CountrySelector } from '../../src/components/navigation/CountrySelector';
import { useAppStore } from '../../src/store/useAppStore';

import { useColorScheme } from 'react-native';

export default function FeedScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isBalanced, setIsBalanced] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState({ id: 'all', name: 'Tümü' });

  const { toggleSideMenu, isSideMenuOpen, selectedCountry } = useAppStore();

  // Normal Feed
  const feedQuery = useFeed(selectedCountry);
  const feedArticles = React.useMemo(() => {
    return feedQuery.data?.pages.flatMap(page => page.articles) || [];
  }, [feedQuery.data]);

  // Balanced Feed
  const balancedQuery = useBalancedFeed(selectedCountry);

  // Render Item for Normal Feed
  const renderItem = React.useCallback(({ item }: { item: Article }) => (
    <ArticleCard article={item} />
  ), []);

  const renderFooter = React.useCallback(() => {
    if (!feedQuery.isFetchingNextPage) return <View className="h-4" />;
    return (
      <View className="py-4 items-center">
        <ActivityIndicator color="#006FFF" />
      </View>
    );
  }, [feedQuery.isFetchingNextPage]);

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-black">
      {/* Side Menu Overlay */}
      <SideMenu />

      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 shadow-sm z-10 flex-row items-center justify-between relative">

          {/* Left: Hamburger */}
          <TouchableOpacity
            onPress={toggleSideMenu}
            className="p-1 -ml-1 z-20"
          >
            <Menu size={24} color={isDark ? "#ffffff" : "#18181b"} />
          </TouchableOpacity>

          {/* Center: Logo */}
          <View className="absolute left-0 right-0 top-0 bottom-0 items-center justify-center flex-row pointer-events-none">
            <View className="flex-row items-center">
              {/* Note: If you want to match the exact font of the image, you might need a custom font or SVG logo. 
                   For now, using the existing styled text centered. */}
              <Text className="text-[22px] font-black text-zinc-900 dark:text-white tracking-tighter">
                D<Text className="text-[#006FFF]">4</Text>ILY
              </Text>
            </View>
          </View>

          {/* Right: Placeholder for balance or future icons */}
          <View className="w-8" />
        </View>

        {/* Content */}
        {isBalanced ? (
          <BalancedFeedScreen
            isLoading={balancedQuery.isLoading}
            proGovArticles={balancedQuery.data?.proGov || []}
            mixedArticles={balancedQuery.data?.mixed || []}
            antiGovArticles={balancedQuery.data?.antiGov || []}
            onRefresh={() => balancedQuery.refetch()}
          />
        ) : (
          <View className="flex-1">
            <FeedFilterBar
              selectedCategory={selectedCategory.id}
              onSelectCategory={(id) => setSelectedCategory({ id, name: '' })}
            />

            {feedQuery.isLoading && !feedArticles.length ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#006FFF" />
              </View>
            ) : (
              <View className="flex-1 px-0">
                {/* @ts-ignore: FlashList types issue with estimatedItemSize */}
                <FlashList<Article>
                  data={feedArticles || []}
                  renderItem={renderItem}
                  estimatedItemSize={200}
                  onEndReached={() => {
                    if (feedQuery.hasNextPage) feedQuery.fetchNextPage();
                  }}
                  onEndReachedThreshold={0.5}
                  ListFooterComponent={renderFooter}
                  refreshControl={
                    <RefreshControl
                      refreshing={feedQuery.isRefetching}
                      onRefresh={() => feedQuery.refetch()}
                      tintColor="#006FFF"
                    />
                  }
                  contentContainerStyle={{ paddingVertical: 12 }}
                />
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
