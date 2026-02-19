import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldCheck, TrendingUp, AlertTriangle, Info, Star, ChevronDown, ChevronUp, Vote, Menu } from 'lucide-react-native';
import { useAppStore } from '../../src/store/useAppStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useSources } from '../../src/hooks/useSources';
import { useLatestDigest } from '../../src/hooks/useDigest';
import { useCII, useAllCII } from '../../src/hooks/useCII';
import { CountrySelector } from '../../src/components/navigation/CountrySelector';
import { sourceService } from '../../src/api/services/sourceService';
import { NewsAtmosphereCard } from '../../src/components/analysis/NewsAtmosphereCard';
import { CountryCIIComparison } from '../../src/components/analysis/CountryCIIComparison';
import { Source } from '../../src/types';
import { useStaggeredEntry } from '../../src/hooks/useStaggeredEntry';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

// ... (Helper functions for Alignment Color - kept same or improved)
function getAlignmentColor(score: number): string {
    if (score <= -3) return '#6366f1'; // Strong opposition - indigo-500
    if (score <= -1) return '#818cf8'; // Slight opposition - indigo-400
    if (score <= 1) return '#71717a';  // Neutral - zinc-500
    if (score <= 3) return '#fbbf24';  // Slight gov - amber-400
    return '#f59e0b';                  // Strong gov - amber-500 (adjusted for visibility)
}

function getAlignmentBgColor(score: number): string {
    return `${getAlignmentColor(score)}15`; // 15% opacity
}

