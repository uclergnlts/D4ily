import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldCheck, TrendingUp, AlertTriangle, Info, Star, ChevronDown, ChevronUp, ThumbsUp, Vote } from 'lucide-react-native';
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

function getAlignmentColor(score: number): string {
    if (score <= -3) return '#6366f1'; // Strong opposition - indigo
    if (score <= -1) return '#818cf8'; // Slight opposition - lighter indigo
    if (score <= 1) return '#71717a';  // Neutral - zinc
    if (score <= 3) return '#f59e0b';  // Slight gov - amber
    return '#ef4444';                  // Strong gov - red
}

function getAlignmentBgColor(score: number): string {
    if (score <= -3) return 'rgba(99, 102, 241, 0.1)';
    if (score <= -1) return 'rgba(129, 140, 248, 0.08)';
    if (score <= 1) return 'rgba(113, 113, 122, 0.08)';
    if (score <= 3) return 'rgba(245, 158, 11, 0.08)';
    return 'rgba(239, 68, 68, 0.1)';
}

function AlignmentBar({ score }: { score: number }) {
    const pct = ((score + 5) / 10) * 100;
    const color = getAlignmentColor(score);

    return (
        <View accessibilityLabel={`Hükümet uyum skoru: ${score}`}>
            {/* Gradient-like bar */}
            <View className="h-3 rounded-full overflow-hidden relative" style={{ backgroundColor: 'rgba(113, 113, 122, 0.15)' }}>
                {/* Left gradient (opposition) */}
                <View className="absolute left-0 top-0 bottom-0 w-1/2 rounded-l-full"
                    style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)' }} />
                {/* Right gradient (government) */}
                <View className="absolute right-0 top-0 bottom-0 w-1/2 rounded-r-full"
                    style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }} />
                {/* Center line */}
                <View className="absolute left-1/2 top-0 bottom-0 w-[2px] -ml-[1px] z-10"
                    style={{ backgroundColor: 'rgba(113, 113, 122, 0.4)' }} />
                {/* Score indicator */}
                <View
                    className="absolute top-0 bottom-0 w-4 h-4 rounded-full border-2 border-white shadow-md z-20"
                    style={{
                        left: `${Math.max(2, Math.min(94, pct))}%`,
                        backgroundColor: color,
                        transform: [{ translateX: -8 }, { translateY: -0.5 }],
                        shadowColor: color,
                        shadowOpacity: 0.4,
                        shadowRadius: 4,
                        elevation: 4,
                    }}
                />
            </View>
            <View className="flex-row justify-between mt-1.5 px-0.5">
                <Text className="text-[10px]" style={{ fontFamily: 'DMSans_600SemiBold', color: '#6366f1' }}>Muhalif</Text>
                <Text className="text-[10px] text-zinc-400" style={{ fontFamily: 'DMSans_400Regular' }}>Tarafsız</Text>
                <Text className="text-[10px]" style={{ fontFamily: 'DMSans_600SemiBold', color: '#f59e0b' }}>İktidar</Text>
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
    const roundedScore = Math.round(displayScore * 10) / 10;

    return (
        <View>
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
                            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                        >
                            <Star
                                size={interactive ? 22 : 14}
                                color={filled ? '#f59e0b' : '#d4d4d8'}
                                fill={filled ? '#f59e0b' : 'transparent'}
                            />
                        </TouchableOpacity>
                    );
                })}
                {count > 0 && (
                    <Text className="text-[11px] text-zinc-400 ml-1" style={{ fontFamily: 'DMSans_500Medium' }}>
                        {roundedScore}/5 ({count})
                    </Text>
                )}
                {count === 0 && (
                    <Text className="text-[11px] text-zinc-400 ml-1" style={{ fontFamily: 'DMSans_400Regular' }}>
                        Henüz oy yok
                    </Text>
                )}
            </View>
        </View>
    );
}

