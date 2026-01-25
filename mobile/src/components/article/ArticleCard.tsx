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

    // Calculate color based on political alignment for the dot
    const alignmentColor = (article.govAlignmentScore || 0) > 2 ? '#3b82f6' : (article.govAlignmentScore || 0) < -2 ? '#ef4444' : '#f59e0b';

    return (
        <Link href={`/article/${article.id}`} asChild>
            <TouchableOpacity className="bg-white dark:bg-zinc-900 mb-4 mx-4 rounded-[24px] shadow-sm border border-zinc-100 dark:border-zinc-800 active:scale-[0.99] transition-transform overflow-hidden">

                {/* Header: Source Info */}
                <View className="flex-row items-center justify-between px-4 py-3">
                    <View className="flex-row items-center gap-3">
                        {sourceLogo ? (
                            <Image
                                source={{ uri: sourceLogo }}
                                style={{ width: 32, height: 32, borderRadius: 8 }} // Square with rounded corners per design
                                contentFit="contain"
                                transition={200}
                            />
                        ) : (
                            <View className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 items-center justify-center">
                                <Text className="text-xs font-bold text-zinc-500">{sourceName.charAt(0)}</Text>
                            </View>
                        )}
                        <View>
                            <Text className="text-[14px] font-bold text-zinc-900 dark:text-white leading-tight">
                                {sourceName}
                            </Text>
                            <TimeAgo date={article.publishedAt} className="text-[11px] text-zinc-400 font-medium" />
                        </View>
                    </View>

                    {/* Status Dot */}
                    <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: alignmentColor }} />
                </View>

                {/* Article Image - New Addition */}
                <View className="px-4 mb-3">
                    <Image
                        source={{ uri: article.imageUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=2070&auto=format&fit=crop' }} // Fallback image
                        style={{ width: '100%', height: 200, borderRadius: 16 }}
                        contentFit="cover"
                        transition={200}
                    />
                </View>

                {/* Content Body */}
                <View className="px-5 pb-3">
                    <Text className="text-[17px] font-black text-zinc-900 dark:text-white leading-[24px] mb-2 tracking-tight">
                        {article.translatedTitle}
                    </Text>

                    <Text
                        numberOfLines={3}
                        className="text-[14px] text-zinc-500 dark:text-zinc-400 leading-[20px] font-medium"
                    >
                        {article.summary}
                    </Text>
                </View>

                {/* Footer: Stats & Actions */}
                <View className="flex-row items-center justify-between px-5 py-3 border-t border-zinc-50 dark:border-zinc-800/50">

                    {/* Left: Views & Comments */}
                    <View className="flex-row items-center gap-4">
                        <View className="flex-row items-center gap-1.5">
                            <Eye size={16} color="#a1a1aa" />
                            <Text className="text-[13px] text-zinc-500 font-medium">{article.viewCount || 664}</Text>
                        </View>
                        <View className="flex-row items-center gap-1.5">
                            <MessageCircle size={16} color="#a1a1aa" />
                            <Text className="text-[13px] text-zinc-500 font-medium">{article.commentCount || 12}</Text>
                        </View>
                    </View>

                    {/* Right: Actions */}
                    <View className="flex-row items-center gap-4">
                        <TouchableOpacity>
                            <Bookmark size={20} color="#a1a1aa" />
                        </TouchableOpacity>
                        <TouchableOpacity>
                            <Share2 size={20} color="#a1a1aa" />
                        </TouchableOpacity>
                    </View>
                </View>

            </TouchableOpacity>
        </Link>
    );
});
