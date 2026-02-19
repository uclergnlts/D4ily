import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueries } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, FileText, BarChart3, Menu, Map } from 'lucide-react-native';
import { digestService } from '../../src/api/services/digestService';
import { DailyDigest, WeeklyComparison } from '../../src/types';
import { useStaggeredEntry } from '../../src/hooks/useStaggeredEntry';
import { useLatestWeekly } from '../../src/hooks/useWeekly';

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

type Period = 'morning' | 'evening';
type ViewMode = 'daily' | 'weekly';

function getSentimentColor(sentiment: string): string {
    switch (sentiment) {
        case 'positive': return '#10b981';
        case 'negative': return '#ef4444';
        default: return '#f59e0b';
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
                <ActivityIndicator size="large" color="#a855f7" />
                <Text className="text-zinc-400 text-sm mt-3 font-regular">
                    Haftalık rapor yükleniyor...
                </Text>
            </View>
        );
    }

    if (!data) {
        return (
            <View className="py-12 items-center">
                <Text className="text-zinc-400 text-sm text-center font-regular">
                    Henüz haftalık rapor oluşturulmamış.
                </Text>
            </View>
        );
    }

    return (
        <View className="gap-4">
            {/* Week header */}
            <View className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-4 border border-purple-100 dark:border-purple-800">
                <Text
                    className="text-purple-700 dark:text-purple-300 text-xs uppercase tracking-wider mb-1 font-semibold"
                >
                    Haftalık Analiz
                </Text>
                <Text
                    className="text-purple-900 dark:text-purple-100 text-base font-bold"
                >
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
                        className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800"
                    >
                        <View className="flex-row items-center justify-between mb-3">
                            <View className="flex-row items-center gap-2">
                                <Text style={{ fontSize: 24 }}>{meta.flag}</Text>
                                <Text
                                    className="text-zinc-900 dark:text-white text-base font-bold"
                                >
                                    {meta.name}
                                </Text>
                            </View>
                            <View
                                className="px-2.5 py-1 rounded-full"
                                style={{ backgroundColor: `${sentimentColor}20` }}
                            >
                                <Text
                                    className="text-[11px] font-semibold"
                                    style={{ color: sentimentColor }}
                                >
                                    {getSentimentLabel(countryData.sentiment)}
                                </Text>
                            </View>
                        </View>

                        <Text
                            className="text-zinc-600 dark:text-zinc-300 text-sm mb-3 font-regular leading-6"
                        >
                            {countryData.summary}
                        </Text>

                        {countryData.topics && countryData.topics.length > 0 && (
                            <View className="flex-row flex-wrap gap-1.5">
                                {countryData.topics.map((topic, i) => (
                                    <View
                                        key={i}
                                        className="bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full"
                                    >
                                        <Text
                                            className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium"
                                        >
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
            <View className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800">
                <Text
                    className="text-zinc-900 dark:text-white text-sm mb-2 font-bold"
                >
                    Karşılaştırmalı Analiz
                </Text>
                <Text
                    className="text-zinc-600 dark:text-zinc-300 text-sm font-regular leading-6"
                >
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
            className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-100 dark:border-zinc-800 mb-4"
            accessibilityLabel={`${country.name} özeti`}
        >
            <View className="flex-row items-center gap-3 mb-3">
                <Text style={{ fontSize: 28 }}>{country.flag}</Text>
                <View>
                    <Text
                        className="text-zinc-900 dark:text-white text-base font-black"
                    >
                        {country.name}
                    </Text>
                    <Text
                        className="text-xs text-zinc-400 uppercase tracking-wider font-medium"
                    >
                        {country.code.toUpperCase()}
                    </Text>
                </View>
            </View>

            {isLoading ? (
                <View className="py-6 items-center">
                    <ActivityIndicator size="small" color="#006FFF" />
                </View>
            ) : digest ? (
                <>
                    <Text
                        className="text-zinc-700 dark:text-zinc-300 text-sm mb-3 font-regular leading-6"
                        numberOfLines={4}
                    >
                        {digest.summary}
                    </Text>
                    {digest.topTopics && digest.topTopics.length > 0 && (
                        <View className="gap-2">
                            {digest.topTopics.slice(0, 3).map((topic, i) => (
                                <View key={i} className="flex-row items-start gap-2">
                                    <View className="w-1.5 h-1.5 rounded-full bg-[#006FFF] mt-1.5 shrink-0" />
                                    <View className="flex-1">
                                        <Text
                                            className="text-xs text-zinc-800 dark:text-zinc-200 font-bold"
                                        >
                                            {topic.title}
                                        </Text>
                                        <Text
                                            className="text-[11px] text-zinc-400 mt-0.5 font-regular leading-4"
                                            numberOfLines={2}
                                        >
                                            {topic.description}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                    <View className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                        <Text
                            className="text-[11px] text-zinc-400 font-regular"
                        >
                            {digest.articleCount} haber analiz edildi
                        </Text>
                    </View>
                </>
            ) : (
                <View className="py-4 items-center">
                    <Text
                        className="text-zinc-400 text-sm text-center font-regular"
                    >
                        Bu tarih için özet bulunamadı.
                    </Text>
                </View>
            )}
        </View>
    );
}

export default function CompareScreen() {
    const [viewMode, setViewMode] = useState<ViewMode>('daily');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedCountry, setSelectedCountry] = useState<string>('all');
    const period: Period = 'morning';
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
            queryKey: ['digest', c.code, dateStr, period],
            queryFn: async () => {
                try {
                    const digests = await digestService.getDigests(c.code);
                    return digests.find(d => d.date === dateStr && d.period === period) ?? null;
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
        <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-black" edges={['top']}>
            <View className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-black">
                {/* Header: Menu - Title - Map */}
                <View className="flex-row items-center justify-between mb-6">
                    <TouchableOpacity
                        onPress={() => import('../../src/store/useAppStore').then(m => m.useAppStore.getState().toggleSideMenu())}
                        className="p-2 -ml-2"
                    >
                        <Menu size={24} color="#18181b" className="dark:text-white" />
                    </TouchableOpacity>

                    <Text className="text-xl font-bold text-blue-600">
                        Karşılaştır
                    </Text>

                    <TouchableOpacity
                        onPress={() => import('expo-router').then(r => r.router.push('/(tabs)/map'))}
                        className="p-2 -mr-2"
                    >
                        <Map size={24} color="#18181b" className="dark:text-white" />
                    </TouchableOpacity>
                </View>

                {/* Controls Container */}
                <View className="mb-2">
                    {/* Country Filter Chips - Horizontal Scroll */}
                    <View className="mb-4">
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 4, gap: 8 }}
                        >
                            <TouchableOpacity
                                onPress={() => setSelectedCountry('all')}
                                className={`px-4 py-2 rounded-full border ${selectedCountry === 'all'
                                    ? 'bg-blue-600 border-blue-600'
                                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                                    }`}
                            >
                                <Text className={`text-sm font-semibold ${selectedCountry === 'all' ? 'text-white' : 'text-zinc-600 dark:text-zinc-400'}`}>
                                    Tümü
                                </Text>
                            </TouchableOpacity>
                            {COUNTRIES.map(c => (
                                <TouchableOpacity
                                    key={c.code}
                                    onPress={() => setSelectedCountry(c.code)}
                                    className={`flex-row items-center gap-2 px-4 py-2 rounded-full border ${selectedCountry === c.code
                                        ? 'bg-blue-600 border-blue-600'
                                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                                        }`}
                                >
                                    <Text className="text-base">{c.flag}</Text>
                                    <Text className={`text-sm font-semibold ${selectedCountry === c.code ? 'text-white' : 'text-zinc-600 dark:text-zinc-400'}`}>
                                        {c.code.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* View Mode Toggle */}
                    <View className="flex-row bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl mb-4">
                        <TouchableOpacity
                            onPress={() => setViewMode('daily')}
                            className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-lg ${viewMode === 'daily'
                                ? 'bg-white dark:bg-zinc-800 shadow-sm'
                                : 'bg-transparent'
                                }`}
                        >
                            <BarChart3 size={16} color={viewMode === 'daily' ? '#09090b' : '#71717a'} className="dark:text-white" />
                            <Text className={`text-sm font-semibold ${viewMode === 'daily' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>
                                Günlük
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setViewMode('weekly')}
                            className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-lg ${viewMode === 'weekly'
                                ? 'bg-white dark:bg-zinc-800 shadow-sm'
                                : 'bg-transparent'
                                }`}
                        >
                            <FileText size={16} color={viewMode === 'weekly' ? '#09090b' : '#71717a'} className="dark:text-white" />
                            <Text className={`text-sm font-semibold ${viewMode === 'weekly' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>
                                Haftalık
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Date Picker (Daily Mode Only) */}
                    {viewMode === 'daily' && (
                        <View className="flex-row items-center justify-between bg-white dark:bg-zinc-900 p-2 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                            <TouchableOpacity
                                onPress={() => changeDate(-1)}
                                className="p-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-xl"
                                accessibilityLabel="Önceki gün"
                            >
                                <ChevronLeft size={20} color="#71717a" />
                            </TouchableOpacity>

                            <View className="items-center">
                                <Text className="text-zinc-900 dark:text-white text-base font-bold">
                                    {selectedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                                </Text>
                                <Text className="text-zinc-400 text-xs font-medium">
                                    {selectedDate.toLocaleDateString('tr-TR', { year: 'numeric' })}
                                </Text>
                            </View>

                            <TouchableOpacity
                                onPress={() => changeDate(1)}
                                disabled={isToday}
                                className={`p-2.5 rounded-xl ${isToday ? 'bg-zinc-50/50 dark:bg-zinc-800/50' : 'bg-zinc-50 dark:bg-zinc-800'}`}
                                style={{ opacity: isToday ? 0.3 : 1 }}
                                accessibilityLabel="Sonraki gün"
                            >
                                <ChevronRight size={20} color="#71717a" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl refreshing={false} onRefresh={refetchAll} tintColor="#006FFF" />
                }
            >
                {viewMode === 'weekly' ? (
                    <WeeklyReportView data={weeklyData ?? undefined} isLoading={weeklyLoading} />
                ) : (
                    <>
                        <Text
                            className="text-xs text-zinc-400 uppercase tracking-wider mb-4 font-semibold"
                        >
                            {COUNTRIES.length} ülkenin gündemi
                        </Text>

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
