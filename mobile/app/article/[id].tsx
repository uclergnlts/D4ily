import React, { useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Share, Linking, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Share2, ExternalLink, Clock, Eye, BarChart3 } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { safeBack } from '../../src/utils/navigation';
import { feedService } from '../../src/api/services/feedService';
import { PerspectivesSection } from '../../src/components/article/PerspectivesSection';
import { useThemeStore } from '../../src/store/useThemeStore';
import type { Article } from '../../src/types';

function getSentimentInfo(sentiment: string | null) {
    switch (sentiment) {
        case 'positive': return { label: 'Olumlu', color: '#10B981', bg: 'bg-emerald-50 dark:bg-emerald-900/20' };
        case 'negative': return { label: 'Olumsuz', color: '#EF4444', bg: 'bg-red-50 dark:bg-red-900/20' };
        default: return { label: 'Nötr', color: '#FBBF24', bg: 'bg-amber-50 dark:bg-amber-900/20' };
    }
}

function getEmotionLabel(tone: unknown): string | null {
    if (!tone) return null;
    const map: Record<string, string> = {
        fear: 'Korku', anger: 'Öfke', joy: 'Neşe', sadness: 'Üzüntü',
        surprise: 'Şaşkınlık', disgust: 'Tiksinti', trust: 'Güven', anticipation: 'Beklenti',
    };
    // If tone is an object like {anger: 0.2, fear: 0.8, ...}, find the dominant emotion
    if (typeof tone === 'object' && tone !== null) {
        const entries = Object.entries(tone as Record<string, number>);
        if (entries.length === 0) return null;
        const [dominantKey] = entries.reduce((max, entry) => entry[1] > max[1] ? entry : max);
        return map[dominantKey] || dominantKey;
    }
    // If tone is a simple string
    if (typeof tone === 'string') {
        return map[tone] || tone;
    }
    return null;
}

function TimeAgoText({ date }: { date: string }) {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    let text: string;
    if (diffMins < 1) text = 'Az önce';
    else if (diffMins < 60) text = `${diffMins} dk önce`;
    else if (diffHours < 24) text = `${diffHours} saat önce`;
    else if (diffDays < 7) text = `${diffDays} gün önce`;
    else text = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    return <Text className="text-body-xs text-zinc-400 font-sans-medium">{text}</Text>;
}

const PROFESSIONAL_SUMMARY_BLOCKLIST = [
    'yapay zeka',
    'ai',
    'openai',
    'model',
    'otomatik',
    'algoritma',
];

