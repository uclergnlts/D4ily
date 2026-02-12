import React from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldCheck, TrendingUp, AlertTriangle, Info } from 'lucide-react-native';
import { useAppStore } from '../../src/store/useAppStore';
import { useSources } from '../../src/hooks/useSources';
import { useLatestDigest } from '../../src/hooks/useDigest';
import { CountrySelector } from '../../src/components/navigation/CountrySelector';
import { Source } from '../../src/types';
import { useStaggeredEntry } from '../../src/hooks/useStaggeredEntry';

function AlignmentBar({ score }: { score: number }) {
    const pct = ((score + 5) / 10) * 100;
    const barColor = score > 1 ? '#3b82f6' : score < -1 ? '#ef4444' : '#10b981';
    return (
        <View className="mt-2" accessibilityLabel={`Hükümet uyum skoru: ${score}`}>
            <View className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden relative">
                <View className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-zinc-300 dark:bg-zinc-600 -ml-[1px] z-10" />
                <View
                    className="absolute top-0 bottom-0 w-2 rounded-full"
                    style={{ left: `${Math.max(0, Math.min(95, pct))}%`, backgroundColor: barColor }}
                />
            </View>
            <View className="flex-row justify-between mt-1">
                <Text className="text-[10px] text-zinc-400" style={{ fontFamily: 'DMSans_400Regular' }}>Muhalif</Text>
                <Text className="text-[10px] text-zinc-400" style={{ fontFamily: 'DMSans_400Regular' }}>Tarafsız</Text>
                <Text className="text-[10px] text-zinc-400" style={{ fontFamily: 'DMSans_400Regular' }}>İktidar</Text>
            </View>
        </View>
    );
}

function SourceCard({ source }: { source: Source }) {
    const biasScore = Math.round(((source.biasScoreSystem ?? 0) + (source.biasScoreUser ?? 0)) / 2);
    const trustColor = biasScore > 70 ? '#10b981' : biasScore > 40 ? '#f59e0b' : '#ef4444';
    const trustLabel = biasScore > 70 ? 'Yüksek Güven' : biasScore > 40 ? 'Orta Güven' : 'Düşük Güven';

    return (
        <View
            className="bg-white dark:bg-zinc-900 rounded-2xl p-4 mb-3 border border-zinc-100 dark:border-zinc-800"
            accessibilityLabel={`${source.sourceName}, ${trustLabel}`}
        >
            <View className="flex-row items-center justify-between mb-1">
                <Text
                    className="text-base text-zinc-900 dark:text-white flex-1"
                    style={{ fontFamily: 'DMSans_700Bold' }}
                    numberOfLines={1}
                >
                    {source.sourceName}
                </Text>
                <View className="flex-row items-center gap-1 ml-2">
                    <ShieldCheck size={14} color={trustColor} />
                    <Text
                        className="text-xs"
                        style={{ color: trustColor, fontFamily: 'DMSans_600SemiBold' }}
                    >
                        {trustLabel}
                    </Text>
                </View>
            </View>

            <Text
                className="text-xs text-zinc-400 mb-3"
                style={{ fontFamily: 'DMSans_400Regular' }}
                numberOfLines={2}
            >
                {source.govAlignmentLabel || 'Analiz bekleniyor'}
            </Text>

            <AlignmentBar score={source.govAlignmentScore ?? 0} />
        </View>
    );
}

export default function AnalysisScreen() {
    const { selectedCountry } = useAppStore();
    const { data: sources, isLoading: sourcesLoading } = useSources(selectedCountry);
    const { data: latestDigest, isLoading: digestLoading } = useLatestDigest(selectedCountry);
    const { getEntryAnimation } = useStaggeredEntry();

    const isLoading = sourcesLoading || digestLoading;

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

                    <Animated.View className="mb-3" entering={getEntryAnimation(1)}>
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
                                Kaynakların hükümet uyum pozisyonları — sol muhalif, sağ iktidara yakın.
                            </Text>
                        </View>
                    </Animated.View>

                    {sources && sources.length > 0 ? (
                        sources.map((source, i) => (
                            <Animated.View key={source.id} entering={getEntryAnimation(i + 2)}>
                                <SourceCard source={source} />
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
