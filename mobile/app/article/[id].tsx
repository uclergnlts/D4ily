import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import { feedService } from '../../src/api/services/feedService';
import { PerspectivesSection } from '../../src/components/article/PerspectivesSection';

export default function ArticleDetailScreen() {
    const { id, country } = useLocalSearchParams<{ id: string; country?: string }>();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const countryCode = country || 'tr';

    const { data: article, isLoading: articleLoading } = useQuery({
        queryKey: ['article', countryCode, id],
        queryFn: () => feedService.getArticle(countryCode, id!),
        enabled: !!id,
    });

    const { data: perspectives, isLoading: perspectivesLoading } = useQuery({
        queryKey: ['perspectives', countryCode, id],
        queryFn: () => feedService.getPerspectives(countryCode, id!),
        enabled: !!id,
    });

    if (articleLoading) {
        return (
            <View className="flex-1 bg-zinc-50 dark:bg-black items-center justify-center">
                <ActivityIndicator size="large" color="#006FFF" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-zinc-50 dark:bg-black">
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView className="flex-1" edges={['top']}>
                <View className="flex-row items-center px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-full mr-3"
                    >
                        <ChevronLeft size={24} color={isDark ? '#fff' : '#18181b'} />
                    </TouchableOpacity>
                    <Text
                        className="text-lg text-zinc-900 dark:text-white flex-1"
                        style={{ fontFamily: 'DMSans_700Bold' }}
                        numberOfLines={1}
                    >
                        Haber Detayi
                    </Text>
                </View>

                <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
                    {article ? (
                        <View className="p-4">
                            {/* Article card */}
                            <View className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800 mb-4">
                                <Text
                                    className="text-xl text-zinc-900 dark:text-white mb-3"
                                    style={{ fontFamily: 'DMSans_700Bold', lineHeight: 28 }}
                                >
                                    {article.translatedTitle}
                                </Text>
                                <Text
                                    className="text-[14px] text-zinc-600 dark:text-zinc-400 mb-4"
                                    style={{ fontFamily: 'DMSans_400Regular', lineHeight: 22 }}
                                >
                                    {article.summary}
                                </Text>
                                <View className="flex-row items-center gap-3">
                                    <Text
                                        className="text-[12px] text-zinc-400"
                                        style={{ fontFamily: 'DMSans_500Medium' }}
                                    >
                                        {article.source || article.sources?.[0]?.sourceName || countryCode.toUpperCase()}
                                    </Text>
                                    <Text className="text-[12px] text-zinc-300">·</Text>
                                    <Text
                                        className="text-[12px] text-zinc-400"
                                        style={{ fontFamily: 'DMSans_400Regular' }}
                                    >
                                        {new Date(article.publishedAt).toLocaleDateString('tr-TR', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                        })}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <View className="p-4">
                            <View className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800">
                                <Text
                                    className="text-zinc-500 text-center"
                                    style={{ fontFamily: 'DMSans_400Regular' }}
                                >
                                    Haber bulunamadi.
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Perspectives */}
                    {perspectivesLoading ? (
                        <View className="items-center py-8">
                            <ActivityIndicator size="small" color="#006FFF" />
                            <Text
                                className="text-[12px] text-zinc-400 mt-2"
                                style={{ fontFamily: 'DMSans_400Regular' }}
                            >
                                Farkli bakis acilari araniyor...
                            </Text>
                        </View>
                    ) : perspectives?.relatedPerspectives && perspectives.relatedPerspectives.length > 0 ? (
                        <PerspectivesSection perspectives={perspectives.relatedPerspectives} />
                    ) : article ? (
                        <View className="px-4">
                            <View className="bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl p-4 items-center">
                                <Text
                                    className="text-[13px] text-zinc-500 text-center"
                                    style={{ fontFamily: 'DMSans_400Regular' }}
                                >
                                    Bu haber icin henuz farkli bakis acisi bulunamadi.
                                </Text>
                            </View>
                        </View>
                    ) : null}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
