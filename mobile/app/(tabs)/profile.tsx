import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Star, ChevronDown, ChevronUp, Vote, Menu } from 'lucide-react-native';
import { MotiPressable } from 'moti/interactions';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../src/store/useAppStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useThemeStore } from '../../src/store/useThemeStore';
import { useSources } from '../../src/hooks/useSources';
import { useLatestDigest } from '../../src/hooks/useDigest';
import { useCII } from '../../src/hooks/useCII';
import { CountrySelector } from '../../src/components/navigation/CountrySelector';
import { sourceService } from '../../src/api/services/sourceService';
import { NewsAtmosphereCard } from '../../src/components/analysis/NewsAtmosphereCard';
import { Source } from '../../src/types';
import { useQueryClient } from '@tanstack/react-query';

// Helper functions for Alignment Color
function getAlignmentColor(score: number): string {
    if (score <= -3) return '#818CF8'; // stance-critical
    if (score <= -1) return '#A5B4FC'; // subtle indigo
    if (score <= 1) return '#A1A1AA';  // stance-neutral
    if (score <= 3) return '#FCD34D';  // subtle amber
    return '#FBBF24';                  // stance-favorable
}

function AlignmentBar({ score }: { score: number }) {
    const pct = ((score + 5) / 10) * 100;
    const color = getAlignmentColor(score);

    return (
        <View className="mt-3">
            <View className="h-3 rounded-full bg-surface-light-subtle dark:bg-surface-dark-subtle relative overflow-hidden">
                {/* Center marker */}
                <View className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-zinc-300 dark:bg-zinc-600 -ml-[1px] z-10" />

                {/* Value Indicator */}
                <View
                    className="absolute top-0 bottom-0 w-6 h-6 rounded-full border-[3px] border-surface-light-elevated dark:border-surface-dark-elevated shadow-sm z-20"
                    style={{
                        left: `${Math.max(0, Math.min(100, pct))}%`,
                        backgroundColor: color,
                        transform: [{ translateX: -12 }, { translateY: -6 }],
                    }}
                />
            </View>
            <View className="flex-row justify-between mt-2 px-1">
                <Text className="text-body-xs font-sans-semibold text-zinc-400 uppercase tracking-widest">Muhalif</Text>
                <Text className="text-body-xs font-sans-semibold text-zinc-400 uppercase tracking-widest">Nötr</Text>
                <Text className="text-body-xs font-sans-semibold text-zinc-400 uppercase tracking-widest">İktidar</Text>
            </View>
        </View>
    );
}

function ReliabilityStars({ score, count, interactive, onRate }: {
    score: number;
    count: number;
    interactive?: boolean;
    onRate?: (rating: number) => void;
}) {
    const [hoverRating, setHoverRating] = useState(0);
    const displayScore = hoverRating || score;

    return (
        <View className="flex-row items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => {
                const filled = star <= Math.round(displayScore);
                return (
                    // @ts-ignore
                    <MotiPressable
                        key={star}
                        disabled={!interactive}
                        onPress={() => onRate?.(star)}
                        onPressIn={() => interactive && setHoverRating(star)}
                        onPressOut={() => interactive && setHoverRating(0)}
                        animate={({ pressed }) => {
                            'worklet';
                            return { scale: pressed ? 0.8 : 1 };
                        }}
                    >
                        <Star
                            size={interactive ? 24 : 16}
                            color={filled ? '#FBBF24' : '#E5E7EB'}
                            fill={filled ? '#FBBF24' : 'transparent'}
                            className="dark:text-zinc-700"
                        />
                    </MotiPressable>
                );
            })}
            {!interactive && count > 0 && (
                <Text className="text-body-sm font-sans-bold text-zinc-500 ml-1.5">
                    {score.toFixed(1)}
                </Text>
            )}
        </View>
    );
}

