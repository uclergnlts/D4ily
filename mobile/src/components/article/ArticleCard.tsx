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

export const ArticleCard = React.memo(({ article }: ArticleCardProps) => {
    const primarySource = article.sources?.find(s => s.isPrimary) || article.sources?.[0];
    const sourceName = primarySource?.sourceName || 'Kaynak';
    const sourceLogo = primarySource?.sourceLogoUrl;

    return (
        <Link href={`/article/${article.id}`} asChild>
            <TouchableOpacity className="bg-white dark:bg-zinc-900 mx-4 mb-3 p-4 rounded-[20px] shadow-sm border border-zinc-50 dark:border-zinc-800 active:scale-[0.99] transition-transform">
                <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center gap-2">
                        {sourceLogo ? (
                            <Image
                                source={{ uri: sourceLogo }}
                                style={{ width: 16, height: 16, borderRadius: 4 }}
                                contentFit="contain"
                            />
                        ) : null}
                        <Text className="text-[13px] font-bold text-zinc-900 dark:text-white">
                            {sourceName}
                        </Text>
                        <Text className="text-[12px] text-zinc-400">
                            • <TimeAgo date={article.publishedAt} />
                        </Text>
                    </View>
                    <View className="w-2 h-2 rounded-full bg-orange-500" />
                </View>

                <View className="flex-row gap-4">
                    <View className="flex-1">
                        <Text className="text-[15px] font-bold text-zinc-900 dark:text-white leading-[22px] mb-2">
                            {article.translatedTitle}
                        </Text>
                        <Text
                            numberOfLines={3}
                            className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-[18px]"
                        >
                            {article.summary || "Haber detayı için tıklayınız..."}
                        </Text>
                    </View>
                    <Image
                        source={{ uri: article.imageUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=2070&auto=format&fit=crop' }}
                        style={{ width: 100, height: 100, borderRadius: 12 }}
                        contentFit="cover"
                        transition={200}
                    />
                </View>

                <View className="flex-row items-center gap-4 mt-3">
                    <View className="flex-row items-center gap-1.5">
                        <Eye size={14} color="#a1a1aa" />
                        <Text className="text-[12px] text-zinc-400 font-medium">{article.viewCount || 664}</Text>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                        <MessageCircle size={14} color="#a1a1aa" />
                        <Text className="text-[12px] text-zinc-400 font-medium">{article.commentCount || 12}</Text>
                    </View>
                    <View className="flex-1" />
                    <TouchableOpacity>
                        <Bookmark size={18} color="#a1a1aa" />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <Share2 size={18} color="#a1a1aa" />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Link>
    );
});
