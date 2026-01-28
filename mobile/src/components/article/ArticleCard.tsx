import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Article } from '../../types';
import { Link } from 'expo-router';

import { TimeAgo } from '../ui/TimeAgo';
import { Eye, MessageCircle, Bookmark, Share2 } from 'lucide-react-native';

interface ArticleCardProps {
    article: Article;
}

export const ArticleCard = React.memo(function ArticleCard({ article }: ArticleCardProps) {
    const primarySource = article.sources?.find(s => s.isPrimary) || article.sources?.[0];
    const sourceName = primarySource?.sourceName || article.source || 'Kaynak';

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

    return (
        <Link href={`/article/${article.id}`} asChild>
            <TouchableOpacity className="bg-white dark:bg-zinc-900 mx-4 mb-4 p-4 rounded-[24px] shadow-sm shadow-zinc-200/50 dark:shadow-none border border-zinc-100 dark:border-zinc-800 active:scale-[0.98] transition-transform">
                {/* Header/Badge Area if needed, or just spacers */}

                <View className="flex-row gap-4">
                    <View className="flex-1">
                        <Text className="text-[16px] font-bold text-zinc-900 dark:text-white leading-[22px] mb-2 tracking-tight">
                            {article.translatedTitle}
                        </Text>
                        <Text
                            numberOfLines={3}
                            className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-[19px] font-medium"
                        >
                            {article.summary || "Haber detayı için tıklayınız..."}
                        </Text>

                        {/* Source Branding at Bottom of Content */}
                        <View className="flex-row items-center gap-2 mt-3.5">
                            <Image
                                source={{ uri: finalLogo }}
                                style={{ width: 18, height: 18, borderRadius: 6, backgroundColor: '#f4f4f5' }}
                                contentFit="cover"
                            />
                            <Text className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide">
                                {sourceName}
                            </Text>
                            <Text className="text-[11px] text-zinc-300 dark:text-zinc-600">
                                •
                            </Text>
                            <Text className="text-[11px] text-zinc-400 font-medium">
                                <TimeAgo date={article.publishedAt} />
                            </Text>
                        </View>
                    </View>

                    {/* Thumbnail Image */}
                    {article.imageUrl ? (
                        <Image
                            source={{ uri: article.imageUrl }}
                            style={{ width: 96, height: 96, borderRadius: 16 }}
                            contentFit="cover"
                            transition={200}
                        />
                    ) : null}
                </View>

                <View className="flex-row items-center gap-5 mt-4 pt-4 border-t border-zinc-50 dark:border-zinc-800/50">
                    <View className="flex-row items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800/50 px-2 py-1 rounded-lg">
                        <Eye size={13} color="#a1a1aa" />
                        <Text className="text-[11px] text-zinc-500 font-semibold">{article.viewCount || Math.floor(Math.random() * 500) + 100}</Text>
                    </View>
                    <View className="flex-row items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800/50 px-2 py-1 rounded-lg">
                        <MessageCircle size={13} color="#a1a1aa" />
                        <Text className="text-[11px] text-zinc-500 font-semibold">{article.commentCount || Math.floor(Math.random() * 20)}</Text>
                    </View>
                    <View className="flex-1" />
                    <TouchableOpacity className="p-1">
                        <Bookmark size={18} color="#a1a1aa" />
                    </TouchableOpacity>
                    <TouchableOpacity className="p-1">
                        <Share2 size={18} color="#a1a1aa" />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Link>
    );
});

ArticleCard.displayName = 'ArticleCard';
