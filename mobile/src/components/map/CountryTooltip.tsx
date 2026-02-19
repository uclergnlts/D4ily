import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import type { CIIData } from '../../hooks/useCII';
import type { CountryMeta } from './mapConstants';
import { getCIIColor } from './mapConstants';

interface CountryTooltipProps {
    country: CountryMeta;
    cii?: CIIData;
    onClose: () => void;
}

function getAnomalyText(cii?: CIIData): string | null {
    if (!cii?.anomaly || cii.anomaly.level === 'NORMAL') return null;
    const labels: Record<string, string> = {
        ELEVATED: 'Yükselen',
        HIGH: 'Yüksek',
        CRITICAL: 'Kritik',
    };
    return `${labels[cii.anomaly.level]} (${cii.anomaly.zScore}x)`;
}

export const CountryTooltip: React.FC<CountryTooltipProps> = ({ country, cii, onClose }) => {
    const anomalyText = getAnomalyText(cii);
    const color = getCIIColor(cii?.level);

    return (
        <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            className="absolute bottom-6 left-4 right-4 shadow-xl shadow-black/10"
        >
            <Pressable onPress={onClose}>
                <View className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-100 dark:border-zinc-800">
                    <View className="flex-row items-center justify-between mb-4">
                        <View className="flex-row items-center gap-3">
                            <Text className="text-3xl">{country.flag}</Text>
                            <View>
                                <Text className="text-lg font-bold text-zinc-900 dark:text-white">
                                    {country.name}
                                </Text>
                                <Text className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                    Risk Analizi
                                </Text>
                            </View>
                        </View>
                        <View className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center">
                            <Text className="text-zinc-400 font-bold text-xs">✕</Text>
                        </View>
                    </View>

                    {cii ? (
                        <View className="gap-3">
                            <View className="flex-row items-center gap-3 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl">
                                <View className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                                <Text className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                    Risk Skoru: <Text className="text-zinc-900 dark:text-white font-bold">{cii.score}/100</Text>
                                </Text>
                            </View>

                            <View className="flex-row gap-2">
                                <View className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-2xl">
                                    <Text className="text-xs text-zinc-400 mb-1 font-medium">Son 24 Saat</Text>
                                    <Text className="text-sm font-bold text-zinc-900 dark:text-white">
                                        {cii.articleCount24h} haber
                                    </Text>
                                </View>

                                {anomalyText && (
                                    <View className="flex-1 bg-amber-50 dark:bg-amber-900/10 p-3 rounded-2xl border border-amber-100 dark:border-amber-900/20">
                                        <Text className="text-xs text-amber-600/70 dark:text-amber-400/70 mb-1 font-bold">Anomali</Text>
                                        <Text className="text-sm font-bold text-amber-700 dark:text-amber-400">
                                            {anomalyText}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    ) : (
                        <View className="py-4 items-center">
                            <Text className="text-sm text-zinc-400">Veri yükleniyor...</Text>
                        </View>
                    )}
                </View>
            </Pressable>
        </Animated.View>
    );
};
