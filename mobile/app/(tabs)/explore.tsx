import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Keyboard } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, X, Sun, Moon, Calendar } from 'lucide-react-native';
import { useDigests } from '../../src/hooks/useDigest';
import { useAppStore } from '../../src/store/useAppStore';
import { CountrySelector } from '../../src/components/navigation/CountrySelector';
import { DailyDigest } from '../../src/types';
import { useStaggeredEntry } from '../../src/hooks/useStaggeredEntry';

export default function ExploreScreen() {
    const router = useRouter();
    const { selectedCountry } = useAppStore();
    const [searchText, setSearchText] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const { getEntryAnimation } = useStaggeredEntry();

    const { data: digests, isLoading } = useDigests(selectedCountry);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(searchText.trim()), 400);
        return () => clearTimeout(timer);
    }, [searchText]);

    const results = useMemo(() => {
        if (!digests || debouncedQuery.length < 2) return [];
        const q = debouncedQuery.toLowerCase();
        return digests.filter(d =>
            d.summary?.toLowerCase().includes(q) ||
            d.title?.toLowerCase().includes(q) ||
            d.topTopics?.some(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
        );
    }, [digests, debouncedQuery]);

    const recentTopics = useMemo(() => {
        if (!digests) return [];
        const topicSet = new Map<string, string>();
        digests.slice(0, 10).forEach(d => {
            d.topTopics?.forEach(t => {
                if (!topicSet.has(t.title)) topicSet.set(t.title, t.description);
            });
        });
        return Array.from(topicSet.entries()).slice(0, 12).map(([title, desc]) => ({ title, desc }));
    }, [digests]);

    const handleResultPress = (digest: DailyDigest) => {
        Keyboard.dismiss();
        // @ts-ignore
        router.push({ pathname: '/digest/[id]', params: { id: digest.id } });
    };

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
                        placeholder="Özet veya konu ara..."
                        placeholderTextColor="#a1a1aa"
                        value={searchText}
                        onChangeText={setSearchText}
                        returnKeyType="search"
                        accessibilityLabel="Özet veya konu ara"
                        accessibilityHint="Arama sonuçları otomatik gösterilir"
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity
                            onPress={() => setSearchText('')}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            accessibilityLabel="Aramayı temizle"
                            accessibilityRole="button"
                        >
                            <View className="bg-zinc-200 dark:bg-zinc-700 rounded-full p-1">
                                <X size={12} color="#71717a" />
                            </View>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#006FFF" />
                </View>
            ) : debouncedQuery.length >= 2 ? (
                <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
                    {results.length === 0 ? (
                        <View className="flex-1 items-center justify-center py-20">
                            <Search size={40} color="#d4d4d8" />
                            <Text
                                className="text-zinc-500 text-center mt-4"
                                style={{ fontFamily: 'DMSans_400Regular' }}
                            >
                                "{debouncedQuery}" için sonuç bulunamadı.
                            </Text>
                        </View>
                    ) : (
                        <>
                            <Text
                                className="text-xs text-zinc-400 uppercase tracking-wider mb-3"
                                style={{ fontFamily: 'DMSans_600SemiBold' }}
                            >
                                {results.length} özet bulundu
                            </Text>
                            {results.map((digest, i) => (
                                <Animated.View key={digest.id} entering={getEntryAnimation(i)}>
                                    <TouchableOpacity
                                        onPress={() => handleResultPress(digest)}
                                        className="bg-white dark:bg-zinc-900 rounded-2xl p-4 mb-3 border border-zinc-100 dark:border-zinc-800"
                                        activeOpacity={0.7}
                                        accessibilityLabel={`${digest.title}, ${digest.period === 'morning' ? 'sabah' : 'akşam'} özeti`}
                                        accessibilityRole="button"
                                        accessibilityHint="Özet detayını aç"
                                    >
                                        <View className="flex-row items-center gap-2 mb-2">
                                            {digest.period === 'morning'
                                                ? <Sun size={14} color="#f59e0b" />
                                                : <Moon size={14} color="#6366f1" />
                                            }
                                            <Text
                                                className="text-xs text-zinc-400 uppercase"
                                                style={{ fontFamily: 'DMSans_600SemiBold' }}
                                            >
                                                {digest.period === 'morning' ? 'Sabah' : 'Akşam'} · {new Date(digest.date + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                                            </Text>
                                        </View>
                                        <Text
                                            className="text-zinc-900 dark:text-white mb-1"
                                            style={{ fontFamily: 'DMSans_700Bold' }}
                                            numberOfLines={2}
                                        >
                                            {digest.title}
                                        </Text>
                                        <Text
                                            className="text-zinc-500 dark:text-zinc-400 text-sm"
                                            style={{ fontFamily: 'DMSans_400Regular', lineHeight: 22 }}
                                            numberOfLines={2}
                                        >
                                            {digest.summary}
                                        </Text>
                                        {digest.topTopics?.filter(t =>
                                            t.title.toLowerCase().includes(debouncedQuery.toLowerCase())
                                        ).map((t, ti) => (
                                            <View key={ti} className="mt-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl px-3 py-1.5">
                                                <Text
                                                    className="text-xs text-blue-700 dark:text-blue-400"
                                                    style={{ fontFamily: 'DMSans_600SemiBold' }}
                                                >
                                                    {t.title}
                                                </Text>
                                            </View>
                                        ))}
                                    </TouchableOpacity>
                                </Animated.View>
                            ))}
                        </>
                    )}
                </ScrollView>
            ) : (
                <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
                    {recentTopics.length > 0 && (
                        <View className="mt-2 mb-8">
                            <View className="flex-row items-center gap-2 mb-4">
                                <Calendar size={18} color="#006FFF" />
                                <Text
                                    className="text-lg text-zinc-900 dark:text-white"
                                    style={{ fontFamily: 'DMSans_700Bold' }}
                                >
                                    Son Özetlerden Konular
                                </Text>
                            </View>
                            <View className="flex-row flex-wrap gap-2">
                                {recentTopics.map((topic, i) => (
                                    <Animated.View key={i} entering={getEntryAnimation(i)}>
                                        <TouchableOpacity
                                            onPress={() => setSearchText(topic.title)}
                                            className="bg-white dark:bg-zinc-900 px-4 py-2.5 rounded-full border border-zinc-200 dark:border-zinc-800"
                                            activeOpacity={0.7}
                                            accessibilityLabel={`${topic.title} konusunu ara`}
                                            accessibilityRole="button"
                                        >
                                            <Text
                                                className="text-[13px] text-zinc-700 dark:text-zinc-300"
                                                style={{ fontFamily: 'DMSans_600SemiBold' }}
                                            >
                                                {topic.title}
                                            </Text>
                                        </TouchableOpacity>
                                    </Animated.View>
                                ))}
                            </View>
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
