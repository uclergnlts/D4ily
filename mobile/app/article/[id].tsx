import React, { useState } from 'react';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Share, KeyboardAvoidingView, Platform, TextInput, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Share2, Bookmark, MessageSquare, Send, Globe, ChevronLeft } from 'lucide-react-native';
import { Image } from 'expo-image';
import { TimeAgo } from '../../src/components/ui/TimeAgo';
import * as WebBrowser from 'expo-web-browser';

import { feedService } from '../../src/api/services/feedService';
import { usePerspectives } from '../../src/hooks/usePerspectives';
import { useComments, usePostComment, useArticleReactionStatus, useToggleBookmark } from '../../src/hooks/useInteraction';
import { useAuthStore } from '../../src/store/useAuthStore';

// Phase 2 Components
// Phase 2 Components
import { PoliticalToneGauge } from '../../src/components/article/PoliticalToneGauge';
import { EmotionalAnalysisCard } from '../../src/components/article/EmotionalAnalysisCard';
import { PerspectivesSection } from '../../src/components/article/PerspectivesSection';
import { ContentQualityBadges } from '../../src/components/article/ContentQualityBadges';
import { CommentThread } from '../../src/components/interaction/CommentThread';
import { CommentForm } from '../../src/components/interaction/CommentForm';
import { AlignmentVotingWidget } from '../../src/components/interaction/AlignmentVotingWidget';

import { useColorScheme } from 'react-native';

