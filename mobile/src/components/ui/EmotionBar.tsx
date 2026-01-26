import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

interface EmotionBarProps {
    label: string;
    value: number; // 0 to 1
    color?: string;
    className?: string;
    delay?: number;
}

export function EmotionBar({ label, value, color, className, delay = 0 }: EmotionBarProps) {
    // Default colors map
    const getColor = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('anger') || n.includes('öfke') || n.includes('kızgın')) return 'bg-rose-500';
        if (n.includes('fear') || n.includes('korku')) return 'bg-purple-500';
        if (n.includes('joy') || n.includes('neşe') || n.includes('mutlu')) return 'bg-emerald-500';
        if (n.includes('sadness') || n.includes('üzüntü')) return 'bg-blue-500';
        if (n.includes('surprise') || n.includes('şaşkın')) return 'bg-amber-500';
        return 'bg-zinc-500';
    };

    const barColor = color || getColor(label);
    const targetWidth = Math.min(100, Math.max(0, value * 100));

    const width = useSharedValue(0);

    useEffect(() => {
        width.value = withDelay(delay, withTiming(targetWidth, { duration: 800 }));
    }, [targetWidth, delay, width]);

    const animatedStyle = useAnimatedStyle(() => ({
        width: `${width.value}%`,
    }));

    return (
        <View className={`mb-3 ${className}`}>
            <View className="flex-row justify-between mb-1.5 items-end">
                <Text className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 capitalize tracking-wide">
                    {label}
                </Text>
                <Text className="text-[10px] font-medium text-zinc-400">
                    {Math.round(targetWidth)}%
                </Text>
            </View>
            <View className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <Animated.View
                    className={`h-full rounded-full ${barColor}`}
                    style={animatedStyle}
                />
            </View>
        </View>
    );
}
