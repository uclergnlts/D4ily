import React from 'react';
import { View, Text } from 'react-native';

interface HistoryPoint {
    date: string;
    score: number;
}

interface SourceAlignmentHistoryProps {
    history: HistoryPoint[];
    className?: string;
}

export const SourceAlignmentHistory = React.memo(({ history, className }: SourceAlignmentHistoryProps) => {
    // Simplified visualization: A list of monthly snapshots
    // In a real app, use a Chart library (e.g., victory-native or react-native-chart-kit)

    return (
        <View className={`bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 ${className}`}>
            <Text className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
                Değişim Grafiği (Son 6 Ay)
            </Text>

            <View className="flex-row items-end justify-between h-32 px-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                {history.map((point, index) => {
                    const heightPercent = ((point.score + 5) / 10) * 100; // Map -5..5 to 0..100
                    const barHeight = Math.max(10, Math.min(100, heightPercent)); // Clamp between 10% and 100%

                    let color = 'bg-zinc-300';
                    if (point.score <= -2) color = 'bg-indigo-400';
                    if (point.score >= 2) color = 'bg-amber-400';

                    return (
                        <View key={index} className="items-center gap-2 w-8">
                            {/* Bar */}
                            <View className="w-2 bg-zinc-100 dark:bg-zinc-800 h-full rounded-full relative justify-end overflow-hidden">
                                <View
                                    className={`w-full rounded-full ${color}`}
                                    style={{ height: `${barHeight}%` }}
                                />
                            </View>
                            {/* Month Label */}
                            <Text className="text-[10px] text-zinc-400">
                                {new Date(point.date).toLocaleDateString('tr-TR', { month: 'short' })}
                            </Text>
                        </View>
                    );
                })}
            </View>

            <View className="flex-row justify-between mt-2">
                <Text className="text-[10px] text-zinc-400">Muhalif (-5)</Text>
                <Text className="text-[10px] text-zinc-400">İktidar (+5)</Text>
            </View>
        </View>
    );
});

SourceAlignmentHistory.displayName = 'SourceAlignmentHistory';