function AlignmentBar({ score }: { score: number }) {
    const pct = ((score + 5) / 10) * 100;
    const color = getAlignmentColor(score);

    return (
        <View className="mt-2">
            <View className="h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
                {/* Center marker */}
                <View className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-zinc-300 dark:bg-zinc-600 -ml-[1px] z-10" />

                {/* Value Indicator */}
                <View
                    className="absolute top-0 bottom-0 w-4 h-4 rounded-full border-2 border-white dark:border-zinc-900 shadow-sm z-20"
                    style={{
                        left: `${Math.max(0, Math.min(100, pct))}%`,
                        backgroundColor: color,
                        transform: [{ translateX: -8 }, { translateY: -3 }],
                    }}
                />
            </View>
            <View className="flex-row justify-between mt-1.5">
                <Text className="text-[10px] text-zinc-400 font-medium">Muhalif</Text>
                <Text className="text-[10px] text-zinc-400 font-medium">Nötr</Text>
                <Text className="text-[10px] text-zinc-400 font-medium">İktidar</Text>
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
                    <TouchableOpacity
                        key={star}
                        disabled={!interactive}
                        onPress={() => onRate?.(star)}
                        onPressIn={() => interactive && setHoverRating(star)}
                        onPressOut={() => interactive && setHoverRating(0)}
                    >
                        <Star
                            size={interactive ? 24 : 14}
                            color={filled ? '#f59e0b' : '#e4e4e7'}
                            fill={filled ? '#f59e0b' : 'transparent'}
                            className="dark:text-zinc-700"
                        />
                    </TouchableOpacity>
                );
            })}
            {!interactive && count > 0 && (
                <Text className="text-[11px] text-zinc-400 ml-1 font-medium">
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

    return (
        <Animated.View entering={FadeInDown.duration(400).springify()} className="bg-white dark:bg-zinc-900 rounded-xl p-4 mb-3 border border-zinc-100 dark:border-zinc-800 shadow-sm">
            <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
                <View className="flex-row justify-between items-start">
                    <View className="flex-1 mr-4">
                        <View className="flex-row items-center gap-2 mb-1">
                            <View className="w-2 h-2 rounded-full" style={{ backgroundColor: getAlignmentColor(score) }} />
                            <Text className="text-[15px] font-bold text-zinc-900 dark:text-white">
                                {source.sourceName}
                            </Text>
                        </View>
                        <Text className="text-[12px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
                            {source.govAlignmentLabel || 'Veri yok'}
                        </Text>
                    </View>

                    <View className="items-end">
                        <ReliabilityStars score={reliability} count={source.reliabilityVoteCount ?? 0} />
                        {expanded ? <ChevronUp size={16} color="#d4d4d8" className="mt-2" /> : <ChevronDown size={16} color="#d4d4d8" className="mt-2" />}
                    </View>
                </View>

                {/* Simple Bar Preview */}
                {!expanded && <View className="mt-3 opacity-60"><AlignmentBar score={score} /></View>}
            </TouchableOpacity>

            {/* Expanded Content */}
            {expanded && (
                <View className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <Text className="text-[13px] font-semibold text-zinc-900 dark:text-white mb-2">
                        Politik Duruş Analizi
                    </Text>
                    <AlignmentBar score={score} />

                    {source.govAlignmentNotes && (
                        <View className="mt-3 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg">
                            <Text className="text-[12px] text-zinc-600 dark:text-zinc-300 leading-5">
                                {source.govAlignmentNotes}
                            </Text>
                        </View>
                    )}

                    {/* Voting Actions */}
                    <View className="flex-row gap-3 mt-4">
                        <TouchableOpacity
                            className="flex-1 bg-zinc-100 dark:bg-zinc-800 py-2.5 rounded-lg items-center flex-row justify-center gap-2"
                            onPress={() => onReliabilityVote(source.id, 5)} // Simplification: Opens full modal in real app
                        >
                            <Star size={14} color="#71717a" />
                            <Text className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-300">Güven Oyla</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="flex-1 bg-zinc-100 dark:bg-zinc-800 py-2.5 rounded-lg items-center flex-row justify-center gap-2"
                            onPress={() => onAlignmentVote(source.id, 0)} // Simplification
                        >
                            <Vote size={14} color="#71717a" />
                            <Text className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-300">Görüş Bildir</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
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
        <View className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 mb-6">
            <Text className="text-[14px] font-bold text-zinc-900 dark:text-white mb-4">
                Medya Dağılımı
            </Text>
            <View className="flex-row h-16 items-end gap-1">
                {/* Left */}
                <View className="flex-1 items-center gap-1">
                    <View className="w-full bg-indigo-500 rounded-t-sm opacity-90" style={{ height: `${(groups.left / total) * 100}%`, minHeight: 4 }} />
                    <Text className="text-[10px] text-zinc-400 font-medium">Muhalif</Text>
                    <Text className="text-[12px] font-bold text-zinc-700 dark:text-zinc-300">{groups.left}</Text>
                </View>
                {/* Center */}
                <View className="flex-1 items-center gap-1">
                    <View className="w-full bg-zinc-400 rounded-t-sm opacity-90" style={{ height: `${(groups.center / total) * 100}%`, minHeight: 4 }} />
                    <Text className="text-[10px] text-zinc-400 font-medium">Nötr</Text>
                    <Text className="text-[12px] font-bold text-zinc-700 dark:text-zinc-300">{groups.center}</Text>
                </View>
                {/* Right */}
                <View className="flex-1 items-center gap-1">
                    <View className="w-full bg-amber-500 rounded-t-sm opacity-90" style={{ height: `${(groups.right / total) * 100}%`, minHeight: 4 }} />
                    <Text className="text-[10px] text-zinc-400 font-medium">İktidar</Text>
                    <Text className="text-[12px] font-bold text-zinc-700 dark:text-zinc-300">{groups.right}</Text>
                </View>
            </View>
        </View>
    );
}

export default function AnalysisScreen() {
    const { selectedCountry, toggleSideMenu } = useAppStore();
    const router = useRouter();
    const { data: sources, isLoading } = useSources(selectedCountry);
    const { data: latestDigest } = useLatestDigest(selectedCountry);
    const { data: ciiData } = useCII(selectedCountry);

    // ... Voting logic (kept mostly same but could be refactored into hooks) ...
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
        <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-black" edges={['top']}>
            {/* Header */}
            <View className="px-5 py-4 flex-row items-center justify-between bg-zinc-50 dark:bg-black border-b border-zinc-100 dark:border-zinc-800">
                <TouchableOpacity onPress={toggleSideMenu} className="p-2 -ml-2 rounded-full active:bg-zinc-100 dark:active:bg-zinc-900">
                    <Menu size={24} color="#18181b" className="dark:text-white" />
                </TouchableOpacity>

                <Text className="text-[16px] font-bold text-blue-600">
                    Analiz
                </Text>

                <CountrySelector />
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center"><ActivityIndicator color="#2563eb" /></View>
            ) : (
                <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>

                    {/* 1. Hero: News Atmosphere */}
                    {ciiData && (
                        <View className="mb-6">
                            <Text className="text-[18px] font-bold text-zinc-900 dark:text-white mb-3">
                                Basın Atmosferi
                            </Text>
                            <NewsAtmosphereCard data={ciiData} />
                        </View>
                    )}

                    {/* 2. Topics (Condensed) */}
                    {latestDigest?.topTopics?.length > 0 && (
                        <View className="mb-6">
                            <Text className="text-[16px] font-bold text-zinc-900 dark:text-white mb-3">
                                Gündem Başlıkları
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 px-5">
                                {latestDigest.topTopics.map((t, i) => (
                                    <View key={i} className="mr-3 w-64 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                        <Text className="text-[13px] font-semibold text-zinc-900 dark:text-white" numberOfLines={1}>{t.title}</Text>
                                        <Text className="text-[11px] text-zinc-500 mt-1" numberOfLines={2}>{t.description}</Text>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* 3. Spectrum Disribution */}
                    <SpectrumChart sources={sources || []} />

                    {/* 4. Sources List */}
                    <Text className="text-[18px] font-bold text-zinc-900 dark:text-white mb-3">
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
