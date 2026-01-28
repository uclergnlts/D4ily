import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { ArrowLeftRight } from 'lucide-react-native';

interface ComparisonItem {
    sourceName: string;
    sourceLogo?: string;
    alignmentLabel: string;
    summary: string;
}

interface ComparisonCardProps {
    topicTitle: string;
    left: ComparisonItem;
    right: ComparisonItem;
    className?: string;
    onPress?: () => void;
}

export const ComparisonCard = React.memo(function ComparisonCard({ topicTitle, left, right, className, onPress }: ComparisonCardProps) {
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8} className={`bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 p-4 ${className}`}>
            {/* Header */}
            <View className="flex-row items-center gap-2 mb-4 justify-center">
                <ArrowLeftRight size={16} color="#71717a" />
                <Text className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Haftanın Karşılaştırması
                </Text>
            </View>

            <Text className="text-lg font-bold text-zinc-900 dark:text-white text-center mb-6">
                {topicTitle}
            </Text>

            <View className="flex-row gap-4">
                {/* Left Side */}
                <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-2">
                        <View className="w-6 h-6 bg-zinc-100 rounded-full overflow-hidden">
                            {left.sourceLogo && <Image source={{ uri: left.sourceLogo }} style={{ width: 24, height: 24 }} />}
                        </View>
                        <Text className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{left.sourceName}</Text>
                    </View>
                    <View className="bg-indigo-50 dark:bg-indigo-900/10 p-2 rounded-lg mb-2 self-start">
                        <Text className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400">{left.alignmentLabel}</Text>
                    </View>
                    <Text className="text-xs text-zinc-600 dark:text-zinc-400 leading-4">
                        {left.summary}
                    </Text>
                </View>

                {/* Divider */}
                <View className="w-[1px] bg-zinc-100 dark:bg-zinc-800" />

                {/* Right Side */}
                <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-2">
                        <View className="w-6 h-6 bg-zinc-100 rounded-full overflow-hidden">
                            {right.sourceLogo && <Image source={{ uri: right.sourceLogo }} style={{ width: 24, height: 24 }} />}
                        </View>
                        <Text className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{right.sourceName}</Text>
                    </View>
                    <View className="bg-amber-50 dark:bg-amber-900/10 p-2 rounded-lg mb-2 self-start">
                        <Text className="text-[10px] font-bold text-amber-700 dark:text-amber-400">{right.alignmentLabel}</Text>
                    </View>
                    <Text className="text-xs text-zinc-600 dark:text-zinc-400 leading-4">
                        {right.summary}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
});

ComparisonCard.displayName = 'ComparisonCard';
