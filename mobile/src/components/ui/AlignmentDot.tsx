import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming
} from 'react-native-reanimated';

interface AlignmentDotProps {
    score: number; // -5 to +5
    size?: number;
    className?: string;
}

export function AlignmentDot({ score, size = 8, className }: AlignmentDotProps) {
    const intensity = Math.abs(score);
    const isHighIntensity = intensity >= 4;
    
    // Animation definition
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    useEffect(() => {
        if (isHighIntensity) {
            scale.value = withRepeat(
                withSequence(
                    withTiming(1.2, { duration: 1000 }),
                    withTiming(1, { duration: 1000 })
                ),
                -1,
                true
            );
            opacity.value = withRepeat(
                withSequence(
                    withTiming(0.6, { duration: 1000 }),
                    withTiming(1, { duration: 1000 })
                ),
                -1,
                true
            );
        } else {
            scale.value = withTiming(1);
            opacity.value = withTiming(1);
        }
    }, [isHighIntensity, scale, opacity]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    // Determine color
    let colorClass = 'bg-zinc-400 dark:bg-zinc-500'; // Neutral
    let ringColorClass = 'border-zinc-200 dark:border-zinc-700';

    if (score <= -1) {
        colorClass = 'bg-indigo-600 dark:bg-indigo-500'; // Anti-Gov
        ringColorClass = 'border-indigo-200 dark:border-indigo-900';
    } else if (score >= 1) {
        colorClass = 'bg-amber-600 dark:bg-amber-500'; // Pro-Gov
        ringColorClass = 'border-amber-200 dark:border-amber-900';
    }

    return (
        <View className={`relative items-center justify-center ${className}`} style={{ width: size + 4, height: size + 4 }}>
            {/* Outer Ring / Glow */}
            {intensity > 0 && (
                <View 
                    className={`absolute inset-0 rounded-full border-2 opacity-30 ${ringColorClass}`} 
                />
            )}
            
            {/* Main Dot */}
            <Animated.View
                className={`rounded-full shadow-sm ${colorClass}`}
                style={[
                    { width: size, height: size },
                    animatedStyle
                ]}
            />
        </View>
    );
}