function normalizeText(value: string | null | undefined): string {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function toSentences(text: string): string[] {
    return normalizeText(text)
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(Boolean);
}

function isBlockedSentence(sentence: string): boolean {
    const lower = sentence.toLowerCase();
    return PROFESSIONAL_SUMMARY_BLOCKLIST.some(word => lower.includes(word));
}

function buildProfessionalSummary(article: Article | undefined): string {
    if (!article) return '';

    const fromSummary = toSentences(article.summary).filter(s => !isBlockedSentence(s));
    const fromDetail = toSentences(article.detailContent || '').filter(s => !isBlockedSentence(s));
    const pool = fromSummary.length > 0 ? fromSummary : fromDetail;

    if (pool.length === 0) {
        return normalizeText(article.summary);
    }

    const selected = pool.slice(0, 3);
    return normalizeText(selected.join(' '));
}

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
        staleTime: 1000 * 60 * 30,
        gcTime: 1000 * 60 * 60 * 4,
    });

    const { data: perspectives, isLoading: perspectivesLoading } = useQuery({
        queryKey: ['perspectives', countryCode, id],
        queryFn: () => feedService.getPerspectives(countryCode, id!),
        enabled: !!id,
        staleTime: 1000 * 60 * 15,
        gcTime: 1000 * 60 * 60 * 2,
    });

    const primarySource = article?.sources?.find((s: any) => s.isPrimary) || article?.sources?.[0];
    const sentimentInfo = article ? getSentimentInfo(article.sentiment) : null;
    const emotionLabel = article ? getEmotionLabel(article.emotionalTone) : null;
    const professionalSummary = buildProfessionalSummary(article);

    useEffect(() => {
        if (!id) return;
        feedService.recordArticleView(countryCode, id);
    }, [countryCode, id]);

    const openInAppBrowser = async (url?: string) => {
        if (!url) return;
        try {
            await WebBrowser.openBrowserAsync(url, {
                presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
                controlsColor: '#0A66C2',
            });
        } catch {
            Linking.openURL(url);
        }
    };

    const handleShare = async () => {
        if (!article) return;
        try {
            await Share.share({
                title: article.translatedTitle,
                message: `${article.translatedTitle}\n\n${professionalSummary || article.summary}`,
            });
        } catch { }
    };

    const handleOpenSource = () => {
        openInAppBrowser(primarySource?.sourceUrl);
    };

    return (
        <View className="flex-1 bg-surface-light dark:bg-surface-dark">
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Header */}
                <View className="flex-row items-center justify-between px-4 pt-3 pb-3 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
                    <TouchableOpacity
                        onPress={() => safeBack(router)}
                        className="w-11 h-11 items-center justify-center bg-surface-light-subtle dark:bg-surface-dark-subtle rounded-full active:scale-95"
                    >
                        <ChevronLeft size={24} color={isDark ? '#fff' : '#18181b'} />
                    </TouchableOpacity>
                    <Text
                        className="text-body-xl font-sans-bold text-zinc-900 dark:text-white flex-1 tracking-tight ml-3"
                        numberOfLines={1}
                    >
                        Haber Detayı
                    </Text>
                    <TouchableOpacity
                        onPress={handleShare}
                        className="w-11 h-11 items-center justify-center bg-surface-light-subtle dark:bg-surface-dark-subtle rounded-full active:scale-95"
                    >
                        <Share2 size={20} color={isDark ? '#fff' : '#18181b'} />
                    </TouchableOpacity>
                </View>

                <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
                    {articleLoading ? (
                        <View className="px-5">
                            {/* Skeleton Image */}
                            <View className="mb-5 rounded-3xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" style={{ height: 220 }} />
                            {/* Skeleton Card */}
                            <View className="bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-3xl p-6 border border-border-light dark:border-border-dark mb-5">
                                {/* Source row */}
                                <View className="flex-row items-center gap-3 mb-4">
                                    <View className="w-20 h-4 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
                                    <View className="w-16 h-4 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
                                </View>
                                {/* Title */}
                                <View className="w-full h-6 bg-zinc-100 dark:bg-zinc-800 rounded-lg mb-2" />
                                <View className="w-3/4 h-6 bg-zinc-100 dark:bg-zinc-800 rounded-lg mb-5" />
                                {/* Badges */}
                                <View className="flex-row gap-2 mb-5">
                                    <View className="w-16 h-6 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
                                    <View className="w-20 h-6 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
                                </View>
                                {/* Body */}
                                <View className="w-full h-4 bg-zinc-100 dark:bg-zinc-800 rounded mb-2" />
                                <View className="w-full h-4 bg-zinc-100 dark:bg-zinc-800 rounded mb-2" />
                                <View className="w-full h-4 bg-zinc-100 dark:bg-zinc-800 rounded mb-2" />
                                <View className="w-2/3 h-4 bg-zinc-100 dark:bg-zinc-800 rounded mb-2" />
                            </View>
                        </View>
                    ) : article ? (
                        <View className="px-5">
                            {/* Hero Image */}
                            {article.imageUrl && (
                                <View className="mb-5 rounded-3xl overflow-hidden border border-border-light dark:border-border-dark">
                                    <Image
                                        source={{ uri: article.imageUrl }}
                                        style={{ width: '100%', height: 220 }}
                                        contentFit="cover"
                                        transition={300}
                                        cachePolicy="disk"
                                    />
                                </View>
                            )}

                            {/* Main Article Card */}
                            <View className="bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-3xl p-6 border border-border-light dark:border-border-dark shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none mb-5">
                                {/* Source + Time Row */}
                                <View className="flex-row items-center gap-3 mb-4">
                                    {primarySource && (
                                        <View className="flex-row items-center gap-2">
                                            {primarySource.sourceLogoUrl && (
                                                <Image
                                                    source={{ uri: primarySource.sourceLogoUrl }}
                                                    style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: '#f4f4f5' }}
                                                    contentFit="cover"
                                                    cachePolicy="disk"
                                                />
                                            )}
                                            <Text className="text-body-xs font-sans-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-widest">
                                                {primarySource.sourceName}
                                            </Text>
                                        </View>
                                    )}
                                    {!primarySource && article.source && (
                                        <Text className="text-body-xs font-sans-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-widest">
                                            {article.source}
                                        </Text>
                                    )}
                                    <Text className="text-zinc-300 dark:text-zinc-600">·</Text>
                                    <View className="flex-row items-center gap-1">
                                        <Clock size={12} color="#a1a1aa" />
                                        <TimeAgoText date={article.publishedAt} />
                                    </View>
                                </View>

                                {/* Title */}
                                <Text
                                    className="text-display-xl font-sans-black text-zinc-900 dark:text-white mb-4 tracking-tight leading-[32px]"
                                    style={{ lineHeight: 32 }}
                                >
                                    {article.translatedTitle}
                                </Text>

                                {/* Badges Row */}
                                <View className="flex-row flex-wrap items-center gap-2 mb-5">
                                    {sentimentInfo && (
                                        <View className={`px-3 py-1.5 rounded-full ${sentimentInfo.bg}`}>
                                            <Text className="text-body-xs font-sans-bold uppercase tracking-widest" style={{ color: sentimentInfo.color }}>
                                                {sentimentInfo.label}
                                            </Text>
                                        </View>
                                    )}
                                    {emotionLabel && (
                                        <View className="px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-900/20">
                                            <Text className="text-body-xs font-sans-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">
                                                {emotionLabel}
                                            </Text>
                                        </View>
                                    )}
                                    {article.sourceCount > 1 && (
                                        <View className="px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20">
                                            <Text className="text-body-xs font-sans-bold text-blue-600 dark:text-blue-400 tracking-widest">
                                                {article.sourceCount} KAYNAK
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* Summary */}
                                <Text className="text-body-md font-sans-medium text-zinc-500 dark:text-zinc-400 mb-5 leading-[24px] italic">
                                    {professionalSummary || article.summary}
                                </Text>

                                {/* Detail Content */}
                                {article.detailContent && article.detailContent !== article.summary && (
                                    <Text className="text-body-md font-sans text-zinc-700 dark:text-zinc-300 leading-[26px]">
                                        {article.detailContent}
                                    </Text>
                                )}

                                {/* Stats Footer */}
                                <View className="flex-row items-center gap-4 pt-5 mt-5 border-t border-zinc-100 dark:border-zinc-800">
                                    <View className="flex-row items-center gap-1.5">
                                        <Eye size={14} color="#a1a1aa" />
                                        <Text className="text-body-xs font-sans-bold text-zinc-400">
                                            {article.viewCount || 0}
                                        </Text>
                                    </View>
                                    <Text className="text-body-xs text-zinc-400 font-sans-medium">
                                        {new Date(article.publishedAt).toLocaleDateString('tr-TR', {
                                            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                                        })}
                                    </Text>
                                </View>
                            </View>

                            {/* Source Link Button */}
                            {primarySource?.sourceUrl && (
                                <TouchableOpacity
                                    onPress={handleOpenSource}
                                    className="flex-row items-center justify-center gap-2 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-2xl p-4 mb-5 border border-border-light dark:border-border-dark active:scale-[0.98]"
                                >
                                    <ExternalLink size={18} color="#0A66C2" />
                                    <Text className="text-body-sm font-sans-bold text-primary">
                                        {(primarySource?.sourceName || article.source || 'Kaynak')} kaynaginda oku
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {/* Analysis Card */}
                            {(article.politicalTone !== undefined && article.politicalTone !== null) && (
                                <View className="bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-3xl p-5 border border-border-light dark:border-border-dark mb-5">
                                    <View className="flex-row items-center gap-2 mb-4">
                                        <BarChart3 size={18} color="#0A66C2" />
                                        <Text className="text-body-lg font-sans-bold text-zinc-900 dark:text-white tracking-tight">
                                            Analiz
                                        </Text>
                                    </View>

                                    <View className="gap-3">
                                        {/* Political Tone */}
                                        <View className="flex-row items-center justify-between">
                                            <Text className="text-body-sm text-zinc-500 font-sans-medium">Siyasi Ton</Text>
                                            <View className="flex-row items-center gap-2">
                                                <View className="w-24 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                    <View
                                                        className="h-full rounded-full"
                                                        style={{
                                                            width: `${((article.politicalTone! + 5) / 10) * 100}%`,
                                                            backgroundColor: article.politicalTone! > 1 ? '#FBBF24' : article.politicalTone! < -1 ? '#818CF8' : '#A1A1AA',
                                                        }}
                                                    />
                                                </View>
                                                <Text className="text-body-xs font-sans-bold text-zinc-500 w-8 text-right">
                                                    {article.politicalTone! > 0 ? '+' : ''}{article.politicalTone!.toFixed(1)}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Emotional Intensity */}
                                        {article.emotionalIntensity !== undefined && article.emotionalIntensity !== null && (
                                            <View className="flex-row items-center justify-between">
                                                <Text className="text-body-sm text-zinc-500 font-sans-medium">Duygusal Yoğunluk</Text>
                                                <View className="flex-row items-center gap-2">
                                                    <View className="w-24 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                        <View
                                                            className="h-full bg-orange-400 rounded-full"
                                                            style={{ width: `${(article.emotionalIntensity / 10) * 100}%` }}
                                                        />
                                                    </View>
                                                    <Text className="text-body-xs font-sans-bold text-zinc-500 w-8 text-right">
                                                        {article.emotionalIntensity.toFixed(1)}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}

                                        {/* Loaded Language */}
                                        {article.loadedLanguageScore !== undefined && article.loadedLanguageScore !== null && (
                                            <View className="flex-row items-center justify-between">
                                                <Text className="text-body-sm text-zinc-500 font-sans-medium">Yönlendirici Dil</Text>
                                                <View className="flex-row items-center gap-2">
                                                    <View className="w-24 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                        <View
                                                            className="h-full bg-red-400 rounded-full"
                                                            style={{ width: `${(article.loadedLanguageScore / 10) * 100}%` }}
                                                        />
                                                    </View>
                                                    <Text className="text-body-xs font-sans-bold text-zinc-500 w-8 text-right">
                                                        {article.loadedLanguageScore.toFixed(1)}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* All Sources */}
                            {article.sources && article.sources.length > 1 && (
                                <View className="bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-3xl p-5 border border-border-light dark:border-border-dark mb-5">
                                    <Text className="text-body-lg font-sans-bold text-zinc-900 dark:text-white mb-3 tracking-tight">
                                        Kaynaklar ({article.sources.length})
                                    </Text>
                                    <FlatList
                                        data={article.sources}
                                        keyExtractor={(source: any, index: number) => String(source.id || `${source.sourceName}-${index}`)}
                                        initialNumToRender={8}
                                        windowSize={5}
                                        removeClippedSubviews
                                        scrollEnabled={false}
                                        renderItem={({ item: source, index }) => (
                                            <TouchableOpacity
                                                onPress={() => openInAppBrowser(source.sourceUrl)}
                                                className={`flex-row items-center gap-3 py-3 ${index < article.sources!.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}
                                            >
                                                {source.sourceLogoUrl ? (
                                                    <Image
                                                        source={{ uri: source.sourceLogoUrl }}
                                                        style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: '#f4f4f5' }}
                                                        contentFit="cover"
                                                        cachePolicy="disk"
                                                    />
                                                ) : (
                                                    <View className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
                                                )}
                                                <Text className="text-body-sm font-sans-medium text-zinc-700 dark:text-zinc-300 flex-1">
                                                    {source.sourceName}
                                                </Text>
                                                {source.sourceUrl && (
                                                    <ExternalLink size={14} color="#a1a1aa" />
                                                )}
                                            </TouchableOpacity>
                                        )}
                                    />
                                </View>
                            )}
                        </View>
                    ) : (
                        <View className="px-5">
                            <View className="bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-3xl p-8 border border-border-light dark:border-border-dark items-center justify-center">
                                <Text className="text-zinc-500 font-sans text-body-md text-center">
                                    Haber bulunamadı.
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Perspectives */}
                    {perspectivesLoading ? (
                        <View className="items-center py-10">
                            <ActivityIndicator size="small" color="#0A66C2" />
                            <Text className="text-body-xs font-sans-medium text-zinc-400 mt-4 tracking-wide">
                                Farklı bakış açıları aranıyor...
                            </Text>
                        </View>
                    ) : perspectives?.relatedPerspectives && perspectives.relatedPerspectives.length > 0 ? (
                        <PerspectivesSection perspectives={perspectives.relatedPerspectives} countryCode={countryCode} />
                    ) : article ? (
                        <View className="px-5">
                            <View className="bg-surface-light-subtle dark:bg-surface-dark-subtle rounded-3xl p-6 items-center">
                                <Text className="text-body-sm font-sans text-zinc-500 text-center">
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
