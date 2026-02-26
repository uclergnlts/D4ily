import React, { useEffect, useMemo } from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { Article } from '../../types';
import { useRouter } from 'expo-router';
import { MotiPressable } from 'moti/interactions';
import * as Haptics from 'expo-haptics';
import { safePush } from '../../utils/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { feedService } from '../../api/services/feedService';
import { useAppStore } from '../../store/useAppStore';

import { TimeAgo } from '../ui/TimeAgo';
import { Eye, MessageCircle, Bookmark, Share2 } from 'lucide-react-native';

interface ArticleCardProps {
    article: Article;
}

export const ArticleCard = React.memo(function ArticleCard({ article }: ArticleCardProps) {
    const primarySource = article.sources?.find(s => s.isPrimary) || article.sources?.[0];
    const sourceName = primarySource?.sourceName || article.source || 'Kaynak';
    const router = useRouter();
    const queryClient = useQueryClient();
    const selectedCountry = useAppStore(s => s.selectedCountry);

    // Prefetch article detail when the card renders — instant open on tap
    useEffect(() => {
        queryClient.prefetchQuery({
            queryKey: ['article', selectedCountry, article.id],
            queryFn: () => feedService.getArticle(selectedCountry, article.id),
            staleTime: 1000 * 60 * 30, // 30 min
        });
    }, [article.id, selectedCountry]);

    // Fallback Logo Map
    const SOURCE_LOGOS: Record<string, string> = {
        'Habertürk': 'https://upload.wikimedia.org/wikipedia/commons/2/20/Habert%C3%BCrk_TV_logo.png',
        'NTV': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/NTV_Turkey_logo_2016.svg/1200px-NTV_Turkey_logo_2016.svg.png',
        'Sözcü': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/S%C3%B6zc%C3%BC_Gazetesi_logo.jpg/800px-S%C3%B6zc%C3%BC_Gazetesi_logo.jpg',
        'Sabah': 'https://upload.wikimedia.org/wikipedia/en/thumb/0/07/Sabah_logo.png/250px-Sabah_logo.png',
        'Cumhuriyet': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Cumhuriyet_logo.svg/2560px-Cumhuriyet_logo.svg.png',
        'CNN': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/CNN_International_logo.svg/1200px-CNN_International_logo.svg.png',
        'BBC': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/BBC_News_2022_%28Alt%29.svg/1200px-BBC_News_2022_%28Alt%29.svg.png'
    };

    const finalLogo = primarySource?.sourceLogoUrl || SOURCE_LOGOS[sourceName] || `https://ui-avatars.com/api/?name=${sourceName.substring(0, 2)}&background=random&color=fff&size=64`;

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        safePush(router, `/article/${article.id}` as any);
    };

    return (
        <MotiPressable
            onPress={handlePress}
            animate={useMemo(() => ({ hovered, pressed }) => {
                'worklet';
                return {
                    scale: pressed ? 0.96 : 1,
                    opacity: pressed ? 0.85 : 1,
                };
            }, [])}
            transition={{
                type: 'spring',
                stiffness: 400,
                damping: 25,
            }}
            {...({ className: "bg-surface-light-elevated dark:bg-surface-dark-elevated mx-4 mb-4 p-4 rounded-3xl shadow-sm shadow-zinc-200/50 dark:shadow-none border border-border-light dark:border-border-dark" } as any)}
        >
            <View className="flex-row gap-4">
                <View className="flex-1">
                    <Text className="text-body-lg font-sans-bold text-zinc-900 dark:text-zinc-50 mb-2 leading-[22px]">
                        {article.translatedTitle}
                    </Text>
                    <Text
                        numberOfLines={3}
                        className="text-body-sm text-zinc-500 dark:text-zinc-400 font-sans leading-[18px]"
                    >
                        {article.summary || "Haber detayı için tıklayınız..."}
                    </Text>

                    {/* Source Branding */}
                    <View className="flex-row items-center gap-2 mt-4">
                        <Image
                            source={{ uri: finalLogo }}
                            style={{ width: 18, height: 18, borderRadius: 6, backgroundColor: '#f4f4f5' }}
                            contentFit="cover"
                        />
                        <Text className="text-[11px] font-sans-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-widest">
                            {sourceName}
                        </Text>
                        <Text className="text-[10px] text-zinc-300 dark:text-zinc-600">
                            •
                        </Text>
                        <Text className="text-[11px] text-zinc-400 font-sans-medium tracking-wide">
                            <TimeAgo date={article.publishedAt} />
                        </Text>
                    </View>
                </View>

                {/* Thumbnail Image */}
                {article.imageUrl ? (
                    <Image
                        source={{ uri: article.imageUrl }}
                        style={{ width: 100, height: 100, borderRadius: 20 }}
                        contentFit="cover"
                        transition={300}
                    />
                ) : null}
            </View>

            {/* Engagement Metrics */}
            <View className="flex-row items-center gap-4 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
                <View className="flex-row items-center gap-1.5 bg-surface-light-subtle dark:bg-surface-dark-subtle px-3 py-1.5 rounded-full">
                    <Eye size={14} color="#a1a1aa" />
                    <Text className="text-body-xs font-sans-bold text-zinc-500 dark:text-zinc-400">{article.viewCount || Math.floor(Math.random() * 500) + 100}</Text>
                </View>
                <View className="flex-row items-center gap-1.5 bg-surface-light-subtle dark:bg-surface-dark-subtle px-3 py-1.5 rounded-full">
                    <MessageCircle size={14} color="#a1a1aa" />
                    <Text className="text-body-xs font-sans-bold text-zinc-500 dark:text-zinc-400">{article.commentCount || Math.floor(Math.random() * 20)}</Text>
                </View>
                <View className="flex-1" />
                <MotiPressable
                    onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                    {...({ className: "p-1.5" } as any)}
                >
                    <Bookmark size={20} color="#a1a1aa" />
                </MotiPressable>
                <MotiPressable
                    onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                    {...({ className: "p-1.5" } as any)}
                >
                    <Share2 size={20} color="#a1a1aa" />
                </MotiPressable>
            </View>
        </MotiPressable>
    );
});

ArticleCard.displayName = 'ArticleCard';

