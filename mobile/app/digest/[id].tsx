import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Share, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useDigestDetail } from '../../src/hooks/useDigest';
import { useTrackReading } from '../../src/hooks/useHistory';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Share2 } from 'lucide-react-native';
import { safeBack } from '../../src/utils/navigation';
import { DigestHeader } from '../../src/components/digest/DigestHeader';
import { DigestSectionList } from '../../src/components/digest/DigestSectionList';
import { DigestTopicList } from '../../src/components/digest/DigestTopicList';
import { SocialHighlights } from '../../src/components/digest/SocialHighlights';
import { DigestReactions } from '../../src/components/digest/DigestReactions';
import { CommentSection } from '../../src/components/comments/CommentSection';
import { FeedbackButton, FeedbackSheet } from '../../src/components/feedback/FeedbackSheet';
import { useThemeStore } from '../../src/store/useThemeStore';

export default function DigestDetailScreen() {
    const { id, country } = useLocalSearchParams<{ id: string; country?: string }>();
    const router = useRouter();
    const activeScheme = useThemeStore(state => state.activeScheme);
    const isDark = activeScheme === 'dark';
    const queryClient = useQueryClient();
    const countryCode = country || 'tr';
    const trackReading = useTrackReading();
    const [feedbackVisible, setFeedbackVisible] = useState(false);

    const { data: digest, isLoading } = useDigestDetail(countryCode, id!);

    // Track reading history
    useEffect(() => {
        if (id && countryCode) {
            trackReading.mutate({ articleId: id, countryCode });
        }
    }, [id, countryCode, trackReading]);

    if (isLoading || !digest) {
        return (
            <View className="flex-1 bg-surface-light dark:bg-surface-dark items-center justify-center">
                <ActivityIndicator size="large" color="#0A66C2" />
            </View>
        );
    }

    const handleShare = async () => {
        try {
            await Share.share({
                message: `${digest.title}\n\n${digest.summary}\n\nD4ily uygulamasında oku.`,
            });
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <View className="flex-1 bg-surface-light dark:bg-surface-dark">
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />
            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Custom Header */}
                <View className="flex-row items-center justify-between px-4 pt-3 pb-3 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
                    <TouchableOpacity
                        onPress={() => safeBack(router)}
                        className="w-11 h-11 items-center justify-center bg-surface-light-subtle dark:bg-surface-dark-subtle rounded-full active:scale-95 transition-transform"
                    >
                        <ChevronLeft size={24} color={isDark ? '#fff' : '#18181b'} />
                    </TouchableOpacity>
                    <Text className="text-body-xl font-sans-bold text-zinc-900 dark:text-white tracking-tight">
                        Bülten Detayı
                    </Text>
                    <TouchableOpacity
                        onPress={handleShare}
                        className="w-11 h-11 items-center justify-center bg-surface-light-subtle dark:bg-surface-dark-subtle rounded-full active:scale-95 transition-transform"
                    >
                        <Share2 size={20} color={isDark ? '#fff' : '#18181b'} />
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    className="flex-1"
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
                >
                    <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
                        {/* Header Card */}
                        <DigestHeader
                            title={digest.title}
                            date={digest.date}
                            summary={digest.summary}
                        />

                        {/* Reactions (Like/Dislike) */}
                        <DigestReactions
                            digestId={id!}
                            country={countryCode}
                        />

                        <View className="h-4" />

                        {/* Social Media Highlights */}
                        {digest.socialHighlights && digest.socialHighlights.length > 0 && (
                            <SocialHighlights
                                tweets={digest.socialHighlights}
                                className="mb-6"
                            />
                        )}

                        {/* Category Sections (TR digests) */}
                        {digest.sections && digest.sections.length > 0 && (
                            <DigestSectionList
                                sections={digest.sections}
                                className="mb-6"
                            />
                        )}

                        {/* Top Topics */}
                        <DigestTopicList
                            topics={digest.topTopics}
                            onTopicPress={(articleId) => router.push({
                                pathname: '/article/[id]',
                                params: { id: articleId }
                            })}
                            className="mb-6"
                        />

                        <View className="px-5">
                            <View className="h-[1px] bg-border-light dark:bg-border-dark w-full my-4" />
                        </View>

                        {/* Comments */}
                        <CommentSection
                            comments={digest.comments ?? []}
                            targetType="daily_digest"
                            targetId={id!}
                            country={countryCode}
                            onCommentAdded={() => queryClient.invalidateQueries({ queryKey: ['digest', id] })}
                        />

                        <View className="px-5">
                            <View className="h-[1px] bg-border-light dark:bg-border-dark w-full my-4" />
                        </View>

                        {/* Feedback */}
                        <FeedbackButton onPress={() => setFeedbackVisible(true)} />
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>

            {/* Feedback Modal */}
            <FeedbackSheet
                visible={feedbackVisible}
                onClose={() => setFeedbackVisible(false)}
            />
        </View>
    );
}
