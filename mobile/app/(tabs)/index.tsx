import React, { useState } from 'react';
import { View, Text, ActivityIndicator, RefreshControl, Switch, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Link } from 'expo-router';
import { FlaskConical, Menu, BellRing } from 'lucide-react-native';

import { useFeed } from '../../src/hooks/useFeed';
import { useBalancedFeed } from '../../src/hooks/useBalancedFeed';
import { ArticleCard } from '../../src/components/article/ArticleCard';
import { FeaturedCarousel } from '../../src/components/feed/FeaturedCarousel';


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

  // Featured Articles (Mock split for now, later can be from API)
  const featuredArticles = React.useMemo(() => {
    return feedArticles.slice(0, 5);
  }, [feedArticles]);

  const listArticles = React.useMemo(() => {
    return feedArticles.slice(5);
  }, [feedArticles]);

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

  // Header Component for FlashList to scroll together
  const ListHeader = React.useCallback(() => (
    <View>
      <FeedFilterBar
        selectedCategory={selectedCategory.id}
        onSelectCategory={(id) => setSelectedCategory({ id, name: '' })}
        className="mb-10 pb-2"
      />
      <FeaturedCarousel articles={featuredArticles} />
      <View className="px-4 mb-2 mt-4">
        <Text className="text-[17px] font-bold text-zinc-500 dark:text-zinc-400">
          Haberler
        </Text>
      </View>
    </View>
  ), [selectedCategory.id, featuredArticles]);

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-black">
      {/* Side Menu Overlay */}
      <SideMenu />

      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="px-4 py-3 bg-zinc-50 dark:bg-black z-10 flex-row items-center justify-between relative">

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
              <Text className="text-[24px] font-black text-zinc-900 dark:text-white tracking-tighter">
                D<Text className="text-[#006FFF]">4</Text>ily
              </Text>
            </View>
          </View>

          {/* Right: Notifications */}
          <View className="flex-row items-center gap-4">
            <TouchableOpacity>
              <BellRing size={24} color={isDark ? "#ffffff" : "#18181b"} />
            </TouchableOpacity>
          </View>
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
            {feedQuery.isLoading && !feedArticles.length ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#006FFF" />
              </View>
            ) : (
              <View className="flex-1 px-0">
                {/* @ts-ignore: FlashList types issue with estimatedItemSize */}
                <FlashList<Article>
                  data={listArticles || []}
                  renderItem={renderItem}
                  estimatedItemSize={200}
                  onEndReached={() => {
                    if (feedQuery.hasNextPage) feedQuery.fetchNextPage();
                  }}
                  onEndReachedThreshold={0.5}
                  ListHeaderComponent={ListHeader}
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
