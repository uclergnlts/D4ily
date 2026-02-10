import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldCheck, TrendingUp, AlertTriangle, Info } from 'lucide-react-native';
import { useAppStore } from '../../src/store/useAppStore';
import { useSources } from '../../src/hooks/useSources';
import { useLatestDigest } from '../../src/hooks/useDigest';
import { CountrySelector } from '../../src/components/navigation/CountrySelector';
import { Source } from '../../src/types';

function AlignmentBar({ score }: { score: number }) {
    // score: -5 (anti-gov) to +5 (pro-gov), 0 = neutral
    const pct = ((score + 5) / 10) * 100;
    const barColor = score > 1 ? '#3b82f6' : score < -1 ? '#ef4444' : '#10b981';
    return (
        <View className="mt-2">
            <View className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden relative">
                <View className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-zinc-300 dark:bg-zinc-600 -ml-[1px] z-10" />
                <View
                    className="absolute top-0 bottom-0 w-2 rounded-full"
                    style={{ left: `${Math.max(0, Math.min(95, pct))}%`, backgroundColor: barColor }}
                />
            </View>
            <View className="flex-row justify-between mt-1">
                <Text className="text-[10px] text-zinc-400">Muhalif</Text>
                <Text className="text-[10px] text-zinc-400">Tarafsız</Text>
                <Text className="text-[10px] text-zinc-400">İktidar</Text>
            </View>
        </View>
    );
}

function SourceCard({ source }: { source: Source }) {
    const biasScore = Math.round(((source.biasScoreSystem ?? 0) + (source.biasScoreUser ?? 0)) / 2);
    const trustColor = biasScore > 70 ? '#10b981' : biasScore > 40 ? '#f59e0b' : '#ef4444';
    const trustLabel = biasScore > 70 ? 'Yüksek Güven' : biasScore > 40 ? 'Orta Güven' : 'Düşük Güven';

    return (
        <View className="bg-white dark:bg-zinc-900 rounded-2xl p-4 mb-3 border border-zinc-100 dark:border-zinc-800">
            <View className="flex-row items-center justify-between mb-1">
                <Text className="text-base font-bold text-zinc-900 dark:text-white flex-1" numberOfLines={1}>
                    {source.sourceName}
                </Text>
                <View className="flex-row items-center gap-1 ml-2">
                    <ShieldCheck size={14} color={trustColor} />
                    <Text className="text-xs font-semibold" style={{ color: trustColor }}>
                        {trustLabel}
                    </Text>
                </View>
            </View>

            <Text className="text-xs text-zinc-400 mb-3" numberOfLines={2}>
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

    const isLoading = sourcesLoading || digestLoading;

    return (
        <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-black" edges={['top']}>
            {/* Header */}
            <View className="px-5 py-4 flex-row items-center justify-between border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-black">
                <View>
                    <Text className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                        Medya Analizi
                    </Text>
                    <Text className="text-2xl font-black text-zinc-900 dark:text-white">Analiz</Text>
                </View>
                <CountrySelector />
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#006FFF" />
                </View>
            ) : (
                <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>

                    {/* Trending Topics from Latest Digest */}
                    {latestDigest && latestDigest.topTopics && latestDigest.topTopics.length > 0 && (
                        <View className="mb-6">
                            <View className="flex-row items-center gap-2 mb-3">
                                <TrendingUp size={18} color="#006FFF" />
                                <Text className="text-lg font-bold text-zinc-900 dark:text-white">Son Özetin Konuları</Text>
                            </View>
                            <View className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                                {latestDigest.topTopics.map((topic, i) => (
                                    <View
                                        key={i}
                                        className={`px-4 py-3 ${i < latestDigest.topTopics.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}
                                    >
                                        <Text className="font-semibold text-zinc-900 dark:text-white text-sm">{topic.title}</Text>
                                        <Text className="text-zinc-500 text-xs mt-0.5 leading-relaxed">{topic.description}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Sources */}
                    <View className="mb-3">
                        <View className="flex-row items-center gap-2 mb-1">
                            <ShieldCheck size={18} color="#006FFF" />
                            <Text className="text-lg font-bold text-zinc-900 dark:text-white">Kaynak Analizi</Text>
                        </View>
                        <View className="flex-row items-center gap-1 mb-4">
                            <Info size={12} color="#a1a1aa" />
                            <Text className="text-xs text-zinc-400">
                                Kaynakların hükümet uyum pozisyonları — sol muhalif, sağ iktidara yakın.
                            </Text>
                        </View>
                    </View>

                    {sources && sources.length > 0 ? (
                        sources.map(source => (
                            <SourceCard key={source.id} source={source} />
                        ))
                    ) : (
                        <View className="items-center py-12">
                            <AlertTriangle size={40} color="#d4d4d8" />
                            <Text className="text-zinc-400 text-center mt-3">
                                Bu ülke için kaynak verisi henüz mevcut değil.
                            </Text>
                        </View>
                    )}

                </ScrollView>
            )}
        </SafeAreaView>
    );
}
