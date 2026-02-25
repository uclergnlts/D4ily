import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Keyboard } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, X, TrendingUp, Newspaper, Users, Hash, Menu, Bell } from 'lucide-react-native';
import { useAppStore } from '../../src/store/useAppStore';

import { useSearch, useSearchSuggestions, useTrending } from '../../src/hooks/useSearch';
import { useStaggeredEntry } from '../../src/hooks/useStaggeredEntry';
import type { SearchArticle, SearchSource, SearchTopic } from '../../src/api/services/searchService';
import { useThemeStore } from '../../src/store/useThemeStore';

type SearchTab = 'all' | 'articles' | 'sources' | 'topics';

const TAB_OPTIONS: { key: SearchTab; label: string; icon: React.ElementType }[] = [
    { key: 'all', label: 'Tümü', icon: Search },
    { key: 'articles', label: 'Haberler', icon: Newspaper },
    { key: 'sources', label: 'Kaynaklar', icon: Users },
    { key: 'topics', label: 'Konular', icon: Hash },
];

export default function ExploreScreen() {
    const router = useRouter();
    const { selectedCountry } = useAppStore();
    const activeScheme = useThemeStore(state => state.activeScheme);
    const isDark = activeScheme === 'dark';

    const [searchText, setSearchText] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [activeTab, setActiveTab] = useState<SearchTab>('all');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const { getEntryAnimation } = useStaggeredEntry();

    const { data: searchResults, isLoading: searchLoading } = useSearch(debouncedQuery, selectedCountry, activeTab);
    const { data: suggestions } = useSearchSuggestions(searchText.trim(), selectedCountry);
    const { data: trending, isLoading: trendingLoading } = useTrending(selectedCountry);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchText.trim());
            setShowSuggestions(false);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchText]);

    const handleSuggestionPress = (suggestion: string) => {
        setSearchText(suggestion);
        setDebouncedQuery(suggestion);
        setShowSuggestions(false);
        Keyboard.dismiss();
    };

    const handleTextChange = (text: string) => {
        setSearchText(text);
        setShowSuggestions(text.trim().length >= 2);
    };

    // Extract results based on response shape
    const articles: SearchArticle[] = searchResults?.results?.articles || [];
    const sources: SearchSource[] = searchResults?.results?.sources || [];
    const topics: SearchTopic[] = searchResults?.results?.topics || [];
    const hasResults = articles.length > 0 || sources.length > 0 || topics.length > 0;

    return (
        <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark" edges={['top']}>
            <View className="px-5 pt-4 pb-4 bg-surface-light dark:bg-surface-dark z-10 border-b border-border-light dark:border-border-dark">
                {/* Header: Menu - Title - Bell */}
                <View className="flex-row items-center justify-between mb-6 mt-2">
                    <TouchableOpacity
                        onPress={() => useAppStore.getState().toggleSideMenu()}
                        className="w-11 h-11 items-center justify-center rounded-full bg-surface-light-subtle dark:bg-surface-dark-subtle active:scale-95 transition-transform"
                    >
                        <Menu size={22} color={isDark ? "#ffffff" : "#18181b"} />
                    </TouchableOpacity>

                    <Text className="text-display-lg font-display-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
                        Keşfet
                    </Text>

                    <TouchableOpacity
                        onPress={() => router.push('/notifications')}
                        className="w-11 h-11 items-center justify-center rounded-full bg-surface-light-subtle dark:bg-surface-dark-subtle active:scale-95 transition-transform"
                    >
                        <Bell size={20} color={isDark ? "#ffffff" : "#18181b"} />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View
                    className="flex-row items-center bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-full px-5 py-4 border border-border-light dark:border-border-dark shadow-sm shadow-zinc-200/50 dark:shadow-none"
                    accessibilityRole="search"
                >
                    <Search size={22} color="#A1A1AA" />
                    <TextInput
                        className="flex-1 ml-3 text-zinc-900 dark:text-white text-body-lg font-sans-medium"
                        placeholder="Haber, kaynak veya konu arayın..."
                        placeholderTextColor="#A1A1AA"
                        value={searchText}
                        onChangeText={handleTextChange}
                        returnKeyType="search"
                        onSubmitEditing={() => {
                            setDebouncedQuery(searchText.trim());
                            setShowSuggestions(false);
                        }}
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity
                            onPress={() => { setSearchText(''); setDebouncedQuery(''); }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            className="bg-surface-light-subtle dark:bg-surface-dark-subtle rounded-full p-1.5"
                        >
                            <X size={14} color="#71717a" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Suggestions dropdown */}
                {showSuggestions && suggestions && suggestions.length > 0 && (
                    <View className="mt-2 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-3xl border border-border-light dark:border-border-dark overflow-hidden shadow-sm shadow-zinc-200/50 dark:shadow-none absolute top-40 left-5 right-5 z-50">
                        {suggestions.map((s, i) => (
                            <TouchableOpacity
                                key={i}
                                onPress={() => handleSuggestionPress(s)}
                                className={`flex-row items-center px-5 py-4 ${i < suggestions.length - 1 ? 'border-b border-border-light dark:border-border-dark' : ''}`}
                            >
                                <Search size={16} color="#a1a1aa" />
                                <Text
                                    className="ml-3 text-body-md text-zinc-700 dark:text-zinc-300 font-sans-medium"
                                >
                                    {s}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            {/* Search type tabs - only show when searching */}
            {debouncedQuery.length >= 2 && (
                <View className="px-5 py-4 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 px-5">
                        <View className="flex-row gap-3">
                            {TAB_OPTIONS.map(({ key, label, icon: Icon }) => {
                                const isActive = activeTab === key;
                                return (
                                    <TouchableOpacity
                                        key={key}
                                        onPress={() => setActiveTab(key)}
                                        className={`flex-row items-center gap-2 px-4 py-2.5 rounded-full ${isActive ? 'bg-primary dark:bg-primary border border-transparent' : 'bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark shadow-sm shadow-zinc-200/50 dark:shadow-none'}`}
                                    >
                                        <Icon size={16} color={isActive ? '#ffffff' : '#71717a'} />
                                        <Text
                                            className={`text-body-sm tracking-wide ${isActive ? 'text-white font-sans-bold' : 'text-zinc-600 dark:text-zinc-400 font-sans-medium'}`}
                                        >
                                            {label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>
                </View>
            )}

            {/* Content */}
            {searchLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#0A66C2" />
                </View>
            ) : debouncedQuery.length >= 2 ? (
                <ScrollView className="flex-1 px-5 pt-6" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                    {!hasResults ? (
                        <View className="flex-1 items-center justify-center py-20 mt-10 rounded-4xl border-2 border-dashed border-border-light dark:border-border-dark bg-surface-light-subtle dark:bg-surface-dark-subtle">
                            <View className="w-16 h-16 rounded-3xl bg-surface-light-elevated dark:bg-surface-dark-elevated shadow-sm shadow-zinc-200/50 dark:shadow-none items-center justify-center mb-5">
                                <Search size={30} color={isDark ? "#71717a" : "#A1A1AA"} />
                            </View>
                            <Text className="text-display-lg font-display-extrabold text-zinc-900 dark:text-white text-center mb-2 tracking-tight">"{debouncedQuery}"</Text>
                            <Text className="text-body-md text-zinc-500 text-center font-sans tracking-wide px-8">İçin herhangi bir sonuç bulamadık. Farklı kelimeler denemeye ne dersin?</Text>
                        </View>
                    ) : (
                        <>
                            {/* Articles */}
                            {articles.length > 0 && (activeTab === 'all' || activeTab === 'articles') && (
                                <View className="mb-8">
                                    {activeTab === 'all' && (
                                        <View className="flex-row items-center gap-2 mb-4">
                                            <Newspaper size={20} color="#0A66C2" />
                                            <Text className="text-display-lg text-zinc-900 dark:text-white font-display-extrabold tracking-tight">Haberler <Text className="text-zinc-400 text-body-lg ml-2 font-sans-medium">({articles.length})</Text></Text>
                                        </View>
                                    )}
                                    {articles.map((article, i) => (
                                        <Animated.View key={article.id} entering={getEntryAnimation(i)}>
                                            <TouchableOpacity
                                                onPress={() => router.push({
                                                    pathname: '/article/[id]',
                                                    params: { id: article.id.toString(), country: article.country },
                                                })}
                                                className="bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-3xl p-5 mb-4 border border-border-light dark:border-border-dark shadow-sm shadow-zinc-200/50 dark:shadow-none active:scale-95 transition-transform"
                                                activeOpacity={0.7}
                                            >
                                                <Text className="text-zinc-900 dark:text-white text-body-lg font-sans-bold mb-2 leading-[22px]" numberOfLines={2}>
                                                    {article.translatedTitle}
                                                </Text>
                                                <Text className="text-zinc-500 dark:text-zinc-400 text-body-sm font-sans leading-[18px] mb-4" numberOfLines={2}>
                                                    {article.summary}
                                                </Text>
                                                <Text className="text-body-xs text-zinc-400 font-sans-medium tracking-wide">
                                                    {new Date(article.publishedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </Text>
                                            </TouchableOpacity>
                                        </Animated.View>
                                    ))}
                                </View>
                            )}

                            {/* Sources */}
                            {sources.length > 0 && (activeTab === 'all' || activeTab === 'sources') && (
                                <View className="mb-8">
                                    {activeTab === 'all' && (
                                        <View className="flex-row items-center gap-2 mb-4">
                                            <Users size={20} color="#818CF8" />
                                            <Text className="text-display-lg text-zinc-900 dark:text-white font-display-extrabold tracking-tight">Kaynaklar <Text className="text-zinc-400 text-body-lg ml-2 font-sans-medium">({sources.length})</Text></Text>
                                        </View>
                                    )}
                                    {sources.map((source, i) => (
                                        <Animated.View key={source.id} entering={getEntryAnimation(i)}>
                                            <View className="bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-3xl p-5 mb-4 border border-border-light dark:border-border-dark shadow-sm shadow-zinc-200/50 dark:shadow-none flex-row items-center gap-4">
                                                <View className="w-12 h-12 rounded-full bg-surface-light-subtle dark:bg-surface-dark-subtle items-center justify-center">
                                                    <Users size={20} color="#A1A1AA" />
                                                </View>
                                                <View className="flex-1">
                                                    <Text className="text-zinc-900 dark:text-white text-body-lg font-sans-bold tracking-tight">
                                                        {source.sourceName}
                                                    </Text>
                                                    <Text className="text-body-xs text-zinc-400 font-sans-medium tracking-wider mt-1">
                                                        {source.countryCode?.toUpperCase()} KANALI
                                                    </Text>
                                                </View>
                                            </View>
                                        </Animated.View>
                                    ))}
                                </View>
                            )}

                            {/* Topics */}
                            {topics.length > 0 && (activeTab === 'all' || activeTab === 'topics') && (
                                <View className="mb-8">
                                    {activeTab === 'all' && (
                                        <View className="flex-row items-center gap-2 mb-4">
                                            <Hash size={20} color="#FBBF24" />
                                            <Text className="text-display-lg text-zinc-900 dark:text-white font-display-extrabold tracking-tight">Konular <Text className="text-zinc-400 text-body-lg ml-2 font-sans-medium">({topics.length})</Text></Text>
                                        </View>
                                    )}
                                    <View className="flex-row flex-wrap gap-3">
                                        {topics.map((topic, i) => (
                                            <Animated.View key={topic.id} entering={getEntryAnimation(i)}>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setSearchText(topic.name);
                                                        setDebouncedQuery(topic.name);
                                                        setActiveTab('articles');
                                                    }}
                                                    className="bg-surface-light-elevated dark:bg-surface-dark-elevated px-5 py-3 rounded-full border border-border-light dark:border-border-dark shadow-sm shadow-zinc-200/50 dark:shadow-none active:scale-95 transition-transform"
                                                >
                                                    <Text className="text-body-md text-zinc-800 dark:text-zinc-200 font-sans-bold">
                                                        {topic.hashtag || topic.name}
                                                    </Text>
                                                    {topic.articleCount > 0 && (
                                                        <Text className="text-[10px] text-zinc-400 mt-1 font-sans-medium tracking-wide">
                                                            {topic.articleCount} YAKIN ZAMANLI HABER
                                                        </Text>
                                                    )}
                                                </TouchableOpacity>
                                            </Animated.View>
                                        ))}
                                    </View>
                                </View>
                            )}
                        </>
                    )}
                </ScrollView>
            ) : (
                /* Trending / empty state */
                <ScrollView className="flex-1 px-5 pt-6" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                    {trendingLoading ? (
                        <View className="items-center py-12">
                            <ActivityIndicator size="large" color="#0A66C2" />
                        </View>
                    ) : trending && trending.length > 0 ? (
                        <View className="mb-10">
                            <View className="flex-row items-center gap-3 mb-6">
                                <View className="bg-primary-50 dark:bg-primary-900/20 p-2 rounded-xl">
                                    <TrendingUp size={20} color="#0A66C2" />
                                </View>
                                <Text className="text-display-xl text-zinc-900 dark:text-white font-display-extrabold tracking-tight">Popüler Aramalar</Text>
                            </View>
                            {trending.map((item, i) => (
                                <Animated.View key={i} entering={getEntryAnimation(i)}>
                                    <TouchableOpacity
                                        onPress={() => handleSuggestionPress(item.term)}
                                        className="flex-row items-center bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-3xl p-4 mb-3 border border-border-light dark:border-border-dark shadow-sm shadow-zinc-200/50 dark:shadow-none active:scale-95 transition-transform"
                                        activeOpacity={0.7}
                                    >
                                        <View className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/20 items-center justify-center mr-4">
                                            <Text className="text-primary-600 dark:text-primary-400 text-body-lg font-sans-black">
                                                {i + 1}
                                            </Text>
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-zinc-900 dark:text-white text-body-lg font-sans-bold tracking-tight mb-0.5">
                                                {item.term}
                                            </Text>
                                            {item.articleCount > 0 && (
                                                <Text className="text-body-xs text-zinc-400 font-sans-medium tracking-wide">
                                                    Son 24 saatte {item.articleCount} haber
                                                </Text>
                                            )}
                                        </View>
                                        <TrendingUp size={18} color="#A1A1AA" className="mr-2" />
                                    </TouchableOpacity>
                                </Animated.View>
                            ))}
                        </View>
                    ) : (
                        <View className="items-center py-20 mt-10 rounded-4xl border-2 border-dashed border-border-light dark:border-border-dark bg-surface-light-subtle dark:bg-surface-dark-subtle">
                            <View className="w-16 h-16 rounded-3xl bg-surface-light-elevated dark:bg-surface-dark-elevated shadow-sm shadow-zinc-200/50 dark:shadow-none items-center justify-center mb-5">
                                <Search size={30} color={isDark ? "#71717a" : "#A1A1AA"} />
                            </View>
                            <Text className="text-display-lg font-display-extrabold text-zinc-900 dark:text-white text-center mb-2 tracking-tight">Keşfet</Text>
                            <Text className="text-body-md text-zinc-500 text-center font-sans tracking-wide px-8">Aramak istediğiniz konuyu, kaynağı veya haberi yazmaya başlayın.</Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
