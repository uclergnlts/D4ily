import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface AlignmentGaugeProps {
    score: number; // -5 to +5
    showLabels?: boolean;
    compact?: boolean;
}

export function AlignmentGauge({ score, showLabels = true, compact = false }: AlignmentGaugeProps) {
    // Normalize score from -5..+5 to 0..100%
    const targetPercentage = Math.max(0, Math.min(100, ((score + 5) / 10) * 100));

    // Animation value
    const progress = useSharedValue(50); // Start at center

    useEffect(() => {
        progress.value = withSpring(targetPercentage, {
            damping: 15,
            stiffness: 90
        });
    }, [targetPercentage]);

    const animatedIndicatorStyle = useAnimatedStyle(() => ({
        left: `${progress.value}%`,
    }));

    // Determine active color
    let activeColor = 'bg-zinc-500 dark:bg-zinc-400';
    if (score <= -1) activeColor = 'bg-indigo-600 dark:bg-indigo-500';
    else if (score >= 1) activeColor = 'bg-amber-600 dark:bg-amber-500';

    return (
        <View className="w-full">
            {/* Labels Top (Optional) */}
            {/* Track */}
            <View className={`w-full ${compact ? 'h-1.5' : 'h-2.5'} bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden relative border border-zinc-200 dark:border-zinc-700/50`}>

                {/* Background Gradient Segments (Simulated with CSS) */}
                <View className="absolute inset-0 flex-row opacity-20">
                    <View className="flex-1 bg-indigo-500" />
                    <View className="flex-[0.5] bg-zinc-500" />
                    <View className="flex-1 bg-amber-500" />
                </View>

                {/* Center Marker */}
                <View className="absolute left-[50%] top-0 bottom-0 w-0.5 bg-white/50 dark:bg-zinc-900/50 z-10" />

                {/* Animated Indicator */}
                <Animated.View
                    className={`absolute top-0 bottom-0 ${compact ? 'w-2' : 'w-3'} -ml-1 ${activeColor} rounded-full shadow-sm z-20`}
                    style={animatedIndicatorStyle}
                />
            </View>

            {/* Bottom Labels */}
            {showLabels && !compact && (
                <View className="flex-row justify-between w-full px-1 mt-1.5">
                    <Text className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">Muhalif</Text>
                    <Text className="text-[10px] text-zinc-400 font-medium tracking-wider">Nötr</Text>
                    <Text className="text-[10px] text-amber-600 dark:text-amber-500 font-bold uppercase tracking-wider">İktidar</Text>
                </View>
            )}
        </View>
    );
}
