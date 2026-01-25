import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Award, TrendingUp } from 'lucide-react-native';

interface ReputationCardProps {
    level: string;
    accuracyPercentage: number; // 0 to 100
    className?: string;
}

export const ReputationCard = React.memo(({ level, accuracyPercentage, className }: ReputationCardProps) => {
    const isExpert = level === 'Uzman';
    const levelColor = isExpert ? 'text-amber-500' : 'text-blue-600 dark:text-blue-400';
    const progressColor = isExpert ? 'bg-amber-500' : 'bg-blue-600 dark:bg-blue-500';

    // Animation
    const width = useSharedValue(0);

    useEffect(() => {
        width.value = withDelay(300, withTiming(accuracyPercentage, { duration: 1000 }));
    }, [accuracyPercentage]);

    const animatedStyle = useAnimatedStyle(() => ({
        width: `${width.value}%`,
    }));

    return (
        <View className={`bg-white dark:bg-zinc-900 p-6 rounded-[24px] shadow-sm border border-zinc-100 dark:border-zinc-800 ${className}`}>

            {/* Header */}
            <View className="flex-row items-center justify-between mb-5">
                <View className="flex-row items-center gap-3">
                    <View className={`w-10 h-10 rounded-full items-center justify-center ${isExpert ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                        {isExpert ? <Award size={20} color="#f59e0b" /> : <TrendingUp size={20} color="#2563eb" />}
                    </View>
                    <View>
                        <Text className="font-bold text-zinc-900 dark:text-white text-[15px]">İsabet Oranı</Text>
                        <Text className="text-xs text-zinc-500">Doğruluk Puanı</Text>
                    </View>
                </View>
                <Text className={`font-black text-3xl ${levelColor}`}>%{accuracyPercentage}</Text>
            </View>

            {/* Progress Bar */}
            <View className="h-3.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-4 border border-zinc-200 dark:border-zinc-700/50">
                <Animated.View
                    className={`h-full rounded-full shadow-sm ${progressColor}`}
                    style={animatedStyle}
                />
            </View>

            {/* Footer Text */}
            <View className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <Text className="text-xs text-zinc-600 dark:text-zinc-300 leading-5">
                    Şu an <Text className={`font-bold ${levelColor}`}>{level}</Text> seviyesindesin.
                    Analizlerin topluluk ortalamasının <Text className="font-bold">üzerinde</Text>.
                </Text>
            </View>
        </View>
    );
});
