import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueries } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, FileText, BarChart3, Menu, Map } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { digestService } from '../../src/api/services/digestService';
import { DailyDigest, WeeklyComparison } from '../../src/types';
import { useStaggeredEntry } from '../../src/hooks/useStaggeredEntry';
import { useLatestWeekly } from '../../src/hooks/useWeekly';
import { useThemeStore } from '../../src/store/useThemeStore';
import { useAppStore } from '../../src/store/useAppStore';
import { safePush } from '../../src/utils/navigation';

const COUNTRIES: { code: string; name: string; flag: string }[] = [
    { code: 'tr', name: 'Türkiye', flag: '🇹🇷' },
    { code: 'de', name: 'Almanya', flag: '🇩🇪' },
    { code: 'us', name: 'ABD', flag: '🇺🇸' },
    { code: 'uk', name: 'İngiltere', flag: '🇬🇧' },
    { code: 'fr', name: 'Fransa', flag: '🇫🇷' },
    { code: 'es', name: 'İspanya', flag: '🇪🇸' },
    { code: 'it', name: 'İtalya', flag: '🇮🇹' },
    { code: 'ru', name: 'Rusya', flag: '🇷🇺' },
];

const WEEKLY_COUNTRIES: Record<string, { name: string; flag: string }> = {
    tr: { name: 'Türkiye', flag: '🇹🇷' },
    de: { name: 'Almanya', flag: '🇩🇪' },
    us: { name: 'ABD', flag: '🇺🇸' },
};

type ViewMode = 'daily' | 'weekly';

function getSentimentColor(sentiment: string): string {
    switch (sentiment) {
        case 'positive': return '#10B981'; // emerald-500
        case 'negative': return '#EF4444'; // red-500
        default: return '#FBBF24'; // amber-400
    }
}

function getSentimentLabel(sentiment: string): string {
    switch (sentiment) {
        case 'positive': return 'Olumlu';
        case 'negative': return 'Olumsuz';
        default: return 'Nötr';
    }
}

function formatWeekRange(start: string, end: string): string {
    const s = new Date(start);
    const e = new Date(end);
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `${s.toLocaleDateString('tr-TR', opts)} - ${e.toLocaleDateString('tr-TR', opts)}`;
}