function SourceCard({ source, onAlignmentVote, onReliabilityVote }: {
    source: Source;
    onAlignmentVote: (sourceId: number, score: number) => void;
    onReliabilityVote: (sourceId: number, score: number) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const score = source.govAlignmentScore ?? 0;
    const reliability = source.reliabilityScore ?? 0;

    const toggleExpand = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExpanded(!expanded);
    }

    return (
        <Animated.View entering={FadeInDown.duration(400).springify()}>
            {/* @ts-ignore */}
            <MotiPressable
                onPress={toggleExpand}
                animate={({ pressed }) => {
                    'worklet';
                    return {
                        scale: pressed ? 0.98 : 1,
                    };
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-3xl p-5 mb-4 border border-border-light dark:border-border-dark shadow-sm shadow-zinc-200/50 dark:shadow-none"
            >
                <View className="flex-row justify-between items-center">
                    <View className="flex-1 mr-4">
                        <View className="flex-row items-center gap-3 mb-1.5">
                            <View className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: getAlignmentColor(score) }} />
                            <Text className="text-display-lg font-sans-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                                {source.sourceName}
                            </Text>
                        </View>
                        <Text className="text-body-sm font-sans-medium text-zinc-500 dark:text-zinc-400 line-clamp-1">
                            {source.govAlignmentLabel || 'Analiz Verisi Yok'}
                        </Text>
                    </View>

                    <View className="items-end gap-2">
                        <ReliabilityStars score={reliability} count={source.reliabilityVoteCount ?? 0} />
                        <View className="bg-surface-light-subtle dark:bg-surface-dark-subtle p-1.5 rounded-full">
                            {expanded ? <ChevronUp size={16} color="#A1A1AA" /> : <ChevronDown size={16} color="#A1A1AA" />}
                        </View>
                    </View>
                </View>

                {/* Simple Bar Preview */}
                {!expanded && <View className="mt-4 opacity-70"><AlignmentBar score={score} /></View>}

                {/* Expanded Content */}
                {expanded && (
                    <View className="mt-5 pt-5 border-t border-zinc-100 dark:border-zinc-800/80">
                        <Text className="text-body-md font-sans-bold text-zinc-900 dark:text-white mb-2">
                            Politik Duruş Analizi
                        </Text>
                        <AlignmentBar score={score} />

                        {source.govAlignmentNotes && (
                            <View className="mt-4 bg-surface-light-subtle dark:bg-surface-dark-subtle p-4 rounded-2xl">
                                <Text className="text-body-sm font-sans text-zinc-600 dark:text-zinc-300 leading-[22px]">
                                    {source.govAlignmentNotes}
                                </Text>
                            </View>
                        )}

                        {/* Voting Actions */}
                        <View className="flex-row gap-3 mt-5">
                            {/* @ts-ignore */}
                            <MotiPressable
                                className="flex-1 bg-primary-50 dark:bg-primary-900/20 py-3 rounded-xl flex-row items-center justify-center gap-2 border border-primary-100 dark:border-primary-800"
                                onPress={() => onReliabilityVote(source.id, 5)}
                            >
                                <Star size={16} color="#0A66C2" />
                                <Text className="text-body-sm font-sans-bold text-primary-700 dark:text-primary-400">Güven Oyla</Text>
                            </MotiPressable>
                            {/* @ts-ignore */}
                            <MotiPressable
                                className="flex-1 bg-surface-light-subtle dark:bg-surface-dark-subtle py-3 rounded-xl flex-row items-center justify-center gap-2 border border-border-light dark:border-border-dark"
                                onPress={() => onAlignmentVote(source.id, 0)}
                            >
                                <Vote size={16} color="#71717A" />
                                <Text className="text-body-sm font-sans-bold text-zinc-700 dark:text-zinc-300">Görüş Bildir</Text>
                            </MotiPressable>
                        </View>
                    </View>
                )}
            </MotiPressable>
        </Animated.View>
    );
}

function SpectrumChart({ sources }: { sources: Source[] }) {
    // Group sources (Simple Logic)
    const groups = {
        left: sources.filter(s => (s.govAlignmentScore ?? 0) <= -2).length,
        center: sources.filter(s => Math.abs(s.govAlignmentScore ?? 0) < 2).length,
        right: sources.filter(s => (s.govAlignmentScore ?? 0) >= 2).length,
    };
    const total = sources.length || 1;

    return (
        <View className="bg-surface-light-elevated dark:bg-surface-dark-elevated p-6 rounded-3xl border border-border-light dark:border-border-dark mb-8 shadow-sm shadow-zinc-200/50 dark:shadow-none">
            <Text className="text-display-lg font-sans-bold text-zinc-900 dark:text-white mb-6 tracking-tight">
                Medya Dağılımı
            </Text>
            <View className="flex-row h-20 items-end gap-2">
                {/* Left */}
                <View className="flex-1 items-center gap-2">
                    <View className="w-full bg-indigo-400 rounded-t-xl opacity-90" style={{ height: `${(groups.left / total) * 100}%`, minHeight: 6 }} />
                    <Text className="text-body-xs font-sans-semibold text-zinc-500 uppercase tracking-widest">Muhalif</Text>
                    <Text className="text-body-lg font-sans-black text-zinc-800 dark:text-zinc-200">{groups.left}</Text>
                </View>
                {/* Center */}
                <View className="flex-1 items-center gap-2">
                    <View className="w-full bg-zinc-400 rounded-t-xl opacity-90" style={{ height: `${(groups.center / total) * 100}%`, minHeight: 6 }} />
                    <Text className="text-body-xs font-sans-semibold text-zinc-500 uppercase tracking-widest">Nötr</Text>
                    <Text className="text-body-lg font-sans-black text-zinc-800 dark:text-zinc-200">{groups.center}</Text>
                </View>
                {/* Right */}
                <View className="flex-1 items-center gap-2">
                    <View className="w-full bg-amber-400 rounded-t-xl opacity-90" style={{ height: `${(groups.right / total) * 100}%`, minHeight: 6 }} />
                    <Text className="text-body-xs font-sans-semibold text-zinc-500 uppercase tracking-widest">İktidar</Text>
                    <Text className="text-body-lg font-sans-black text-zinc-800 dark:text-zinc-200">{groups.right}</Text>
                </View>
            </View>
        </View>
    );
}