export default function ArticleDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuthStore();
    const [commentText, setCommentText] = useState('');
    const [userVote, setUserVote] = useState<number | null>(null);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    // DEMO MODE CHECK
    const isDemo = id === 'demo' || id === 'test';

    // Queries
    const { data: article, isLoading } = useQuery({
        queryKey: ['article', id],
        queryFn: async () => {
            if (isDemo) return require('../../src/data/mock').MOCK_ARTICLE;
            return feedService.getArticle('tr', id!);
        },
        enabled: !!id,
    });

    // Perspectives
    const { data: perspectivesData } = usePerspectives('tr', id!, true);
    const demoPerspectives = isDemo ? require('../../src/data/mock').MOCK_PERSPECTIVES : null;
    const finalPerspectives = isDemo ? demoPerspectives : perspectivesData;

    // Comments
    const { data: comments } = useComments('tr', id!);
    const finalComments = comments;

    const { data: reactionStatus } = useArticleReactionStatus('tr', id!);
    const toggleBookmarkMutation = useToggleBookmark();

    const handleOpenSource = async () => {
        if (!article?.sources?.[0]?.sourceUrl) return;
        try {
            await WebBrowser.openBrowserAsync(article.sources[0].sourceUrl);
        } catch (e) {
            Alert.alert('Hata', 'Kaynak açılamadı.');
        }
    };

    const handleShare = async () => {
        if (!article) return;
        try {
            await Share.share({
                message: `${article.translatedTitle}\n\n${article.summary}\n\nD4ily uygulamasında oku.`,
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleBookmark = () => {
        if (!user && !isDemo) return router.push('/auth');
        if (isDemo) { Alert.alert('Demo', 'Mock bookmark toggled'); return; }
        toggleBookmarkMutation.mutate({ country: 'tr', articleId: id! });
    };

    if (isLoading || !article) {
        return (
            <View className="flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
                <ActivityIndicator color="#006FFF" size="large" />
            </View>
        );
    }

    const primarySource = article.sources?.[0];
    const sourceName = primarySource?.sourceName || 'Kaynak';
    const sourceLogo = primarySource?.sourceLogoUrl;

    return (
        <View className="flex-1 bg-zinc-50 dark:bg-black">
            {/* Header */}
            <SafeAreaView edges={['top']} className="bg-zinc-50 dark:bg-black z-10">
                <View className="flex-row items-center justify-between px-4 py-2 border-b border-zinc-100 dark:border-zinc-800">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="p-2 -ml-2"
                    >
                        <ChevronLeft size={28} color={isDark ? "#fff" : "#000"} />
                    </TouchableOpacity>

                    <Text className="text-[20px] font-black text-[#006FFF] tracking-tighter">
                        D4ily
                    </Text>

                    <TouchableOpacity
                        onPress={handleBookmark}
                        className="p-2 -mr-2"
                    >
                        <Bookmark
                            size={24}
                            color={isDark ? "#fff" : "#000"}
                            fill={reactionStatus?.isBookmarked ? (isDark ? "#fff" : "#000") : "none"}
                        />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Content Container */}
                <View className="px-5 pt-6 bg-zinc-50 dark:bg-black">

                    {/* Source & Date */}
                    <View className="flex-row items-center justify-between mb-4">
                        <View className="flex-row items-center gap-2">
                            {sourceLogo ? (
                                <Image
                                    source={{ uri: sourceLogo }}
                                    style={{ width: 20, height: 20, borderRadius: 4 }}
                                    contentFit="contain"
                                />
                            ) : null}
                            <Text className="text-[14px] font-bold text-zinc-900 dark:text-white">
                                {sourceName}
                            </Text>
                        </View>
                        <TimeAgo date={article.publishedAt} className="text-[13px] text-zinc-500 font-medium" />
                    </View>

                    {/* Title */}
                    <Text className="text-[22px] leading-[30px] font-bold text-zinc-900 dark:text-white mb-4 text-left">
                        {article.translatedTitle}
                    </Text>

                    {/* Summary (Simulated content body) */}
                    {/* Summary (Simulated content body) */}
                    <Text className="text-[18px] leading-[28px] text-zinc-700 dark:text-zinc-300 font-normal mb-8 text-left tracking-wide">
                        {article.summary}
                    </Text>

                    {/* Primary Actions */}
                    <View className="flex-row gap-3 mb-10">
                        <TouchableOpacity
                            onPress={handleOpenSource}
                            className="flex-1 bg-[#006FFF] h-12 rounded-lg flex-row items-center justify-center gap-2"
                        >
                            <Text className="text-white font-bold text-[15px]">Kaynağa Git</Text>
                            <Globe size={18} color="white" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleShare}
                            className="flex-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 h-12 rounded-lg flex-row items-center justify-center gap-2"
                        >
                            <Send size={18} color="#006FFF" />
                            <Text className="text-[#006FFF] font-bold text-[15px]">Paylaş</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Benzer İçerikler (Similar Content) */}
                    {finalPerspectives?.relatedPerspectives && finalPerspectives.relatedPerspectives.length > 0 && (
                        <View className="mb-8">
                            <Text className="text-[17px] font-bold text-zinc-900 dark:text-white mb-4">Benzer İçerikler</Text>
                            <PerspectivesSection perspectives={finalPerspectives.relatedPerspectives} />
                        </View>
                    )}

                    {/* Yorumlar */}
                    <View className="mb-8">
                        <Text className="text-[17px] font-bold text-zinc-900 dark:text-white mb-4">Yorumlar</Text>
                        {/* Comments List Placeholder or Component */}
                        <View className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                            {finalComments && finalComments.length > 0 ? (
                                finalComments.map((comment: any) => (
                                    <CommentThread
                                        key={comment.id}
                                        comment={comment}
                                    />
                                ))
                            ) : (
                                <Text className="text-zinc-500 text-center py-4">Henüz yorum yapılmamış.</Text>
                            )}
                        </View>
                    </View>

                    {/* Siyasi Analiz */}
                    <View className="mb-8">
                        <Text className="text-[17px] font-bold text-zinc-900 dark:text-white mb-4">Siyasi Analiz</Text>
                        {article.politicalTone !== undefined && (
                            <PoliticalToneGauge
                                politicalTone={article.politicalTone}
                                politicalConfidence={article.politicalConfidence || 0.7}
                                governmentMentioned={article.governmentMentioned}
                            />
                        )}
                    </View>

                    {/* Duygu Analizi */}
                    <View className="mb-8">
                        <Text className="text-[17px] font-bold text-zinc-900 dark:text-white mb-4">Duygu Analizi</Text>
                        <EmotionalAnalysisCard
                            emotionalTone={article.emotionalTone || { joy: 0, anger: 0, sadness: 0, fear: 0, surprise: 0 }}
                            emotionalIntensity={article.emotionalIntensity || 0.5}
                        />
                    </View>

                </View>
            </ScrollView>
        </View>
    );
}
