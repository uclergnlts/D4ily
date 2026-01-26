import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, FlatList, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, X, TrendingUp } from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withSequence } from 'react-native-reanimated';

import { useCategories, useSearchArticles } from '../../src/hooks/useExplore';
import { ArticleCard } from '../../src/components/article/ArticleCard';
import { Article, Category } from '../../src/types';

const CategoryPill = ({ item, isSelected, onPress }: { item: Category, isSelected: boolean, onPress: () => void }) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isSelected) {
      scale.value = withSequence(withSpring(1.05), withSpring(1));
    }
  }, [isSelected, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        className={`px-5 py-2.5 rounded-full mr-3 border shadow-sm ${isSelected
          ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white'
          : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
          }`}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text className={`font-semibold text-[13px] ${isSelected ? 'text-white dark:text-zinc-900' : 'text-zinc-600 dark:text-zinc-300'
          }`}>
          {item.name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function ExploreScreen() {
  const [searchText, setSearchText] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const _router = useRouter(); // Kept for future navigation
  const categoriesQuery = useCategories();

  // Debounce logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchText);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchText]);

  const searchQuery = useSearchArticles(debouncedQuery, selectedCategory);

  const renderCategory = ({ item }: { item: Category }) => (
    <CategoryPill
      item={item}
      isSelected={selectedCategory === item.id}
      onPress={() => {
        setSelectedCategory(selectedCategory === item.id ? null : item.id);
        if (selectedCategory !== item.id) Keyboard.dismiss();
      }}
    />
  );

  const renderArticle = ({ item }: { item: Article }) => (
    <ArticleCard article={item} />
  );

  return (
    <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-black" edges={['top']}>
      {/* Header & Search */}
      <View className="px-4 pt-2 pb-4 bg-zinc-50 dark:bg-black z-10">
        <Text className="text-3xl font-black text-zinc-900 dark:text-white mb-4 tracking-tight">
          Keşfet
        </Text>

        <View className="flex-row items-center bg-white dark:bg-zinc-900 rounded-2xl px-4 py-3.5 shadow-sm border border-zinc-200/50 dark:border-zinc-800">
          <Search size={22} color="#71717a" />
          <TextInput
            className="flex-1 ml-3 text-zinc-900 dark:text-white text-[15px] font-medium leading-tight"
            placeholder="Haber, kaynak veya konu ara..."
            placeholderTextColor="#a1a1aa"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            style={{ paddingVertical: 0 }} // Android fix
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} hitSlop={8}>
              <View className="bg-zinc-200 dark:bg-zinc-700 rounded-full p-1">
                <X size={12} color="#71717a" />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Categories */}
        <View className="mt-5">
          {categoriesQuery.isLoading ? (
            <View className="flex-row gap-2">
              {[1, 2, 3, 4].map(i => <View key={i} className="w-20 h-9 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />)}
            </View>
          ) : (
            <FlatList
              data={categoriesQuery.data || []}
              renderItem={renderCategory}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 20 }}
            />
          )}
        </View>
      </View>

      {/* Results or Empty State */}
      <View className="flex-1 px-0">
        {searchQuery.isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#000" />
          </View>
        ) : searchQuery.data && searchQuery.data.length > 0 ? (
          // @ts-ignore: FlashList types issue with estimatedItemSize
          <FlashList<Article>
            data={searchQuery.data}
            renderItem={renderArticle}
            estimatedItemSize={280}
            contentContainerStyle={{ paddingBottom: 20, paddingTop: 8 }}
            keyboardDismissMode="on-drag"
          />
        ) : debouncedQuery.length > 0 || selectedCategory ? (
          <View className="flex-1 items-center justify-center px-10">
            <View className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-full items-center justify-center mb-4">
              <Search size={32} color="#d4d4d8" />
            </View>
            <Text className="text-zinc-900 dark:text-white font-bold text-lg text-center mb-1">Sonuç Bulunamadı</Text>
            <Text className="text-zinc-500 text-center leading-relaxed">
              Farklı anahtar kelimelerle aramayı deneyebilirsin.
            </Text>
          </View>
        ) : (

          <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
            <View className="mt-8 mb-6">
              <View className="flex-row items-center gap-2 mb-4">
                <TrendingUp size={20} color="#006FFF" />
                <Text className="text-lg font-bold text-zinc-900 dark:text-white">Trend Başlıklar</Text>
              </View>

              <View className="flex-row flex-wrap gap-2.5">
                {[
                  '#Ekonomi', '#Seçim2025', '#YapayZeka', '#Borsa İstanbul',
                  '#SüperLig', '#Teknoloji', '#Bitcoin', '#KüreselIsınma',
                  '#İstanbul', '#Eğitim'
                ].map((tag, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setSearchText(tag)}
                    className="bg-zinc-50 dark:bg-zinc-900 px-4 py-2.5 rounded-full border border-zinc-200/60 dark:border-zinc-800 active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors"
                  >
                    <Text className="text-[13px] font-semibold text-zinc-600 dark:text-zinc-400">
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Quick Suggestions */}
            <View className="mb-8">
              <Text className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Önerilen Kaynaklar</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
                {['BBC Türkçe', 'Webrazzi', 'Ekonomist', '140journos'].map((source, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setSearchText(source)}
                    className="mr-3 w-32 h-20 bg-blue-50 dark:bg-blue-900/10 rounded-2xl items-center justify-center border border-blue-100 dark:border-blue-900/30"
                  >
                    <Text className="font-bold text-blue-700 dark:text-blue-400 text-center">{source}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </ScrollView >
        )
        }
      </View >
    </SafeAreaView >
  );
}