function AlignmentVoteSlider({ score, onVote }: { score: number; onVote: (val: number) => void }) {
    const [value, setValue] = useState(score);
    const [changed, setChanged] = useState(false);
    const color = getAlignmentColor(value);
    const label = value <= -3 ? 'Muhalefete Yakın' : value <= -1 ? 'Muhalefete Eğilimli' : value <= 1 ? 'Nötr / Merkez' : value <= 3 ? 'İktidara Eğilimli' : 'İktidara Yakın';

    return (
        <View className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <Text className="text-[12px] text-zinc-500 mb-2" style={{ fontFamily: 'DMSans_600SemiBold' }}>
                Senin Oyun: {label} ({value > 0 ? '+' : ''}{value})
            </Text>
            <View className="flex-row items-center gap-2 flex-wrap">
                {[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map((v) => (
                    <TouchableOpacity
                        key={v}
                        onPress={() => { setValue(v); setChanged(true); }}
                        className="rounded-full items-center justify-center"
                        style={{
                            width: 28, height: 28,
                            backgroundColor: v === value ? getAlignmentColor(v) : 'rgba(113, 113, 122, 0.1)',
                        }}
                    >
                        <Text
                            className="text-[10px]"
                            style={{
                                fontFamily: 'DMSans_700Bold',
                                color: v === value ? '#fff' : '#71717a',
                            }}
                        >
                            {v > 0 ? `+${v}` : v}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            {changed && (
                <TouchableOpacity
                    onPress={() => { onVote(value); setChanged(false); }}
                    className="mt-2 py-2 rounded-xl items-center"
                    style={{ backgroundColor: color }}
                >
                    <Text className="text-white text-xs" style={{ fontFamily: 'DMSans_700Bold' }}>Oyu Gönder</Text>
                </TouchableOpacity>
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
    const color = getAlignmentColor(score);
    const bgColor = getAlignmentBgColor(score);
    const reliability = source.reliabilityScore ?? 0;
    const reliabilityCount = source.reliabilityVoteCount ?? 0;

    return (
        <View className="bg-white dark:bg-zinc-900 rounded-2xl mb-3 border border-zinc-100 dark:border-zinc-800 overflow-hidden">
            {/* Main card content */}
            <TouchableOpacity
                onPress={() => setExpanded(!expanded)}
                activeOpacity={0.7}
                className="p-4"
            >
                {/* Header row */}
                <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center gap-2 flex-1">
                        <View
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: color }}
                        />
                        <Text
                            className="text-base text-zinc-900 dark:text-white flex-1"
                            style={{ fontFamily: 'DMSans_700Bold' }}
                            numberOfLines={1}
                        >
                            {source.sourceName}
                        </Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                        {/* Alignment badge */}
                        <View className="px-2 py-1 rounded-lg" style={{ backgroundColor: bgColor }}>
                            <Text className="text-[11px]" style={{ color, fontFamily: 'DMSans_700Bold' }}>
                                {source.govAlignmentLabel || 'Belirsiz'}
                            </Text>
                        </View>
                        {expanded ? <ChevronUp size={16} color="#a1a1aa" /> : <ChevronDown size={16} color="#a1a1aa" />}
                    </View>
                </View>

                {/* Alignment bar */}
                <AlignmentBar score={score} />

                {/* Reliability stars row */}
                <View className="flex-row items-center justify-between mt-3">
                    <View className="flex-row items-center gap-1.5">
                        <ShieldCheck size={13} color="#71717a" />
                        <Text className="text-[11px] text-zinc-500" style={{ fontFamily: 'DMSans_500Medium' }}>
                            Güvenilirlik
                        </Text>
                    </View>
                    <ReliabilityStars score={reliability} count={reliabilityCount} />
                </View>

                {/* Notes preview */}
                {source.govAlignmentNotes && (
                    <Text
                        className="text-[11px] text-zinc-400 mt-2"
                        style={{ fontFamily: 'DMSans_400Regular', lineHeight: 16 }}
                        numberOfLines={expanded ? undefined : 1}
                    >
                        {source.govAlignmentNotes}
                    </Text>
                )}
            </TouchableOpacity>

            {/* Expanded voting section */}
            {expanded && (
                <View className="px-4 pb-4">
                    {/* Reliability voting */}
                    <View className="bg-zinc-50 dark:bg-zinc-800/30 rounded-xl p-3 mb-2">
                        <View className="flex-row items-center gap-1.5 mb-2">
                            <Star size={14} color="#f59e0b" />
                            <Text className="text-[12px] text-zinc-700 dark:text-zinc-300" style={{ fontFamily: 'DMSans_600SemiBold' }}>
                                Güvenilirlik Oyu Ver
                            </Text>
                        </View>
                        <ReliabilityStars
                            score={reliability}
                            count={reliabilityCount}
                            interactive
                            onRate={(rating) => onReliabilityVote(source.id, rating)}
                        />
                    </View>

                    {/* Alignment voting */}
                    <View className="bg-zinc-50 dark:bg-zinc-800/30 rounded-xl p-3">
                        <View className="flex-row items-center gap-1.5 mb-1">
                            <Vote size={14} color="#6366f1" />
                            <Text className="text-[12px] text-zinc-700 dark:text-zinc-300" style={{ fontFamily: 'DMSans_600SemiBold' }}>
                                Hükümet Uyum Oyu Ver
                            </Text>
                        </View>
                        <AlignmentVoteSlider
                            score={score}
                            onVote={(val) => onAlignmentVote(source.id, val)}
                        />
                    </View>

                    {/* Confidence info */}
                    {source.govAlignmentConfidence > 0 && (
                        <View className="flex-row items-center gap-1 mt-2 px-1">
                            <Info size={10} color="#a1a1aa" />
                            <Text className="text-[10px] text-zinc-400" style={{ fontFamily: 'DMSans_400Regular' }}>
                                Güven seviyesi: %{Math.round((source.govAlignmentConfidence ?? 0) * 100)}
                            </Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

function SpectrumOverview({ sources }: { sources: Source[] }) {
    const opposition = sources.filter(s => (s.govAlignmentScore ?? 0) <= -2).length;
    const neutral = sources.filter(s => {
        const sc = s.govAlignmentScore ?? 0;
        return sc > -2 && sc < 2;
    }).length;
    const proGov = sources.filter(s => (s.govAlignmentScore ?? 0) >= 2).length;
    const total = sources.length || 1;

    return (
        <View className="bg-white dark:bg-zinc-900 rounded-2xl p-4 mb-4 border border-zinc-100 dark:border-zinc-800">
            <Text className="text-sm text-zinc-900 dark:text-white mb-3" style={{ fontFamily: 'DMSans_700Bold' }}>
                Kaynak Dağılımı
            </Text>
            <View className="flex-row h-3 rounded-full overflow-hidden">
                {opposition > 0 && (
                    <View style={{ flex: opposition / total, backgroundColor: '#6366f1' }} className="rounded-l-full" />
                )}
                {neutral > 0 && (
                    <View style={{ flex: neutral / total, backgroundColor: '#71717a' }} />
                )}
                {proGov > 0 && (
                    <View style={{ flex: proGov / total, backgroundColor: '#f59e0b' }} className="rounded-r-full" />
                )}
            </View>
            <View className="flex-row justify-between mt-2">
                <View className="flex-row items-center gap-1">
                    <View className="w-2 h-2 rounded-full" style={{ backgroundColor: '#6366f1' }} />
                    <Text className="text-[11px] text-zinc-500" style={{ fontFamily: 'DMSans_500Medium' }}>
                        Muhalif ({opposition})
                    </Text>
                </View>
                <View className="flex-row items-center gap-1">
                    <View className="w-2 h-2 rounded-full" style={{ backgroundColor: '#71717a' }} />
                    <Text className="text-[11px] text-zinc-500" style={{ fontFamily: 'DMSans_500Medium' }}>
                        Nötr ({neutral})
                    </Text>
                </View>
                <View className="flex-row items-center gap-1">
                    <View className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
                    <Text className="text-[11px] text-zinc-500" style={{ fontFamily: 'DMSans_500Medium' }}>
                        İktidar ({proGov})
                    </Text>
                </View>
            </View>
        </View>
    );
}

export default function AnalysisScreen() {
    const { selectedCountry } = useAppStore();
    const user = useAuthStore(s => s.user);
    const { data: sources, isLoading: sourcesLoading } = useSources(selectedCountry);
    const { data: latestDigest, isLoading: digestLoading } = useLatestDigest(selectedCountry);
    const { data: ciiData } = useCII(selectedCountry);
    const { data: allCII } = useAllCII();
    const { getEntryAnimation } = useStaggeredEntry();
    const queryClient = useQueryClient();

    const isLoading = sourcesLoading || digestLoading;

    const handleAlignmentVote = useCallback(async (sourceId: number, score: number) => {
        if (!user) {
            Alert.alert('Giriş Gerekli', 'Oy vermek için giriş yapmalısınız.');
            return;
        }
        try {
            await sourceService.voteSource(sourceId, score);
            queryClient.invalidateQueries({ queryKey: ['sources'] });
            Alert.alert('Oy Kaydedildi', 'Hükümet uyum oyunuz başarıyla kaydedildi.');
        } catch {
            Alert.alert('Hata', 'Oy gönderilemedi. Tekrar deneyin.');
        }
    }, [user, queryClient]);

    const handleReliabilityVote = useCallback(async (sourceId: number, score: number) => {
        if (!user) {
            Alert.alert('Giriş Gerekli', 'Oy vermek için giriş yapmalısınız.');
            return;
        }
        try {
            await sourceService.voteReliability(sourceId, score);
            queryClient.invalidateQueries({ queryKey: ['sources'] });
            Alert.alert('Oy Kaydedildi', `Güvenilirlik oyunuz (${score}/5) başarıyla kaydedildi.`);
        } catch {
            Alert.alert('Hata', 'Oy gönderilemedi. Tekrar deneyin.');
        }
    }, [user, queryClient]);

    // Sort sources by alignment score for better visualization
    const sortedSources = sources ? [...sources].sort((a, b) => (a.govAlignmentScore ?? 0) - (b.govAlignmentScore ?? 0)) : [];

    return (
        <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-black" edges={['top']}>
            <View className="px-5 py-4 flex-row items-center justify-between border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-black">
                <View>
                    <Text
                        className="text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider"
                        style={{ fontFamily: 'DMSans_600SemiBold' }}
                    >
                        Medya Analizi
                    </Text>
                    <Text
                        className="text-2xl text-zinc-900 dark:text-white"
                        style={{ fontFamily: 'Syne_800ExtraBold', letterSpacing: -0.5 }}
                        accessibilityRole="header"
                    >
                        Analiz
                    </Text>
                </View>
                <CountrySelector />
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#006FFF" />
                </View>
            ) : (
                <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>

                    {latestDigest && latestDigest.topTopics && latestDigest.topTopics.length > 0 && (
                        <Animated.View className="mb-6" entering={getEntryAnimation(0)}>
                            <View className="flex-row items-center gap-2 mb-3">
                                <TrendingUp size={18} color="#006FFF" />
                                <Text
                                    className="text-lg text-zinc-900 dark:text-white"
                                    style={{ fontFamily: 'DMSans_700Bold' }}
                                >
                                    Son Özetin Konuları
                                </Text>
                            </View>
                            <View className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                                {latestDigest.topTopics.map((topic, i) => (
                                    <View
                                        key={i}
                                        className={`px-4 py-3 ${i < latestDigest.topTopics.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}
                                    >
                                        <Text
                                            className="text-zinc-900 dark:text-white text-sm"
                                            style={{ fontFamily: 'DMSans_600SemiBold' }}
                                        >
                                            {topic.title}
                                        </Text>
                                        <Text
                                            className="text-zinc-500 text-xs mt-0.5"
                                            style={{ fontFamily: 'DMSans_400Regular', lineHeight: 18 }}
                                        >
                                            {topic.description}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </Animated.View>
                    )}

                    {/* News Atmosphere - CII Breakdown */}
                    {ciiData && (
                        <Animated.View className="mb-4" entering={getEntryAnimation(1)}>
                            <NewsAtmosphereCard data={ciiData} />
                        </Animated.View>
                    )}

                    {/* Country CII Comparison */}
                    {allCII && Object.keys(allCII).length > 1 && (
                        <Animated.View className="mb-4" entering={getEntryAnimation(2)}>
                            <CountryCIIComparison allCII={allCII} selectedCountry={selectedCountry} />
                        </Animated.View>
                    )}

                    {/* Spectrum overview */}
                    {sortedSources.length > 0 && (
                        <Animated.View entering={getEntryAnimation(3)}>
                            <SpectrumOverview sources={sortedSources} />
                        </Animated.View>
                    )}

                    <Animated.View className="mb-3" entering={getEntryAnimation(4)}>
                        <View className="flex-row items-center gap-2 mb-1">
                            <ShieldCheck size={18} color="#006FFF" />
                            <Text
                                className="text-lg text-zinc-900 dark:text-white"
                                style={{ fontFamily: 'DMSans_700Bold' }}
                            >
                                Kaynak Analizi
                            </Text>
                        </View>
                        <View className="flex-row items-center gap-1 mb-4">
                            <Info size={12} color="#a1a1aa" />
                            <Text
                                className="text-xs text-zinc-400"
                                style={{ fontFamily: 'DMSans_400Regular' }}
                            >
                                Kaynakları genişleterek oy verin. Sol muhalif, sağ iktidara yakın.
                            </Text>
                        </View>
                    </Animated.View>

                    {sortedSources.length > 0 ? (
                        sortedSources.map((source, i) => (
                            <Animated.View key={source.id} entering={getEntryAnimation(i + 5)}>
                                <SourceCard
                                    source={source}
                                    onAlignmentVote={handleAlignmentVote}
                                    onReliabilityVote={handleReliabilityVote}
                                />
                            </Animated.View>
                        ))
                    ) : (
                        <View className="items-center py-12">
                            <AlertTriangle size={40} color="#d4d4d8" />
                            <Text
                                className="text-zinc-400 text-center mt-3"
                                style={{ fontFamily: 'DMSans_400Regular' }}
                            >
                                Bu ülke için kaynak verisi henüz mevcut değil.
                            </Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
