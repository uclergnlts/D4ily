import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
} from 'react-native-reanimated';
import type { CIIData } from '../../hooks/useCII';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface CIIBadgeProps {
    data: CIIData | undefined;
    compact?: boolean;
}

function getLevelColor(level: string) {
    switch (level) {
        case 'low': return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', dot: '#10b981' };
        case 'medium': return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', dot: '#f59e0b' };
        case 'high': return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: '#ef4444' };
        default: return { bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-500', dot: '#a1a1aa' };
    }
}

function getAnomalyLabel(level: string) {
    switch (level) {
        case 'ELEVATED': return 'Yükselen';
        case 'HIGH': return 'Yüksek';
        case 'CRITICAL': return 'Kritik';
        default: return null;
    }
}

export const CIIBadge: React.FC<CIIBadgeProps> = ({ data, compact = false }) => {
    const pulseOpacity = useSharedValue(1);
    const reducedMotion = useReducedMotion();

    const hasAnomaly = data?.anomaly && data.anomaly.level !== 'NORMAL';

    useEffect(() => {
        if (hasAnomaly && !reducedMotion) {
            pulseOpacity.value = withRepeat(
                withSequence(
                    withTiming(0.4, { duration: 800 }),
                    withTiming(1, { duration: 800 })
                ),
                -1,
                true
            );
        } else {
            pulseOpacity.value = 1;
        }
    }, [hasAnomaly, reducedMotion, pulseOpacity]);

    const pulseStyle = useAnimatedStyle(() => ({
        opacity: pulseOpacity.value,
    }));

    if (!data) return null;

    const colors = getLevelColor(data.level);
    const anomalyLabel = data.anomaly ? getAnomalyLabel(data.anomaly.level) : null;
    const levelLabel = data.level === 'low' ? 'düşük' : data.level === 'medium' ? 'orta' : 'yüksek';

    if (compact) {
        return (
            <Animated.View
                style={hasAnomaly && !reducedMotion ? pulseStyle : undefined}
                accessibilityLabel={`Risk skoru ${data.score}, ${levelLabel} risk`}
            >
                <View className={`flex-row items-center px-2 py-1 rounded-full ${colors.bg}`}>
                    <View className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: colors.dot }} />
                    <Text
                        className={`text-[11px] ${colors.text}`}
                        style={{ fontFamily: 'DMSans_700Bold' }}
                    >
                        {data.score}
                    </Text>
                </View>
            </Animated.View>
        );
    }

    return (
        <Animated.View
            style={hasAnomaly && !reducedMotion ? pulseStyle : undefined}
            accessibilityLabel={`Risk skoru ${data.score} üzerinden 100, ${levelLabel} risk${anomalyLabel ? `, anomali: ${anomalyLabel}` : ''}`}
        >
            <View className={`flex-row items-center px-2.5 py-1.5 rounded-xl ${colors.bg} gap-2`}>
                <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.dot }} />
                <View>
                    <Text
                        className={`text-[12px] ${colors.text}`}
                        style={{ fontFamily: 'DMSans_700Bold' }}
                    >
                        Risk: {data.score}/100
                    </Text>
                    {anomalyLabel && (
                        <Text
                            className={`text-[10px] ${colors.text}`}
                            style={{ fontFamily: 'DMSans_600SemiBold' }}
                        >
                            {anomalyLabel} ({data.anomaly.zScore}x)
                        </Text>
                    )}
                </View>
            </View>
        </Animated.View>
    );
};
