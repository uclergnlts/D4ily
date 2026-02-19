import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import type { CountryMeta } from './mapConstants';
import type { NewsLocationData } from '../../api/services/digestService';

interface NewsLocationPanelProps {
    country: CountryMeta;
    locationData: NewsLocationData;
    onClose: () => void;
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

function getPeriodLabel(period: string): string {
    return period === 'morning' ? 'Sabah' : 'Akşam';
}

// Group topics by date
function groupByDate(topics: NewsLocationData['topTopics']): Record<string, NewsLocationData['topTopics']> {
    const groups: Record<string, NewsLocationData['topTopics']> = {};
    for (const topic of topics) {
        const key = topic.date;
        if (!groups[key]) groups[key] = [];
        groups[key].push(topic);
    }
    return groups;
}

export const NewsLocationPanel: React.FC<NewsLocationPanelProps> = ({
    country,
    locationData,
    onClose,
}) => {
    const grouped = groupByDate(locationData.topTopics);
    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    return (
        <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            className="absolute bottom-0 left-0 right-0 shadow-2xl shadow-black/20"
            style={{ maxHeight: 400 }}
        >
            <View className="bg-white dark:bg-zinc-900 rounded-t-[32px] border-t border-zinc-100 dark:border-zinc-800 overflow-hidden">
                {/* Drag Handle */}
                <View className="items-center pt-3 pb-1">
                    <View className="w-12 h-1 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                </View>

                {/* Header */}
                <View className="px-6 pb-4 flex-row items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
                    <View className="flex-row items-center gap-3">
                        <Text className="text-3xl">{country.flag}</Text>
                        <View>
                            <Text className="text-lg font-bold text-zinc-900 dark:text-white">
                                {country.name}
                            </Text>
                            <View className="flex-row items-center gap-2">
                                <View className="bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
                                    <Text className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                                        {locationData.digestCount} Haber
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                    <Pressable
                        onPress={onClose}
                        className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center active:bg-zinc-200 dark:active:bg-zinc-700"
                    >
                        <Text className="text-zinc-500 font-bold text-xs">✕</Text>
                    </Pressable>
                </View>

                {/* Topics list */}
                <ScrollView
                    className="flex-1 px-6"
                    contentContainerStyle={{ paddingVertical: 16 }}
                    style={{ maxHeight: 300 }}
                    showsVerticalScrollIndicator={false}
                >
                    {sortedDates.map((date) => (
                        <View key={date} className="mb-6 last:mb-0">
                            <View className="flex-row items-center gap-2 mb-3">
                                <View className="w-1 h-4 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
                                <Text className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                    {formatDate(date)}
                                </Text>
                            </View>

                            {grouped[date].map((topic, idx) => (
                                <View
                                    key={`${date}-${idx}`}
                                    className="pl-3 border-l border-zinc-100 dark:border-zinc-800 mb-4 last:mb-0"
                                >
                                    <View className="flex-row items-center gap-2 mb-1">
                                        <View className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">
                                            <Text className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase">
                                                {getPeriodLabel(topic.period)}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text className="text-sm font-bold text-zinc-900 dark:text-white leading-5 mb-1">
                                        {topic.title}
                                    </Text>

                                    {topic.description ? (
                                        <Text className="text-xs text-zinc-500 dark:text-zinc-400 leading-4" numberOfLines={2}>
                                            {topic.description}
                                        </Text>
                                    ) : null}
                                </View>
                            ))}
                        </View>
                    ))}

                    {sortedDates.length === 0 && (
                        <View className="py-8 items-center justify-center">
                            <Text className="text-sm font-medium text-zinc-400 text-center">
                                Bu dönemde haber kaydı bulunamadı
                            </Text>
                        </View>
                    )}
                    <View className="h-6" />
                </ScrollView>
            </View>
        </Animated.View>
    );
};
