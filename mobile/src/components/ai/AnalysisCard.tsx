import React from 'react';
import { View, Text } from 'react-native';
import { EmotionalAnalysisResponse } from '../../types';

export const AnalysisCard = ({ analysis }: { analysis: EmotionalAnalysisResponse }) => {
    return (
        <View className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 my-4">
            <View className="flex-row items-center justify-between mb-3">
                <Text className="font-bold text-zinc-900 dark:text-zinc-100">AI Analiz Sinyalleri</Text>
                <View className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
                    <Text className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                        Güven: %{Math.round((analysis.politicalConfidence || 0) * 100)}
                    </Text>
                </View>
            </View>

            {/* Metrics */}
            <MetricRow label="Duygusal Yoğunluk" value={analysis.emotionalIntensity} />
            <MetricRow label="Yüklü Dil" value={analysis.loadedLanguageScore} />
            <MetricRow label="Sansasyon" value={analysis.sensationalismScore} />

            <Text className="text-xs text-zinc-400 mt-2">
                Dominant Duygu: <Text className="font-medium text-zinc-600 dark:text-zinc-300">{analysis.dominantEmotionLabel}</Text>
            </Text>
        </View>
    );
};

const MetricRow = ({ label, value }: { label: string, value: number }) => {
    const safeValue = value || 0;
    const isHigh = safeValue > 0.6;
    const barColor = isHigh ? 'bg-amber-500' : 'bg-primary'; // Green yerine Primary (Blue) daha iyi durur

    return (
        <View className="mb-3">
            <View className="flex-row justify-between mb-1">
                <Text className="text-xs text-zinc-500">{label}</Text>
                <Text className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {isHigh ? 'Yüksek' : 'Normal'}
                </Text>
            </View>
            <View className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <View
                    className={`h-full rounded-full ${barColor}`}
                    style={{ width: `${safeValue * 100}%` }}
                />
            </View>
        </View>
    );
};
