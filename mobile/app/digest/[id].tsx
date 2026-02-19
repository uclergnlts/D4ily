import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Share, useColorScheme, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useDigestDetail } from '../../src/hooks/useDigest';
import { useTrackReading } from '../../src/hooks/useHistory';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Share2 } from 'lucide-react-native';
import { DigestHeader } from '../../src/components/digest/DigestHeader';
import { DigestSectionList } from '../../src/components/digest/DigestSectionList';
import { DigestTopicList } from '../../src/components/digest/DigestTopicList';
import { SocialHighlights } from '../../src/components/digest/SocialHighlights';
import { DigestReactions } from '../../src/components/digest/DigestReactions';
import { CommentSection } from '../../src/components/comments/CommentSection';
import { FeedbackButton, FeedbackSheet } from '../../src/components/feedback/FeedbackSheet';


export default function DigestDetailScreen() {
    const { id, country } = useLocalSearchParams<{ id: string; country?: string }>();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
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
            <View className="flex-1 bg-zinc-50 dark:bg-black items-center justify-center">
                <ActivityIndicator size="large" color="#006FFF" />
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
        <View className="flex-1 bg-zinc-50 dark:bg-black">
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />
            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Custom Header */}
                <View className="flex-row items-center justify-between px-4 py-2 border-b border-zinc-100 dark:border-zinc-800">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="p-2 -ml-2"
                    >
                        <ChevronLeft size={28} color={isDark ? "#fff" : "#000"} />
                    </TouchableOpacity>
                    <Text className="text-[17px] font-bold text-zinc-900 dark:text-white">
                        Bülten Detayı
                    </Text>
                    <TouchableOpacity
                        onPress={handleShare}
                        className="p-2 -mr-2"
                    >
                        <Share2 size={24} color={isDark ? "#fff" : "#000"} />
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    className="flex-1"
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
                >
                    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                        {/* Header Card */}
                        <DigestHeader
                            title={digest.title}
                            date={digest.date}
                            period={digest.period}
                            summary={digest.summary}
                        />

                        {/* Reactions (Like/Dislike) */}
                        <DigestReactions
                            digestId={id!}
                            country={countryCode}
                        />

                        {/* Category Sections (TR digests) */}
                        {digest.sections && digest.sections.length > 0 && (
                            <DigestSectionList
                                sections={digest.sections}
                                className="mt-2 mb-4"
                            />
                        )}

                        {/* Social Media Highlights */}
                        {(digest as any).socialHighlights && (digest as any).socialHighlights.length > 0 && (
                            <SocialHighlights
                                tweets={(digest as any).socialHighlights}
                                className="mt-2 mb-4"
                            />
                        )}

                        {/* Top Topics */}
                        <DigestTopicList
                            topics={digest.topTopics}
                            onTopicPress={(articleId) => router.push({
                                pathname: '/article/[id]',
                                params: { id: articleId }
                            })}
                            className="mb-4"
                        />

                        {/* Comments */}
                        <CommentSection
                            comments={(digest as any).comments ?? []}
                            targetType="daily_digest"
                            targetId={id!}
                            country={countryCode}
                            onCommentAdded={() => queryClient.invalidateQueries({ queryKey: ['digest', id] })}
                        />

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
