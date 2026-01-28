import React from 'react';
import { View, Text } from 'react-native';
import { Shield, TrendingUp } from 'lucide-react-native';

interface StatsOverviewProps {
    totalVotes: number;
    accurateVotes: number;
    className?: string;
}

export const StatsOverview = React.memo(function StatsOverview({ totalVotes, accurateVotes, className }: StatsOverviewProps) {
    return (
        <View className={`flex-row gap-4 ${className}`}>
            {/* Total Votes Card */}
            <View className="flex-1 bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 items-center">
                <View className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-full mb-2">
                    <Shield size={24} color="#006FFF" />
                </View>
                <Text className="text-2xl font-black text-zinc-900 dark:text-white">
                    {totalVotes}
                </Text>
                <Text className="text-xs text-zinc-500 font-medium text-center">Toplam Oy</Text>
            </View>

            {/* Accurate Votes Card */}
            <View className="flex-1 bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 items-center">
                <View className="bg-green-50 dark:bg-green-900/20 p-3 rounded-full mb-2">
                    <TrendingUp size={24} color="#10b981" />
                </View>
                <Text className="text-2xl font-black text-zinc-900 dark:text-white">
                    {accurateVotes}
                </Text>
                <Text className="text-xs text-zinc-500 font-medium text-center">Doğru Tespit</Text>
            </View>
        </View>
    );
});

StatsOverview.displayName = 'StatsOverview';
