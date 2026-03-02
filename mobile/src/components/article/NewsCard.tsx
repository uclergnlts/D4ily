import React from 'react';
import { View, Text, Linking } from 'react-native';
import { Image } from 'expo-image';
import { MotiPressable } from 'moti/interactions';
import * as Haptics from 'expo-haptics';
import { ExternalLink } from 'lucide-react-native';
import { TimeAgo } from '../ui/TimeAgo';
import type { Article } from '../../types';

interface NewsCardProps {
    article: Article;
}

export const NewsCard = React.memo(function NewsCard({ article }: NewsCardProps) {
    const primarySource = article.sources?.find(s => s.isPrimary) || article.sources?.[0];
    const sourceName = primarySource?.sourceName || article.source || 'Kaynak';
    const sourceUrl = primarySource?.sourceUrl;

    const SOURCE_LOGOS: Record<string, string> = {
        'Habertürk': 'https://upload.wikimedia.org/wikipedia/commons/2/20/Habert%C3%BCrk_TV_logo.png',
        'NTV': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/NTV_Turkey_logo_2016.svg/1200px-NTV_Turkey_logo_2016.svg.png',
        'Sözcü': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/S%C3%B6zc%C3%BC_Gazetesi_logo.jpg/800px-S%C3%B6zc%C3%BC_Gazetesi_logo.jpg',
        'Sabah': 'https://upload.wikimedia.org/wikipedia/en/thumb/0/07/Sabah_logo.png/250px-Sabah_logo.png',
        'Cumhuriyet': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Cumhuriyet_logo.svg/2560px-Cumhuriyet_logo.svg.png',
        'CNN': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/CNN_International_logo.svg/1200px-CNN_International_logo.svg.png',
        'BBC': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/BBC_News_2022_%28Alt%29.svg/1200px-BBC_News_2022_%28Alt%29.svg.png',
    };

    const finalLogo = primarySource?.sourceLogoUrl || SOURCE_LOGOS[sourceName] || `https://ui-avatars.com/api/?name=${sourceName.substring(0, 2)}&background=random&color=fff&size=64`;

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (sourceUrl) {
            Linking.openURL(sourceUrl);
        }
    };

    return (
        <MotiPressable
            onPress={handlePress}
            animate={React.useMemo(() => ({ pressed }: { pressed: boolean }) => {
                'worklet';
                return {
                    scale: pressed ? 0.97 : 1,
                    opacity: pressed ? 0.85 : 1,
                };
            }, [])}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            {...({ className: "bg-white dark:bg-zinc-900 mx-4 mb-3 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800" } as any)}
        >
            <View className="flex-row gap-3">
                <View className="flex-1">
                    <Text className="text-body-lg font-sans-bold text-zinc-900 dark:text-zinc-50 leading-[22px]" numberOfLines={3}>
                        {article.translatedTitle}
                    </Text>

                    {/* Source + Time */}
                    <View className="flex-row items-center gap-2 mt-3">
                        <Image
                            source={{ uri: finalLogo }}
                            style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: '#f4f4f5' }}
                            contentFit="cover"
                        />
                        <Text className="text-[11px] font-sans-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-widest">
                            {sourceName}
                        </Text>
                        <Text className="text-[10px] text-zinc-300 dark:text-zinc-600">•</Text>
                        <TimeAgo date={article.publishedAt} />
                        <View className="flex-1" />
                        <ExternalLink size={14} color="#a1a1aa" />
                    </View>
                </View>

                {article.imageUrl ? (
                    <Image
                        source={{ uri: article.imageUrl }}
                        style={{ width: 80, height: 80, borderRadius: 16 }}
                        contentFit="cover"
                        transition={300}
                    />
                ) : null}
            </View>
        </MotiPressable>
    );
});

NewsCard.displayName = 'NewsCard';
