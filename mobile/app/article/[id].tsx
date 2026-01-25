import React, { useState } from 'react';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Share, KeyboardAvoidingView, Platform, TextInput, Alert, Linking } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Share2, Bookmark, MessageSquare, Send, Globe } from 'lucide-react-native';
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

    const { data: analysis } = useQuery({
        queryKey: ['analysis', id],
        queryFn: async () => {
            if (isDemo) return require('../../src/data/mock').MOCK_ARTICLE; // Analysis embedded in mock article
            return feedService.getAnalysis('tr', id!);
        },
        enabled: !!article,
    });

    // Perspectives
    const { data: perspectivesData } = usePerspectives('tr', id!, true);
    const demoPerspectives = isDemo ? require('../../src/data/mock').MOCK_PERSPECTIVES : null;
    const finalPerspectives = isDemo ? demoPerspectives : perspectivesData;

    // Comments & Interaction
    const { data: comments } = useComments('tr', id!);
    const demoComments = isDemo ? require('../../src/data/mock').MOCK_COMMENTS : null;
    const finalComments = isDemo ? demoComments : comments;

    const { data: reactionStatus } = useArticleReactionStatus('tr', id!);

    const postCommentMutation = usePostComment();
    const toggleBookmarkMutation = useToggleBookmark();

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

    const handleOpenSource = async () => {
        if (!article?.sources?.[0]?.sourceUrl) return;
        try {
            await WebBrowser.openBrowserAsync(article.sources[0].sourceUrl);
        } catch (e) {
            Alert.alert('Hata', 'Kaynak açılamadı.');
        }
    };

    const handleBookmark = () => {
        if (!user && !isDemo) return router.push('/auth');
        if (isDemo) { Alert.alert('Demo', 'Mock bookmark toggled'); return; }
        toggleBookmarkMutation.mutate({ country: 'tr', articleId: id! });
    };

    const handlePostComment = () => {
        if (!user && !isDemo) return router.push('/auth');
        if (!commentText.trim()) return;

        if (isDemo) {
            Alert.alert('Demo', 'Yorum gönderildi (Mock)');
            setCommentText('');
            return;
        }

        postCommentMutation.mutate({
            country: 'tr',
            articleId: id!,
            content: commentText
        }, {
            onSuccess: () => setCommentText('')
        });
    };

    // Helper to calculate alignment text color
    const getAlignmentColor = (score: number = 0) => {
        if (score > 2) return 'text-blue-600';
        if (score < -2) return 'text-red-600';
        return 'text-amber-600';
    };

    const getAlignmentBg = (score: number = 0) => {
        if (score > 2) return 'bg-blue-50';
        if (score < -2) return 'bg-red-50';
        return 'bg-amber-50';
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
    const alignmentScore = primarySource?.govAlignmentScore || 0;
    const alignmentLabel = primarySource?.govAlignmentLabel || 'Tarafsız';

    return (
        <View className="flex-1 bg-white dark:bg-zinc-900">
            <Stack.Screen
                options={{
                    headerTitle: '',
                    headerTransparent: true,
                    headerShadowVisible: false,
                    headerLeft: () => (
                        <TouchableOpacity
                            onPress={() => router.back()}
                            className="w-10 h-10 bg-white/20 dark:bg-black/30 backdrop-blur-md rounded-full items-center justify-center ml-1"
                        >
                            <ChevronLeft size={24} color="#fff" />
                        </TouchableOpacity>
                    ),
                    headerRight: () => (
                        <View className="flex-row gap-3 mr-1">
                            <TouchableOpacity
                                onPress={handleBookmark}
                                className="w-10 h-10 bg-white/20 dark:bg-black/30 backdrop-blur-md rounded-full items-center justify-center"
                            >
                                <Bookmark
                                    size={20}
                                    color="#fff"
                                    fill={reactionStatus?.isBookmarked ? "#fff" : "none"}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleShare}
                                className="w-10 h-10 bg-white/20 dark:bg-black/30 backdrop-blur-md rounded-full items-center justify-center"
                            >
                                <Share2 size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    )
                }}
            />

            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
                {/* 1. Hero Image */}
                <Image
                    source={{ uri: article.imageUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=2070&auto=format&fit=crop' }}
                    style={{ width: '100%', height: 260 }}
                    contentFit="cover"
                />

                <View className="px-5 pt-4">
                    {/* 2. Source Row */}
                    <View className="flex-row items-center justify-between mb-4">
                        <View className="flex-row items-center gap-3">
                            {sourceLogo ? (
                                <Image
                                    source={{ uri: sourceLogo }}
                                    style={{ width: 36, height: 36, borderRadius: 18 }} // Circle logo
                                    contentFit="contain"
                                />
                            ) : (
                                <View className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center">
                                    <Text className="text-xs font-bold text-zinc-500">{sourceName.charAt(0)}</Text>
                                </View>
                            )}
                            <View>
                                <Text className="text-[15px] font-bold text-zinc-900 dark:text-white leading-tight">
                                    {sourceName}
                                </Text>
                                <TimeAgo date={article.publishedAt} className="text-[12px] text-zinc-500 dark:text-zinc-400 font-medium" />
                            </View>
                        </View>

                        {/* Political Status */}
                        <Text className={`text-[12px] font-bold ${getAlignmentColor(alignmentScore)}`}>
                            {alignmentLabel} {alignmentScore > 0 ? `+${alignmentScore}` : alignmentScore}
                        </Text>
                    </View>

                    {/* 3. Title */}
                    <Text className="text-[26px] leading-[34px] font-black text-zinc-900 dark:text-white font-['System'] tracking-tight mb-5">
                        {article.translatedTitle}
                    </Text>

                    {/* 4. Content Content */}
                    <Text className="text-[18px] text-zinc-600 dark:text-zinc-300 leading-[30px] font-normal mb-8">
                        {article.summary}
                    </Text>
                </View>

                {/* 5. Different Perspectives */}
                {finalPerspectives?.relatedPerspectives && finalPerspectives.relatedPerspectives.length > 0 && (
                    <View className="mb-8">
                        <View className="px-5 mb-3 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                            <Text className="text-lg font-bold text-zinc-900 dark:text-white">Diğer Kaynaklar</Text>
                        </View>
                        <PerspectivesSection perspectives={finalPerspectives.relatedPerspectives} />
                    </View>
                )}

                {/* 6. Comments Section */}
                <View className="mb-8">
                    <View className="px-5 mb-3 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                        <Text className="text-lg font-bold text-zinc-900 dark:text-white">Yorumlar ({finalComments?.length || 0})</Text>
                    </View>
                    <View className="px-5">
                        {finalComments && finalComments.length > 0 ? (
                            finalComments.map((comment: any) => (
                                <CommentThread
                                    key={comment.id}
                                    comment={comment}
                                />
                            ))
                        ) : (
                            <View className="py-4 items-center">
                                <Text className="text-zinc-400 italic">Henüz yorum yok.</Text>
                            </View>
                        )}
                        <View className="mt-4">
                            <CommentForm
                                onSubmit={(text) => handlePostComment()}
                                placeholder={user || isDemo ? "Yorumunu yaz..." : "Giriş yapmalısın"}
                            />
                        </View>
                    </View>
                </View>

                {/* 7. Political Analysis */}
                {article.politicalTone !== undefined && (
                    <View className="mb-8 px-5">
                        <View className="mb-3 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                            <Text className="text-lg font-bold text-zinc-900 dark:text-white">Siyasi Ton Analizi</Text>
                        </View>
                        <PoliticalToneGauge
                            politicalTone={article.politicalTone}
                            politicalConfidence={article.politicalConfidence || 0.7}
                            governmentMentioned={article.governmentMentioned}
                        />
                        <AlignmentVotingWidget
                            currentScore={article.politicalTone}
                            userVote={userVote}
                            onVote={(score) => {
                                setUserVote(score);
                                if (isDemo) Alert.alert('Demo', `Tebrikler! ${score} puanını verdin.`);
                                else Alert.alert('Oylama', 'Oyunuz kaydedildi (Simülasyon).');
                            }}
                            className="mt-6"
                        />
                    </View>
                )}

                {/* 8. Emotional Analysis */}
                <View className="mb-8 px-5">
                    <View className="mb-3 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                        <Text className="text-lg font-bold text-zinc-900 dark:text-white">Duygu Analizi</Text>
                    </View>
                    <EmotionalAnalysisCard
                        emotionalTone={article.emotionalTone}
                        emotionalIntensity={article.emotionalIntensity}
                    />
                </View>

            </ScrollView>

            {/* Sticky Bottom Button */}
            <View className="absolute bottom-0 left-0 right-0 p-5 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 safe-bottom">
                <TouchableOpacity
                    onPress={handleOpenSource}
                    className="w-full bg-[#006FFF] py-4 rounded-xl items-center justify-center active:opacity-90 flex-row gap-2 shadow-sm"
                    style={{
                        shadowColor: "#006FFF",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.2,
                        shadowRadius: 8,
                        elevation: 4
                    }}
                >
                    <Text className="text-white font-bold text-[16px]">Kaynağa Git</Text>
                    <Globe size={18} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );
}
