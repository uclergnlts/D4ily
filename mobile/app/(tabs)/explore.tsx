import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Keyboard } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, X, TrendingUp, Newspaper, Users, Hash } from 'lucide-react-native';
import { useAppStore } from '../../src/store/useAppStore';
import { CountrySelector } from '../../src/components/navigation/CountrySelector';
import { useSearch, useSearchSuggestions, useTrending } from '../../src/hooks/useSearch';
import { useStaggeredEntry } from '../../src/hooks/useStaggeredEntry';
import type { SearchArticle, SearchSource, SearchTopic } from '../../src/api/services/searchService';

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
        <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-black" edges={['top']}>
            <View className="px-4 pt-2 pb-4 bg-zinc-50 dark:bg-black z-10">
                <View className="flex-row items-center justify-between mb-4">
                    <Text
                        className="text-3xl text-zinc-900 dark:text-white"
                        style={{ fontFamily: 'Syne_800ExtraBold', letterSpacing: -0.5 }}
                        accessibilityRole="header"
                    >
                        Ara
                    </Text>
                    <CountrySelector />
                </View>

                <View
                    className="flex-row items-center bg-white dark:bg-zinc-900 rounded-2xl px-4 py-3.5 shadow-sm border border-zinc-200/50 dark:border-zinc-800"
                    accessibilityRole="search"
                >
                    <Search size={20} color="#71717a" />
                    <TextInput
                        className="flex-1 ml-3 text-zinc-900 dark:text-white text-[15px]"
                        style={{ paddingVertical: 0, fontFamily: 'DMSans_500Medium' }}
                        placeholder="Haber, kaynak veya konu ara..."
                        placeholderTextColor="#a1a1aa"
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
                        >
                            <View className="bg-zinc-200 dark:bg-zinc-700 rounded-full p-1">
                                <X size={12} color="#71717a" />
                            </View>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Suggestions dropdown */}
                {showSuggestions && suggestions && suggestions.length > 0 && (
                    <View className="mt-1 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                        {suggestions.map((s, i) => (
                            <TouchableOpacity
                                key={i}
                                onPress={() => handleSuggestionPress(s)}
                                className={`flex-row items-center px-4 py-3 ${i < suggestions.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}
                            >
                                <Search size={14} color="#a1a1aa" />
                                <Text
                                    className="ml-3 text-[14px] text-zinc-700 dark:text-zinc-300"
                                    style={{ fontFamily: 'DMSans_500Medium' }}
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
                <View className="px-4 pb-3">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View className="flex-row gap-2">
                            {TAB_OPTIONS.map(({ key, label, icon: Icon }) => {
                                const isActive = activeTab === key;
                                return (
                                    <TouchableOpacity
                                        key={key}
                                        onPress={() => setActiveTab(key)}
                                        className={`flex-row items-center gap-1.5 px-3.5 py-2 rounded-full ${isActive ? 'bg-blue-600' : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800'}`}
                                    >
                                        <Icon size={14} color={isActive ? '#fff' : '#71717a'} />
                                        <Text
                                            className={`text-[13px] ${isActive ? 'text-white' : 'text-zinc-600 dark:text-zinc-400'}`}
                                            style={{ fontFamily: isActive ? 'DMSans_700Bold' : 'DMSans_500Medium' }}
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
                    <ActivityIndicator size="large" color="#006FFF" />
                </View>
            ) : debouncedQuery.length >= 2 ? (
                <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 100 }}>
                    {!hasResults ? (
                        <View className="flex-1 items-center justify-center py-20">
                            <Search size={40} color="#d4d4d8" />
                            <Text
                                className="text-zinc-500 text-center mt-4"
                                style={{ fontFamily: 'DMSans_400Regular' }}
                            >
                                "{debouncedQuery}" icin sonuc bulunamadi.
                            </Text>
                        </View>
                    ) : (
                        <>
                            {/* Articles */}
                            {articles.length > 0 && (activeTab === 'all' || activeTab === 'articles') && (
                                <View className="mb-6">
                                    {activeTab === 'all' && (
                                        <View className="flex-row items-center gap-2 mb-3">
                                            <Newspaper size={16} color="#006FFF" />
                                            <Text
                                                className="text-sm text-zinc-900 dark:text-white"
                                                style={{ fontFamily: 'DMSans_700Bold' }}
                                            >
                                                Haberler ({articles.length})
                                            </Text>
                                        </View>
                                    )}
                                    {articles.map((article, i) => (
                                        <Animated.View key={article.id} entering={getEntryAnimation(i)}>
                                            <TouchableOpacity
                                                onPress={() => router.push({
                                                    pathname: '/article/[id]',
                                                    params: { id: article.id.toString(), country: article.country },
                                                })}
                                                className="bg-white dark:bg-zinc-900 rounded-2xl p-4 mb-2.5 border border-zinc-100 dark:border-zinc-800"
                                                activeOpacity={0.7}
                                            >
                                                <Text
                                                    className="text-zinc-900 dark:text-white text-[15px] mb-1"
                                                    style={{ fontFamily: 'DMSans_700Bold' }}
                                                    numberOfLines={2}
                                                >
                                                    {article.translatedTitle}
                                                </Text>
                                                <Text
                                                    className="text-zinc-500 text-[13px]"
                                                    style={{ fontFamily: 'DMSans_400Regular', lineHeight: 20 }}
                                                    numberOfLines={2}
                                                >
                                                    {article.summary}
                                                </Text>
                                                <Text
                                                    className="text-[11px] text-zinc-400 mt-2"
                                                    style={{ fontFamily: 'DMSans_500Medium' }}
                                                >
                                                    {new Date(article.publishedAt).toLocaleDateString('tr-TR', {
                                                        day: 'numeric', month: 'short', year: 'numeric',
                                                    })}
                                                </Text>
                                            </TouchableOpacity>
                                        </Animated.View>
                                    ))}
                                </View>
                            )}

                            {/* Sources */}
                            {sources.length > 0 && (activeTab === 'all' || activeTab === 'sources') && (
                                <View className="mb-6">
                                    {activeTab === 'all' && (
                                        <View className="flex-row items-center gap-2 mb-3">
                                            <Users size={16} color="#6366f1" />
                                            <Text
                                                className="text-sm text-zinc-900 dark:text-white"
                                                style={{ fontFamily: 'DMSans_700Bold' }}
                                            >
                                                Kaynaklar ({sources.length})
                                            </Text>
                                        </View>
                                    )}
                                    {sources.map((source, i) => (
                                        <Animated.View key={source.id} entering={getEntryAnimation(i)}>
                                            <View className="bg-white dark:bg-zinc-900 rounded-2xl p-4 mb-2.5 border border-zinc-100 dark:border-zinc-800 flex-row items-center gap-3">
                                                <View className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center">
                                                    <Users size={18} color="#71717a" />
                                                </View>
                                                <View className="flex-1">
                                                    <Text
                                                        className="text-zinc-900 dark:text-white text-[15px]"
                                                        style={{ fontFamily: 'DMSans_700Bold' }}
                                                    >
                                                        {source.sourceName}
                                                    </Text>
                                                    <Text
                                                        className="text-[12px] text-zinc-400"
                                                        style={{ fontFamily: 'DMSans_500Medium' }}
                                                    >
                                                        {source.countryCode?.toUpperCase()}
                                                    </Text>
                                                </View>
                                            </View>
                                        </Animated.View>
                                    ))}
                                </View>
                            )}

                            {/* Topics */}
                            {topics.length > 0 && (activeTab === 'all' || activeTab === 'topics') && (
                                <View className="mb-6">
                                    {activeTab === 'all' && (
                                        <View className="flex-row items-center gap-2 mb-3">
                                            <Hash size={16} color="#10b981" />
                                            <Text
                                                className="text-sm text-zinc-900 dark:text-white"
                                                style={{ fontFamily: 'DMSans_700Bold' }}
                                            >
                                                Konular ({topics.length})
                                            </Text>
                                        </View>
                                    )}
                                    <View className="flex-row flex-wrap gap-2">
                                        {topics.map((topic, i) => (
                                            <Animated.View key={topic.id} entering={getEntryAnimation(i)}>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setSearchText(topic.name);
                                                        setDebouncedQuery(topic.name);
                                                        setActiveTab('articles');
                                                    }}
                                                    className="bg-white dark:bg-zinc-900 px-4 py-2.5 rounded-full border border-zinc-200 dark:border-zinc-800"
                                                >
                                                    <Text
                                                        className="text-[13px] text-zinc-700 dark:text-zinc-300"
                                                        style={{ fontFamily: 'DMSans_600SemiBold' }}
                                                    >
                                                        {topic.hashtag || topic.name}
                                                    </Text>
                                                    {topic.articleCount > 0 && (
                                                        <Text
                                                            className="text-[10px] text-zinc-400 mt-0.5"
                                                            style={{ fontFamily: 'DMSans_400Regular' }}
                                                        >
                                                            {topic.articleCount} haber
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
                <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 100 }}>
                    {trendingLoading ? (
                        <View className="items-center py-12">
                            <ActivityIndicator size="small" color="#006FFF" />
                        </View>
                    ) : trending && trending.length > 0 ? (
                        <View className="mt-2 mb-8">
                            <View className="flex-row items-center gap-2 mb-4">
                                <TrendingUp size={18} color="#006FFF" />
                                <Text
                                    className="text-lg text-zinc-900 dark:text-white"
                                    style={{ fontFamily: 'DMSans_700Bold' }}
                                >
                                    Gundem
                                </Text>
                            </View>
                            {trending.map((item, i) => (
                                <Animated.View key={i} entering={getEntryAnimation(i)}>
                                    <TouchableOpacity
                                        onPress={() => handleSuggestionPress(item.term)}
                                        className="flex-row items-center bg-white dark:bg-zinc-900 rounded-2xl p-4 mb-2.5 border border-zinc-100 dark:border-zinc-800"
                                        activeOpacity={0.7}
                                    >
                                        <View className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 items-center justify-center mr-3">
                                            <Text
                                                className="text-blue-600 dark:text-blue-400 text-[13px]"
                                                style={{ fontFamily: 'DMSans_700Bold' }}
                                            >
                                                {i + 1}
                                            </Text>
                                        </View>
                                        <View className="flex-1">
                                            <Text
                                                className="text-zinc-900 dark:text-white text-[15px]"
                                                style={{ fontFamily: 'DMSans_600SemiBold' }}
                                            >
                                                {item.term}
                                            </Text>
                                            {item.articleCount > 0 && (
                                                <Text
                                                    className="text-[12px] text-zinc-400 mt-0.5"
                                                    style={{ fontFamily: 'DMSans_400Regular' }}
                                                >
                                                    {item.articleCount} haber
                                                </Text>
                                            )}
                                        </View>
                                        <TrendingUp size={16} color="#a1a1aa" />
                                    </TouchableOpacity>
                                </Animated.View>
                            ))}
                        </View>
                    ) : (
                        <View className="items-center py-20">
                            <Search size={40} color="#d4d4d8" />
                            <Text
                                className="text-zinc-400 text-center mt-4"
                                style={{ fontFamily: 'DMSans_400Regular' }}
                            >
                                Aramak istediginiz kelimeyi yazin.
                            </Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
