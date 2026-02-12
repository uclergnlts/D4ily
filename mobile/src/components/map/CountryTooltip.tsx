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
            className="absolute bottom-6 left-4 right-4"
        >
            <Pressable onPress={onClose}>
                <View className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800">
                    <View className="flex-row items-center justify-between mb-3">
                        <View className="flex-row items-center gap-2">
                            <Text className="text-lg">{country.flag}</Text>
                            <Text className="text-[16px] font-bold text-zinc-900 dark:text-white">
                                {country.name}
                            </Text>
                        </View>
                        <Text className="text-[12px] text-zinc-400">kapat</Text>
                    </View>

                    {cii ? (
                        <View className="gap-1.5">
                            <View className="flex-row items-center gap-2">
                                <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                                <Text className="text-[14px] font-semibold text-zinc-700 dark:text-zinc-300">
                                    Risk Skoru: {cii.score}/100
                                </Text>
                            </View>
                            <Text className="text-[12px] text-zinc-500 dark:text-zinc-400">
                                Son 24s: {cii.articleCount24h} haber
                            </Text>
                            {anomalyText && (
                                <View className="flex-row items-center gap-1.5 mt-1">
                                    <View className="w-2 h-2 rounded-full bg-amber-500" />
                                    <Text className="text-[12px] font-semibold text-amber-600 dark:text-amber-400">
                                        Anomali: {anomalyText}
                                    </Text>
                                </View>
                            )}
                        </View>
                    ) : (
                        <Text className="text-[12px] text-zinc-400">Veri yükleniyor...</Text>
                    )}
                </View>
            </Pressable>
        </Animated.View>
    );
};
