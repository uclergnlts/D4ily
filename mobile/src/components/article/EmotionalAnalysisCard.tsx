import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { EmotionBar } from '../ui/EmotionBar';
import { EmotionalTone } from '../../types';
import { BrainCircuit, ChevronDown, ChevronUp } from 'lucide-react-native';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';

interface EmotionalAnalysisCardProps {
    emotionalTone: EmotionalTone | null | undefined;
    emotionalIntensity?: number | null;
    className?: string;
}

export const EmotionalAnalysisCard = React.memo(({ emotionalTone, emotionalIntensity, className }: EmotionalAnalysisCardProps) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!emotionalTone) return null;

    // Translation Map
    const emotionLabels: Record<string, string> = {
        anger: 'Öfke',
        fear: 'Korku',
        joy: 'Neşe',
        sadness: 'Üzüntü',
        surprise: 'Şaşkınlık',
        disgust: 'İğrenme',
        neutral: 'Nötr'
    };

    // Find dominant emotion
    const emotions = Object.entries(emotionalTone).map(([key, value]) => ({
        label: emotionLabels[key.toLowerCase()] || key,
        originalKey: key,
        value: value as number
    })).sort((a, b) => b.value - a.value); // Sort descending

    const dominant = emotions[0];
    const intensityPercent = Math.round((emotionalIntensity || 0) * 100);

    return (
        <Animated.View
            entering={FadeIn.duration(600).delay(200)}
            layout={Layout.springify()}
            className={`mb-6 bg-white dark:bg-zinc-900 mx-4 p-5 rounded-[24px] shadow-sm border border-zinc-100 dark:border-zinc-800/80 ${className}`}
        >

            {/* Header - Clickable for Toggle */}
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsExpanded(!isExpanded)}
                className="flex-row items-center justify-between"
            >
                <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 items-center justify-center">
                        <BrainCircuit size={20} color="#3b82f6" />
                    </View>
                    <View>
                        <Text className="text-[17px] font-bold text-zinc-900 dark:text-white leading-5">
                            Duygu Analizi
                        </Text>
                        {!isExpanded && (
                            <Text className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
                                Baskın: <Text className="text-blue-600 dark:text-blue-400 font-bold">{dominant.label}</Text>
                            </Text>
                        )}
                    </View>
                </View>

                <View className="flex-row items-center gap-2">
                    <View className={`px-2.5 py-1 rounded-full ${intensityPercent > 60 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                        <Text className={`text-[10px] font-bold ${intensityPercent > 60 ? 'text-amber-700 dark:text-amber-500' : 'text-zinc-500 dark:text-zinc-400'}`}>
                            %{intensityPercent} YOĞUNLUK
                        </Text>
                    </View>
                    {isExpanded ? <ChevronUp size={20} color="#a1a1aa" /> : <ChevronDown size={20} color="#a1a1aa" />}
                </View>
            </TouchableOpacity>

            {/* Collapsible Content */}
            {isExpanded && (
                <View className="mt-5">
                    {/* Bars Grid */}
                    <View>
                        {emotions.map((emotion, index) => (
                            <EmotionBar
                                key={emotion.label}
                                label={emotion.label}
                                value={emotion.value}
                                delay={index * 150} // Staggered animation
                            />
                        ))}
                    </View>
                </View>
            )}

        </Animated.View>
    );
});
