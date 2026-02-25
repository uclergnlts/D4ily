import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLatestDigest } from '../../src/hooks/useDigest';
import { useTrackReading } from '../../src/hooks/useHistory';
import { BookOpen, Menu } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { CountrySelector } from '../../src/components/navigation/CountrySelector';
import { useAppStore } from '../../src/store/useAppStore';
import { useThemeStore } from '../../src/store/useThemeStore';
import { useQueryClient } from '@tanstack/react-query';

import { DigestHeader } from '../../src/components/digest/DigestHeader';
import { DigestSectionList } from '../../src/components/digest/DigestSectionList';
import { DigestTopicList } from '../../src/components/digest/DigestTopicList';
import { SocialHighlights } from '../../src/components/digest/SocialHighlights';
import { DigestReactions } from '../../src/components/digest/DigestReactions';
import { CommentSection } from '../../src/components/comments/CommentSection';

export default function HomeScreen() {
    const router = useRouter();
    const activeScheme = useThemeStore(state => state.activeScheme);
    const isDark = activeScheme === 'dark';
    const { selectedCountry, toggleSideMenu } = useAppStore();
    const queryClient = useQueryClient();
    const trackReading = useTrackReading();

    // Fetch only the latest digest instead of the list
    const { data: latestDigest, isLoading, refetch, isRefetching } = useLatestDigest(selectedCountry);

    useEffect(() => {
        if (latestDigest?.id && selectedCountry) {
            trackReading.mutate({ articleId: latestDigest.id, countryCode: selectedCountry });
        }
    }, [latestDigest?.id, selectedCountry, trackReading]);

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark items-center justify-center">
                <ActivityIndicator size="large" color="#0A66C2" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark" edges={['top']}>
            <View className="px-5 pt-4 pb-2 bg-surface-light dark:bg-surface-dark z-10">
                <View className="flex-row items-center justify-between mb-8">
                    <TouchableOpacity
                        onPress={toggleSideMenu}
                        className="w-11 h-11 items-center justify-center rounded-full bg-surface-light-subtle dark:bg-surface-dark-subtle active:scale-95 transition-transform"
                        accessibilityLabel="Menüyü aç"
                        accessibilityRole="button"
                    >
                        <Menu size={22} color={isDark ? "#ffffff" : "#18181b"} />
                    </TouchableOpacity>

                    <CountrySelector />
                </View>

                {/* Spatial Text Header */}
                <View className="mb-4">
                    <Text className="text-display-xl font-sans-medium text-zinc-500 dark:text-zinc-400 tracking-tight">
                        Medyada Bugün
                    </Text>
                    <Text className="text-display-3xl font-display-extrabold text-zinc-900 dark:text-zinc-50 tracking-tighter mt-1 -ml-0.5">
                        Günlük <Text className="text-primary">Özet</Text>
                    </Text>
                </View>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#0A66C2" />
                }
            >
                {!latestDigest ? (
                    <View className="mx-5 mb-5 rounded-4xl p-8 border-2 border-dashed border-border-light dark:border-border-dark bg-surface-light-subtle dark:bg-surface-dark-subtle min-h-[300px] items-center justify-center mt-6 shadow-sm">
                        <View className="w-16 h-16 rounded-3xl bg-surface-light-elevated dark:bg-surface-dark-elevated shadow-sm shadow-zinc-200/50 dark:shadow-none items-center justify-center mb-5">
                            <BookOpen size={30} color={isDark ? "#71717A" : "#A1A1AA"} />
                        </View>
                        <Text className="text-display-lg font-display-extrabold text-zinc-900 dark:text-white text-center mb-2 tracking-tight">
                            Özet Yok
                        </Text>
                        <Text className="text-body-md text-zinc-500 text-center font-sans tracking-wide">
                            Bugün için henüz bülten oluşturulmamış. Daha sonra tekrar kontrol et.
                        </Text>
                    </View>
                ) : (
                    <>
                        <DigestHeader
                            title={latestDigest.title}
                            date={latestDigest.date}
                            summary={latestDigest.summary}
                        />

                        {/* Reactions (Like/Dislike) */}
                        <DigestReactions
                            digestId={latestDigest.id}
                            country={selectedCountry}
                        />

                        <View className="h-4" />

                        {/* Social Media Highlights */}
                        {latestDigest.socialHighlights && latestDigest.socialHighlights.length > 0 && (
                            <SocialHighlights
                                tweets={latestDigest.socialHighlights}
                                className="mb-6"
                            />
                        )}

                        {/* Category Sections (TR digests) */}
                        {latestDigest.sections && latestDigest.sections.length > 0 && (
                            <DigestSectionList
                                sections={latestDigest.sections}
                                className="mb-6"
                            />
                        )}

                        {/* Top Topics */}
                        {latestDigest.topTopics && latestDigest.topTopics.length > 0 && (
                            <DigestTopicList
                                topics={latestDigest.topTopics}
                                onTopicPress={(articleId) => router.push({
                                    pathname: '/article/[id]',
                                    params: { id: articleId, country: selectedCountry }
                                })}
                                className="mb-6"
                            />
                        )}

                        <View className="px-5">
                            <View className="h-[1px] bg-border-light dark:bg-border-dark w-full my-4" />
                        </View>

                        {/* Comments */}
                        <CommentSection
                            comments={latestDigest.comments ?? []}
                            targetType="daily_digest"
                            targetId={latestDigest.id}
                            country={selectedCountry}
                            onCommentAdded={() => queryClient.invalidateQueries({ queryKey: ['digest', 'latest', selectedCountry] })}
                        />
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
