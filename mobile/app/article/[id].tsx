import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, ActivityIndicator, TouchableOpacity, Share, Alert, useColorScheme, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Bookmark, Send, ChevronLeft, Sparkles, ExternalLink } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';

import { feedService } from '../../src/api/services/feedService';
import { useArticleReactionStatus, useToggleBookmark } from '../../src/hooks/useInteraction';
import { useAuthStore } from '../../src/store/useAuthStore';
import { MOCK_ARTICLE } from '../../src/data/mock';

// Components
import { ArticleWebView } from '../../src/components/article/ArticleWebView';
import { AISummaryModal, AISummaryData } from '../../src/components/article/AISummaryModal';

export default function ArticleDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuthStore();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    // State
    const [showAISummary, setShowAISummary] = useState(false);

    // DEMO MODE CHECK
    const isDemo = id === 'demo' || id === 'test';

    // Queries
    const { data: article, isLoading } = useQuery({
        queryKey: ['article', id],
        queryFn: async () => {
            if (isDemo) return MOCK_ARTICLE;
            return feedService.getArticle('tr', id!);
        },
        enabled: !!id,
    });

    const { data: reactionStatus } = useArticleReactionStatus('tr', id!);
    const toggleBookmarkMutation = useToggleBookmark();

    // AI Summary mutation
    const summarizeMutation = useMutation({
        mutationFn: async () => {
            if (isDemo) {
                // Simulate API delay for demo
                await new Promise(resolve => setTimeout(resolve, 1000));
                return {
                    articleId: id!,
                    title: MOCK_ARTICLE.translatedTitle,
                    summary: MOCK_ARTICLE.detailContent || MOCK_ARTICLE.summary,
                    keyPoints: [
                        "Ana gelişme ekonomi ile ilgili",
                        "Sosyal etkiler değerlendiriliyor",
                        "Uzmanlar farklı görüşler sunuyor"
                    ],
                    context: "Bu haber, gündemdeki önemli gelişmelerden birini ele alıyor.",
                    analysis: {
                        politicalTone: MOCK_ARTICLE.politicalTone || 0,
                        politicalConfidence: MOCK_ARTICLE.politicalConfidence || 0.5,
                        governmentMentioned: MOCK_ARTICLE.governmentMentioned || false,
                        emotionalTone: MOCK_ARTICLE.emotionalTone || { anger: 0, fear: 0, joy: 0.5, sadness: 0, surprise: 0 },
                        emotionalIntensity: MOCK_ARTICLE.emotionalIntensity || 0.5,
                        dominantEmotion: 'joy',
                        dominantEmotionLabel: 'Neşe',
                        intensityLabel: 'Orta',
                        loadedLanguageScore: 0.3,
                        sensationalismScore: 0.2,
                        sensationalismLabel: 'Düşük'
                    }
                } as AISummaryData;
            }
            return feedService.summarizeArticle('tr', id!);
        },
        onSuccess: () => {
            setShowAISummary(true);
        },
        onError: (error) => {
            Alert.alert('Hata', 'AI özeti oluşturulamadı. Lütfen tekrar deneyin.');
        }
    });

    const handleOpenAISummary = () => {
        if (summarizeMutation.data) {
            setShowAISummary(true);
        } else {
            summarizeMutation.mutate();
        }
    };

    const handleOpenExternal = async () => {
        if (!article?.sources?.[0]?.sourceUrl) return;
        try {
            await WebBrowser.openBrowserAsync(article.sources[0].sourceUrl);
        } catch {
            Alert.alert('Hata', 'Kaynak açılamadı.');
        }
    };

    const handleShare = async () => {
        if (!article) return;
        const sourceUrl = article.sources?.[0]?.sourceUrl || '';
        try {
            await Share.share({
                message: `${article.translatedTitle}\n\n${sourceUrl}\n\nD4ily uygulamasında oku.`,
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
    const sourceUrl = primarySource?.sourceUrl;

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

                    {/* Source Info */}
                    <View className="flex-row items-center gap-2 flex-1 mx-4">
                        {sourceLogo ? (
                            <Image
                                source={{ uri: sourceLogo }}
                                style={{ width: 20, height: 20, borderRadius: 4 }}
                                contentFit="contain"
                            />
                        ) : null}
                        <Text
                            className="text-[14px] font-semibold text-zinc-700 dark:text-zinc-300"
                            numberOfLines={1}
                        >
                            {sourceName}
                        </Text>
                    </View>

                    <View className="flex-row items-center gap-1">
                        <TouchableOpacity
                            onPress={handleOpenExternal}
                            className="p-2"
                        >
                            <ExternalLink size={22} color={isDark ? "#fff" : "#000"} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleBookmark}
                            className="p-2 -mr-2"
                        >
                            <Bookmark
                                size={22}
                                color={isDark ? "#fff" : "#000"}
                                fill={reactionStatus?.isBookmarked ? (isDark ? "#fff" : "#000") : "none"}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>

            {/* WebView Content */}
            <View className="flex-1">
                {sourceUrl ? (
                    <ArticleWebView url={sourceUrl} />
                ) : (
                    <View className="flex-1 items-center justify-center px-6">
                        <Text className="text-zinc-500 dark:text-zinc-400 text-center">
                            Kaynak URL bulunamadı
                        </Text>
                    </View>
                )}
            </View>

            {/* Bottom Action Bar */}
            <SafeAreaView edges={['bottom']} className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
                <View className="flex-row items-center justify-between px-4 py-3 gap-3">
                    {/* AI Summary Button */}
                    <TouchableOpacity
                        onPress={handleOpenAISummary}
                        disabled={summarizeMutation.isPending}
                        className="flex-1 bg-[#006FFF] h-12 rounded-xl flex-row items-center justify-center gap-2"
                        style={{ opacity: summarizeMutation.isPending ? 0.7 : 1 }}
                    >
                        {summarizeMutation.isPending ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <Sparkles size={20} color="white" />
                        )}
                        <Text className="text-white font-bold text-[15px]">
                            {summarizeMutation.isPending ? 'Özetleniyor...' : 'AI ile Özetle'}
                        </Text>
                    </TouchableOpacity>

                    {/* Share Button */}
                    <TouchableOpacity
                        onPress={handleShare}
                        className="bg-zinc-100 dark:bg-zinc-800 h-12 px-5 rounded-xl flex-row items-center justify-center gap-2"
                    >
                        <Send size={18} color={isDark ? "#fff" : "#000"} />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* AI Summary Modal */}
            <AISummaryModal
                visible={showAISummary}
                onClose={() => setShowAISummary(false)}
                data={summarizeMutation.data || null}
                isLoading={summarizeMutation.isPending}
                error={summarizeMutation.error?.message || null}
            />
        </View>
    );
}
