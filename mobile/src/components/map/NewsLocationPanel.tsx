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
            className="absolute bottom-0 left-0 right-0"
            style={{ maxHeight: 320 }}
        >
            <View className="bg-white dark:bg-zinc-900 rounded-t-2xl border-t border-x border-zinc-200 dark:border-zinc-800">
                {/* Header */}
                <Pressable onPress={onClose}>
                    <View className="px-4 pt-3 pb-2 flex-row items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
                        <View className="flex-row items-center gap-2">
                            <Text className="text-lg">{country.flag}</Text>
                            <Text
                                className="text-[15px] text-zinc-900 dark:text-white"
                                style={{ fontFamily: 'DMSans_700Bold' }}
                            >
                                {country.name}
                            </Text>
                            <View className="bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 rounded-full">
                                <Text
                                    className="text-[11px] text-indigo-700 dark:text-indigo-300"
                                    style={{ fontFamily: 'DMSans_600SemiBold' }}
                                >
                                    {locationData.digestCount} özet
                                </Text>
                            </View>
                        </View>
                        <Text
                            className="text-[12px] text-zinc-400"
                            style={{ fontFamily: 'DMSans_400Regular' }}
                        >
                            kapat
                        </Text>
                    </View>
                </Pressable>

                {/* Topics list */}
                <ScrollView className="px-4" style={{ maxHeight: 240 }}>
                    {sortedDates.map((date) => (
                        <View key={date} className="py-2">
                            <Text
                                className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-1.5"
                                style={{ fontFamily: 'DMSans_600SemiBold' }}
                            >
                                {formatDate(date)}
                            </Text>
                            {grouped[date].map((topic, idx) => (
                                <View
                                    key={`${date}-${idx}`}
                                    className="flex-row items-start gap-2 mb-1.5"
                                >
                                    <View className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    <View className="flex-1">
                                        <Text
                                            className="text-[13px] text-zinc-800 dark:text-zinc-200"
                                            style={{ fontFamily: 'DMSans_500Medium' }}
                                        >
                                            {topic.title}
                                            <Text className="text-[11px] text-zinc-400 dark:text-zinc-500">
                                                {' '}· {getPeriodLabel(topic.period)}
                                            </Text>
                                        </Text>
                                        {topic.description ? (
                                            <Text
                                                className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5"
                                                style={{ fontFamily: 'DMSans_400Regular' }}
                                                numberOfLines={2}
                                            >
                                                {topic.description}
                                            </Text>
                                        ) : null}
                                    </View>
                                </View>
                            ))}
                        </View>
                    ))}
                    {sortedDates.length === 0 && (
                        <View className="py-4 items-center">
                            <Text className="text-[12px] text-zinc-400">
                                Bu dönemde haber bulunamadı
                            </Text>
                        </View>
                    )}
                    <View className="h-4" />
                </ScrollView>
            </View>
        </Animated.View>
    );
};
