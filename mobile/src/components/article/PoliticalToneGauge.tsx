import React from 'react';
import { View, Text } from 'react-native';
import { AlignmentGauge } from '../ui/AlignmentGauge';
import { Scale } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface PoliticalToneGaugeProps {
    politicalTone: number; // -5 to +5
    politicalConfidence: number; // 0 to 1
    governmentMentioned?: boolean;
}

export const PoliticalToneGauge = React.memo(({ politicalTone, politicalConfidence, governmentMentioned }: PoliticalToneGaugeProps) => {
    const confidencePercent = Math.round(politicalConfidence * 100);

    return (
        <Animated.View
            entering={FadeIn.duration(600)}
            className="mb-6 bg-white dark:bg-zinc-900 mx-4 p-5 rounded-[24px] shadow-sm border border-zinc-100 dark:border-zinc-800/80"
        >

            {/* Header */}
            <View className="flex-row items-center justify-between mb-6">
                <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 items-center justify-center">
                        <Scale size={20} color="#6366f1" />
                    </View>
                    <View>
                        <Text className="text-[17px] font-bold text-zinc-900 dark:text-zinc-100 leading-5">
                            Siyasi Ton
                        </Text>
                        <Text className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Yapay Zeka Analizi
                        </Text>
                    </View>
                </View>

                {/* Confidence Badge */}
                <View className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700">
                    <Text className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
                        %{confidencePercent} GÜVEN
                    </Text>
                </View>
            </View>

            {/* Gauge */}
            <View className="mb-2">
                <AlignmentGauge score={politicalTone} showLabels={true} />
            </View>

            {/* Footer Info */}
            {governmentMentioned && (
                <View className="mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800/50 flex-row items-center gap-2.5">
                    <View className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <Text className="text-xs text-zinc-500 font-medium leading-4 flex-1">
                        Bu içerikte hükümet veya siyasi aktörlere dair atıflar tespit edilmiştir.
                    </Text>
                </View>
            )}
        </Animated.View>
    );
});

PoliticalToneGauge.displayName = 'PoliticalToneGauge';
