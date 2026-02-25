import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import { safeBack } from '../../src/utils/navigation';
import { feedService } from '../../src/api/services/feedService';
import { PerspectivesSection } from '../../src/components/article/PerspectivesSection';
import { useThemeStore } from '../../src/store/useThemeStore';

export default function ArticleDetailScreen() {
    const { id, country } = useLocalSearchParams<{ id: string; country?: string }>();
    const router = useRouter();
    const activeScheme = useThemeStore(state => state.activeScheme);
    const isDark = activeScheme === 'dark';
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
            <View className="flex-1 bg-surface-light dark:bg-surface-dark items-center justify-center">
                <ActivityIndicator size="large" color="#0A66C2" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-surface-light dark:bg-surface-dark">
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView className="flex-1" edges={['top']}>
                <View className="flex-row items-center px-4 pt-3 pb-3 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
                    <TouchableOpacity
                        onPress={() => safeBack(router)}
                        className="w-11 h-11 items-center justify-center bg-surface-light-subtle dark:bg-surface-dark-subtle rounded-full mr-3 active:scale-95 transition-transform"
                    >
                        <ChevronLeft size={24} color={isDark ? '#fff' : '#18181b'} />
                    </TouchableOpacity>
                    <Text
                        className="text-body-xl font-sans-bold text-zinc-900 dark:text-white flex-1 tracking-tight"
                        numberOfLines={1}
                    >
                        Haber Detayı
                    </Text>
                </View>

                <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100, paddingTop: 16 }}>
                    {article ? (
                        <View className="px-5">
                            {/* Article card */}
                            <View className="bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-3xl p-6 border border-border-light dark:border-border-dark shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none mb-6">
                                <Text
                                    className="text-display-lg font-sans-black text-zinc-900 dark:text-white mb-4 tracking-tight leading-[32px]"
                                    style={{ lineHeight: 32 }}
                                >
                                    {article.translatedTitle}
                                </Text>
                                <Text
                                    className="text-body-md font-sans text-zinc-600 dark:text-zinc-300 mb-6 leading-[26px]"
                                >
                                    {article.summary}
                                </Text>
                                <View className="flex-row items-center gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                    <View className="px-3 py-1 bg-primary-50 dark:bg-primary-900/30 rounded-full">
                                        <Text
                                            className="text-body-xs font-sans-bold text-primary-700 dark:text-primary-300 uppercase tracking-widest"
                                        >
                                            {article.source || article.sources?.[0]?.sourceName || countryCode.toUpperCase()}
                                        </Text>
                                    </View>
                                    <Text className="text-body-xs text-zinc-300 dark:text-zinc-600 font-sans-bold">·</Text>
                                    <Text
                                        className="text-body-xs font-sans-medium text-zinc-400"
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
                        <View className="px-5">
                            <View className="bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-3xl p-8 border border-border-light dark:border-border-dark items-center justify-center">
                                <Text
                                    className="text-zinc-500 font-sans text-body-md text-center"
                                >
                                    Haber bulunamadı.
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Perspectives */}
                    {perspectivesLoading ? (
                        <View className="items-center py-10">
                            <ActivityIndicator size="small" color="#0A66C2" />
                            <Text
                                className="text-body-xs font-sans-medium text-zinc-400 mt-4 tracking-wide"
                            >
                                Farklı bakış açıları aranıyor...
                            </Text>
                        </View>
                    ) : perspectives?.relatedPerspectives && perspectives.relatedPerspectives.length > 0 ? (
                        <PerspectivesSection perspectives={perspectives.relatedPerspectives} />
                    ) : article ? (
                        <View className="px-5">
                            <View className="bg-surface-light-subtle dark:bg-surface-dark-subtle rounded-3xl p-6 items-center">
                                <Text
                                    className="text-body-sm font-sans text-zinc-500 text-center"
                                >
                                    Bu haber için henüz farklı bakış açısı bulunamadı.
                                </Text>
                            </View>
                        </View>
                    ) : null}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