export default function AnalysisScreen() {
    const { selectedCountry, toggleSideMenu } = useAppStore();
    const activeScheme = useThemeStore(state => state.activeScheme);
    const isDark = activeScheme === 'dark';

    const { data: sources, isLoading } = useSources(selectedCountry);
    const { data: latestDigest } = useLatestDigest(selectedCountry);
    const { data: ciiData } = useCII(selectedCountry);

    const queryClient = useQueryClient();
    const user = useAuthStore(s => s.user);

    const handleVote = useCallback(async (action: 'alignment' | 'reliability', id: number, val: number) => {
        if (!user) return Alert.alert('Giriş Yapın', 'Oy kullanmak için giriş yapmalısınız.');
        try {
            if (action === 'alignment') await sourceService.voteSource(id, val);
            else await sourceService.voteReliability(id, val);
            queryClient.invalidateQueries({ queryKey: ['sources'] });
            Alert.alert('Başarılı', 'Oyunuz kaydedildi.');
        } catch { Alert.alert('Hata', 'İşlem başarısız.'); }
    }, [user, queryClient]);

    return (
        <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark" edges={['top']}>
            {/* Header */}
            <View className="px-5 pt-4 pb-4 bg-surface-light dark:bg-surface-dark z-10">
                <View className="flex-row items-center justify-between">
                    {/* @ts-ignore */}
                    <MotiPressable
                        onPress={toggleSideMenu}
                        className="w-11 h-11 items-center justify-center rounded-full bg-surface-light-subtle dark:bg-surface-dark-subtle"
                        animate={({ pressed }) => {
                            'worklet';
                            return { scale: pressed ? 0.9 : 1 };
                        }}
                    >
                        <Menu size={22} color={isDark ? "#ffffff" : "#18181b"} />
                    </MotiPressable>

                    <Text className="text-display-lg font-display-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
                        Analiz
                    </Text>

                    <CountrySelector />
                </View>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#0A66C2" /></View>
            ) : (
                <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

                    {/* 1. Hero: News Atmosphere */}
                    {ciiData && (
                        <View className="mb-8">
                            <Text className="text-display-lg font-sans-bold text-zinc-900 dark:text-white mb-4 tracking-tight">
                                Gündem Atmosferi
                            </Text>
                            <NewsAtmosphereCard data={ciiData} />
                        </View>
                    )}

                    {/* 2. Topics (Condensed) */}
                    {latestDigest?.topTopics?.length > 0 && (
                        <View className="mb-8">
                            <Text className="text-display-lg font-sans-bold text-zinc-900 dark:text-white mb-4 tracking-tight">
                                Öne Çıkan Başlıklar
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 px-5">
                                {latestDigest.topTopics.map((t, i) => (
                                    <View key={i} className="mr-4 w-64 bg-surface-light-elevated dark:bg-surface-dark-elevated p-4 rounded-3xl border border-border-light dark:border-border-dark shadow-sm">
                                        <Text className="text-body-md font-sans-bold text-zinc-900 dark:text-white mb-1.5 line-clamp-1">{t.title}</Text>
                                        <Text className="text-body-sm text-zinc-500 font-sans line-clamp-3 leading-tight">{t.description}</Text>
                                    </View>
                                ))}
                                <View className="w-5" />
                            </ScrollView>
                        </View>
                    )}

                    {/* 3. Spectrum Chart */}
                    <SpectrumChart sources={sources || []} />

                    {/* 4. Sources List */}
                    <Text className="text-display-xl font-display-extrabold text-zinc-900 dark:text-white mb-4 tracking-tight">
                        Kaynaklar
                    </Text>
                    {sources?.map(s => (
                        <SourceCard
                            key={s.id}
                            source={s}
                            onAlignmentVote={(id, v) => handleVote('alignment', id, v)}
                            onReliabilityVote={(id, v) => handleVote('reliability', id, v)}
                        />
                    ))}

                </ScrollView>
            )}
        </SafeAreaView>
    );
}