function WeeklyReportView({ data, isLoading }: { data?: WeeklyComparison; isLoading: boolean }) {
    if (isLoading) {
        return (
            <View className="py-12 items-center">
                <ActivityIndicator size="large" color="#0A66C2" />
                <Text className="text-zinc-500 text-body-sm mt-4 font-sans tracking-wide">
                    Haftalık rapor yükleniyor...
                </Text>
            </View>
        );
    }

    if (!data) {
        return (
            <View className="py-12 items-center flex-1 justify-center mt-10 rounded-4xl border-2 border-dashed border-border-light dark:border-border-dark bg-surface-light-subtle dark:bg-surface-dark-subtle px-6">
                <Text className="text-display-lg font-display-extrabold text-zinc-900 dark:text-white text-center mb-2 tracking-tight">
                    Rapor Yok
                </Text>
                <Text className="text-zinc-500 text-body-md text-center font-sans tracking-wide">
                    Henüz haftalık rapor oluşturulmamış. Daha sonra tekrar kontrol et.
                </Text>
            </View>
        );
    }

    return (
        <View className="gap-5">
            {/* Week header */}
            <View className="bg-primary-50 dark:bg-primary-900/20 rounded-3xl p-5 border border-primary-100 dark:border-primary-800">
                <Text className="text-primary-700 dark:text-primary-300 text-body-xs uppercase tracking-widest mb-1 font-sans-semibold">
                    Haftalık Analiz
                </Text>
                <Text className="text-primary-900 dark:text-primary-100 text-display-lg font-display-extrabold tracking-tight">
                    {formatWeekRange(data.weekStart, data.weekEnd)}
                </Text>
            </View>

            {/* Country summaries */}
            {Object.entries(data.countriesData).map(([code, countryData]) => {
                const meta = WEEKLY_COUNTRIES[code];
                if (!meta) return null;
                const sentimentColor = getSentimentColor(countryData.sentiment);

                return (
                    <View
                        key={code}
                        className="bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-3xl p-5 border border-border-light dark:border-border-dark shadow-sm shadow-zinc-200/50 dark:shadow-none"
                    >
                        <View className="flex-row items-center justify-between mb-4">
                            <View className="flex-row items-center gap-3">
                                <Text style={{ fontSize: 28 }}>{meta.flag}</Text>
                                <Text className="text-zinc-900 dark:text-white text-display-lg font-sans-bold tracking-tight">
                                    {meta.name}
                                </Text>
                            </View>
                            <View
                                className="px-3 py-1.5 rounded-full"
                                style={{ backgroundColor: `${sentimentColor}20` }}
                            >
                                <Text
                                    className="text-body-xs font-sans-bold uppercase tracking-widest"
                                    style={{ color: sentimentColor }}
                                >
                                    {getSentimentLabel(countryData.sentiment)}
                                </Text>
                            </View>
                        </View>

                        <Text className="text-zinc-600 dark:text-zinc-300 text-body-md mb-4 font-sans leading-[24px]">
                            {countryData.summary}
                        </Text>

                        {countryData.topics && countryData.topics.length > 0 && (
                            <View className="flex-row flex-wrap gap-2">
                                {countryData.topics.map((topic, i) => (
                                    <View
                                        key={i}
                                        className="bg-surface-light-subtle dark:bg-surface-dark-subtle px-3 py-1.5 rounded-full border border-border-light dark:border-border-dark"
                                    >
                                        <Text className="text-body-xs text-zinc-600 dark:text-zinc-400 font-sans-semibold">
                                            {topic}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                );
            })}

            {/* Cross-country analysis */}
            <View className="bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-3xl p-5 border border-border-light dark:border-border-dark shadow-sm shadow-zinc-200/50 dark:shadow-none mb-6">
                <Text className="text-zinc-900 dark:text-white text-body-lg mb-3 font-sans-black tracking-tight">
                    Karşılaştırmalı Analiz
                </Text>
                <Text className="text-zinc-600 dark:text-zinc-300 text-body-md font-sans leading-[24px]">
                    {data.comparisonText}
                </Text>
            </View>
        </View>
    );
}

function CountryDigestCard({
    country,
    digest,
    isLoading,
}: {
    country: { code: string; name: string; flag: string };
    digest: DailyDigest | null;
    isLoading: boolean;
}) {
    return (
        <View
            className="bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-3xl p-5 border border-border-light dark:border-border-dark shadow-sm shadow-zinc-200/50 dark:shadow-none mb-5"
            accessibilityLabel={`${country.name} özeti`}
        >
            <View className="flex-row items-center gap-4 mb-4">
                <Text style={{ fontSize: 32 }}>{country.flag}</Text>
                <View>
                    <Text className="text-zinc-900 dark:text-white text-display-lg font-sans-black tracking-tight">
                        {country.name}
                    </Text>
                    <Text className="text-body-xs text-zinc-400 uppercase tracking-widest font-sans-bold mt-0.5">
                        {country.code.toUpperCase()} BÜLTENİ
                    </Text>
                </View>
            </View>

            {isLoading ? (
                <View className="py-8 items-center">
                    <ActivityIndicator size="small" color="#0A66C2" />
                </View>
            ) : digest ? (
                <>
                    <Text
                        className="text-zinc-700 dark:text-zinc-300 text-body-md mb-4 font-sans leading-[24px]"
                        numberOfLines={4}
                    >
                        {digest.summary}
                    </Text>
                    {digest.topTopics && digest.topTopics.length > 0 && (
                        <View className="gap-3">
                            {digest.topTopics.slice(0, 3).map((topic, i) => (
                                <View key={i} className="flex-row items-start gap-3">
                                    <View className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0 shadow-sm" />
                                    <View className="flex-1">
                                        <Text className="text-body-sm text-zinc-900 dark:text-zinc-100 font-sans-bold mb-0.5">
                                            {topic.title}
                                        </Text>
                                        <Text
                                            className="text-body-xs text-zinc-500 font-sans leading-[18px]"
                                            numberOfLines={2}
                                        >
                                            {topic.description}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                    <View className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
                        <Text className="text-body-xs text-zinc-400 font-sans-medium tracking-wide">
                            {digest.articleCount} haber analiz edildi
                        </Text>
                    </View>
                </>
            ) : (
                <View className="py-6 items-center">
                    <Text className="text-zinc-400 text-body-sm text-center font-sans">
                        Bu tarih için özet bulunamadı.
                    </Text>
                </View>
            )}
        </View>
    );
}

export default function CompareScreen() {
    const router = useRouter();
    const toggleSideMenu = useAppStore(state => state.toggleSideMenu);
    const activeScheme = useThemeStore(state => state.activeScheme);
    const isDark = activeScheme === 'dark';
    const [viewMode, setViewMode] = useState<ViewMode>('daily');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedCountry, setSelectedCountry] = useState<string>('all');
    const { getEntryAnimation } = useStaggeredEntry();

    const { data: weeklyData, isLoading: weeklyLoading, refetch: refetchWeekly } = useLatestWeekly();

    const dateStr = selectedDate.toISOString().split('T')[0];
    const isToday = dateStr === new Date().toISOString().split('T')[0];

    const changeDate = (days: number) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + days);
        if (d > new Date()) return;
        setSelectedDate(d);
    };

    const results = useQueries({
        queries: COUNTRIES.map(c => ({
            queryKey: ['digest', c.code, dateStr],
            queryFn: async () => {
                try {
                    const digests = await digestService.getDigests(c.code);
                    const sameDate = digests.filter(d => d.date === dateStr);
                    if (sameDate.length === 0) return null;
                    return sameDate.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
                } catch {
                    return null;
                }
            },
            staleTime: 1000 * 60 * 10,
            enabled: viewMode === 'daily',
        })),
    });

    const refetchAll = () => {
        if (viewMode === 'weekly') {
            refetchWeekly();
        } else {
            results.forEach(r => r.refetch());
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark" edges={['top']}>
            <View className="px-5 pt-4 pb-4 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark z-10">
                {/* Header: Menu - Title - Map */}
                <View className="flex-row items-center justify-between mb-6 mt-2">
                    <TouchableOpacity
                        onPress={toggleSideMenu}
                        className="w-11 h-11 items-center justify-center rounded-full bg-surface-light-subtle dark:bg-surface-dark-subtle active:scale-95 transition-transform"
                    >
                        <Menu size={22} color={isDark ? "#ffffff" : "#18181b"} />
                    </TouchableOpacity>

                    <Text className="text-display-lg font-display-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
                        Karşılaştır
                    </Text>

                    <TouchableOpacity
                        onPress={() => safePush(router, '/(tabs)/map' as any)}
                        className="w-11 h-11 items-center justify-center rounded-full bg-surface-light-subtle dark:bg-surface-dark-subtle active:scale-95 transition-transform"
                    >
                        <Map size={20} color={isDark ? "#ffffff" : "#18181b"} />
                    </TouchableOpacity>
                </View>

                {/* Controls Container */}
                <View className="mb-0">
                    {/* Country Filter Chips - Horizontal Scroll */}
                    <View className="mb-5 -mx-5 px-5">
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
                        >
                            <TouchableOpacity
                                onPress={() => setSelectedCountry('all')}
                                className={`px-5 py-3 rounded-full border ${selectedCountry === 'all'
                                    ? 'bg-primary border-primary'
                                    : 'bg-surface-light-elevated dark:bg-surface-dark-elevated border-border-light dark:border-border-dark shadow-sm shadow-zinc-200/50 dark:shadow-none'
                                    }`}
                            >
                                <Text className={`text-body-sm font-sans-bold ${selectedCountry === 'all' ? 'text-white' : 'text-zinc-600 dark:text-zinc-400'}`}>
                                    Tümü
                                </Text>
                            </TouchableOpacity>
                            {COUNTRIES.map(c => (
                                <TouchableOpacity
                                    key={c.code}
                                    onPress={() => setSelectedCountry(c.code)}
                                    className={`flex-row items-center gap-2 px-5 py-3 rounded-full border ${selectedCountry === c.code
                                        ? 'bg-primary border-primary'
                                        : 'bg-surface-light-elevated dark:bg-surface-dark-elevated border-border-light dark:border-border-dark shadow-sm shadow-zinc-200/50 dark:shadow-none'
                                        }`}
                                >
                                    <Text className="text-body-lg">{c.flag}</Text>
                                    <Text className={`text-body-sm font-sans-bold ${selectedCountry === c.code ? 'text-white' : 'text-zinc-600 dark:text-zinc-400'}`}>
                                        {c.code.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* View Mode Toggle */}
                    <View className="flex-row bg-surface-light-subtle dark:bg-surface-dark-subtle p-1.5 rounded-2xl mb-5">
                        <TouchableOpacity
                            onPress={() => setViewMode('daily')}
                            className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl ${viewMode === 'daily'
                                ? 'bg-surface-light-elevated dark:bg-surface-dark-elevated shadow-sm shadow-zinc-200/50 dark:shadow-none'
                                : 'bg-transparent'
                                }`}
                        >
                            <BarChart3 size={18} color={viewMode === 'daily' ? (isDark ? '#e4e4e7' : '#18181b') : '#a1a1aa'} />
                            <Text className={`text-body-sm font-sans-bold ${viewMode === 'daily' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>
                                Günlük
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setViewMode('weekly')}
                            className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl ${viewMode === 'weekly'
                                ? 'bg-surface-light-elevated dark:bg-surface-dark-elevated shadow-sm shadow-zinc-200/50 dark:shadow-none'
                                : 'bg-transparent'
                                }`}
                        >
                            <FileText size={18} color={viewMode === 'weekly' ? (isDark ? '#e4e4e7' : '#18181b') : '#a1a1aa'} />
                            <Text className={`text-body-sm font-sans-bold ${viewMode === 'weekly' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>
                                Haftalık
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Date Picker (Daily Mode Only) */}
                    {viewMode === 'daily' && (
                        <View className="flex-row items-center justify-between bg-surface-light-elevated dark:bg-surface-dark-elevated p-2 rounded-3xl border border-border-light dark:border-border-dark shadow-sm shadow-zinc-200/50 dark:shadow-none">
                            <TouchableOpacity
                                onPress={() => changeDate(-1)}
                                className="p-3 bg-surface-light-subtle dark:bg-surface-dark-subtle rounded-2xl active:scale-95 transition-transform"
                                accessibilityLabel="Önceki gün"
                            >
                                <ChevronLeft size={20} color="#71717a" />
                            </TouchableOpacity>

                            <View className="items-center">
                                <Text className="text-zinc-900 dark:text-white text-body-lg font-sans-bold tracking-tight">
                                    {selectedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                                </Text>
                                <Text className="text-zinc-400 text-body-xs font-sans-medium mt-0.5">
                                    {selectedDate.toLocaleDateString('tr-TR', { year: 'numeric' })}
                                </Text>
                            </View>

                            <TouchableOpacity
                                onPress={() => changeDate(1)}
                                disabled={isToday}
                                className={`p-3 rounded-2xl active:scale-95 transition-transform ${isToday ? 'bg-surface-light-subtle/50 dark:bg-surface-dark-subtle/50' : 'bg-surface-light-subtle dark:bg-surface-dark-subtle'}`}
                                style={{ opacity: isToday ? 0.4 : 1 }}
                                accessibilityLabel="Sonraki gün"
                            >
                                <ChevronRight size={20} color="#71717a" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>

            <ScrollView
                className="flex-1 pt-6"
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={false} onRefresh={refetchAll} tintColor="#0A66C2" />
                }
            >
                {viewMode === 'weekly' ? (
                    <WeeklyReportView data={weeklyData ?? undefined} isLoading={weeklyLoading} />
                ) : (
                    <>
                        {COUNTRIES.length > 0 && selectedCountry === 'all' && (
                            <Text className="text-body-xs text-zinc-400 uppercase tracking-widest mb-5 font-sans-bold px-1">
                                {COUNTRIES.length} ülkenin gündemi
                            </Text>
                        )}
                        {COUNTRIES.length > 0 && selectedCountry !== 'all' && (
                            <Text className="text-body-xs text-zinc-400 uppercase tracking-widest mb-5 font-sans-bold px-1">
                                Analiz Edilen Bölge
                            </Text>
                        )}

                        {COUNTRIES
                            .filter(c => selectedCountry === 'all' || c.code === selectedCountry)
                            .map((country, i) => {
                                const originalIndex = COUNTRIES.findIndex(c => c.code === country.code);
                                const result = results[originalIndex];

                                return (
                                    <Animated.View key={country.code} entering={getEntryAnimation(i)}>
                                        <CountryDigestCard
                                            country={country}
                                            digest={result?.data ?? null}
                                            isLoading={result?.isLoading ?? false}
                                        />
                                    </Animated.View>
                                );
                            })}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
