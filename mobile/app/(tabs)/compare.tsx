import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueries } from '@tanstack/react-query';
import { Sun, Moon, ChevronLeft, ChevronRight, FileText, BarChart3 } from 'lucide-react-native';
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
                <Text className="text-zinc-400 text-sm mt-3" style={{ fontFamily: 'DMSans_400Regular' }}>
                    Haftalık rapor yükleniyor...
                </Text>
            </View>
        );
    }

    if (!data) {
        return (
            <View className="py-12 items-center">
                <Text className="text-zinc-400 text-sm text-center" style={{ fontFamily: 'DMSans_400Regular' }}>
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
                    className="text-purple-700 dark:text-purple-300 text-xs uppercase tracking-wider mb-1"
                    style={{ fontFamily: 'DMSans_600SemiBold' }}
                >
                    Haftalık Analiz
                </Text>
                <Text
                    className="text-purple-900 dark:text-purple-100 text-base"
                    style={{ fontFamily: 'DMSans_700Bold' }}
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
                                    className="text-zinc-900 dark:text-white text-base"
                                    style={{ fontFamily: 'DMSans_700Bold' }}
                                >
                                    {meta.name}
                                </Text>
                            </View>
                            <View
                                className="px-2.5 py-1 rounded-full"
                                style={{ backgroundColor: `${sentimentColor}20` }}
                            >
                                <Text
                                    className="text-[11px]"
                                    style={{ fontFamily: 'DMSans_600SemiBold', color: sentimentColor }}
                                >
                                    {getSentimentLabel(countryData.sentiment)}
                                </Text>
                            </View>
                        </View>

                        <Text
                            className="text-zinc-600 dark:text-zinc-300 text-sm mb-3"
                            style={{ fontFamily: 'DMSans_400Regular', lineHeight: 22 }}
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
                                            className="text-[11px] text-zinc-600 dark:text-zinc-400"
                                            style={{ fontFamily: 'DMSans_500Medium' }}
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
                    className="text-zinc-900 dark:text-white text-sm mb-2"
                    style={{ fontFamily: 'DMSans_700Bold' }}
                >
                    Karşılaştırmalı Analiz
                </Text>
                <Text
                    className="text-zinc-600 dark:text-zinc-300 text-sm"
                    style={{ fontFamily: 'DMSans_400Regular', lineHeight: 22 }}
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
                        className="text-zinc-900 dark:text-white text-base"
                        style={{ fontFamily: 'DMSans_900Black' }}
                    >
                        {country.name}
                    </Text>
                    <Text
                        className="text-xs text-zinc-400 uppercase tracking-wider"
                        style={{ fontFamily: 'DMSans_500Medium' }}
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
                        className="text-zinc-700 dark:text-zinc-300 text-sm mb-3"
                        style={{ fontFamily: 'DMSans_400Regular', lineHeight: 22 }}
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
                                            className="text-xs text-zinc-800 dark:text-zinc-200"
                                            style={{ fontFamily: 'DMSans_700Bold' }}
                                        >
                                            {topic.title}
                                        </Text>
                                        <Text
                                            className="text-[11px] text-zinc-400 mt-0.5"
                                            style={{ fontFamily: 'DMSans_400Regular', lineHeight: 16 }}
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
                            className="text-[11px] text-zinc-400"
                            style={{ fontFamily: 'DMSans_400Regular' }}
                        >
                            {digest.articleCount} haber analiz edildi
                        </Text>
                    </View>
                </>
            ) : (
                <View className="py-4 items-center">
                    <Text
                        className="text-zinc-400 text-sm text-center"
                        style={{ fontFamily: 'DMSans_400Regular' }}
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
    const [period, setPeriod] = useState<Period>('morning');
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
                <Text
                    className="text-2xl text-zinc-900 dark:text-white mb-3"
                    style={{ fontFamily: 'Syne_800ExtraBold', letterSpacing: -0.5 }}
                    accessibilityRole="header"
                >
                    Karşılaştır
                </Text>

                {/* View mode toggle */}
                <View className="flex-row gap-2 mb-3">
                    <TouchableOpacity
                        onPress={() => setViewMode('daily')}
                        className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-full border ${
                            viewMode === 'daily'
                                ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white'
                                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                        }`}
                    >
                        <BarChart3 size={16} color={viewMode === 'daily' ? '#fff' : '#71717a'} />
                        <Text
                            className={`text-sm ${viewMode === 'daily' ? 'text-white dark:text-black' : 'text-zinc-500'}`}
                            style={{ fontFamily: 'DMSans_600SemiBold' }}
                        >
                            Günlük
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setViewMode('weekly')}
                        className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-full border ${
                            viewMode === 'weekly'
                                ? 'bg-purple-600 dark:bg-purple-500 border-purple-600 dark:border-purple-500'
                                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                        }`}
                    >
                        <FileText size={16} color={viewMode === 'weekly' ? '#fff' : '#71717a'} />
                        <Text
                            className={`text-sm ${viewMode === 'weekly' ? 'text-white' : 'text-zinc-500'}`}
                            style={{ fontFamily: 'DMSans_600SemiBold' }}
                        >
                            Haftalık Rapor
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Daily mode controls */}
                {viewMode === 'daily' && (
                    <>
                        <View className="flex-row items-center justify-between mb-3">
                            <TouchableOpacity
                                onPress={() => changeDate(-1)}
                                className="p-2 bg-white dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-zinc-800"
                                accessibilityLabel="Önceki gün"
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <ChevronLeft size={18} color="#71717a" />
                            </TouchableOpacity>

                            <Text
                                className="text-zinc-800 dark:text-zinc-200 text-base"
                                style={{ fontFamily: 'DMSans_700Bold' }}
                            >
                                {selectedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </Text>

                            <TouchableOpacity
                                onPress={() => changeDate(1)}
                                disabled={isToday}
                                className="p-2 bg-white dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-zinc-800"
                                style={{ opacity: isToday ? 0.3 : 1 }}
                                accessibilityLabel="Sonraki gün"
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <ChevronRight size={18} color="#71717a" />
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row gap-2">
                            <TouchableOpacity
                                onPress={() => setPeriod('morning')}
                                className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-full border ${period === 'morning'
                                    ? 'bg-amber-50 border-amber-300 dark:bg-amber-900/20 dark:border-amber-700'
                                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                                }`}
                            >
                                <Sun size={16} color={period === 'morning' ? '#f59e0b' : '#71717a'} />
                                <Text
                                    className={`text-sm ${period === 'morning' ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-500'}`}
                                    style={{ fontFamily: 'DMSans_600SemiBold' }}
                                >
                                    Sabah
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setPeriod('evening')}
                                className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-full border ${period === 'evening'
                                    ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-900/20 dark:border-indigo-700'
                                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                                }`}
                            >
                                <Moon size={16} color={period === 'evening' ? '#6366f1' : '#71717a'} />
                                <Text
                                    className={`text-sm ${period === 'evening' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500'}`}
                                    style={{ fontFamily: 'DMSans_600SemiBold' }}
                                >
                                    Akşam
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl refreshing={false} onRefresh={refetchAll} tintColor="#006FFF" />
                }
            >
                {viewMode === 'weekly' ? (
                    <WeeklyReportView data={weeklyData} isLoading={weeklyLoading} />
                ) : (
                    <>
                        <Text
                            className="text-xs text-zinc-400 uppercase tracking-wider mb-4"
                            style={{ fontFamily: 'DMSans_600SemiBold' }}
                        >
                            {COUNTRIES.length} ülkenin gündemi
                        </Text>

                        {COUNTRIES.map((country, i) => (
                            <Animated.View key={country.code} entering={getEntryAnimation(i)}>
                                <CountryDigestCard
                                    country={country}
                                    digest={results[i]?.data ?? null}
                                    isLoading={results[i]?.isLoading ?? false}
                                />
                            </Animated.View>
                        ))}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
