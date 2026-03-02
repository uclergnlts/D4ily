import React from 'react';
import { View, Text, Image } from 'react-native';
import { Heart, Repeat2, MessageCircle, Eye } from 'lucide-react-native';
import { TimeAgo } from '../ui/TimeAgo';
import type { Tweet } from '../../types';

interface TweetCardProps {
    tweet: Tweet;
}

function formatCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
}

export const TweetCard = React.memo(function TweetCard({ tweet }: TweetCardProps) {
    const fallback = (tweet.displayName?.charAt(0) || tweet.userName?.charAt(0) || 'X').toUpperCase();

    return (
        <View className="bg-white dark:bg-zinc-900 mx-4 mb-3 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            {/* Author row */}
            <View className="flex-row items-center gap-3 mb-3">
                {tweet.profileImageUrl ? (
                    <Image
                        source={{ uri: tweet.profileImageUrl }}
                        className="w-10 h-10 rounded-full"
                        resizeMode="cover"
                    />
                ) : (
                    <View className="w-10 h-10 rounded-full bg-zinc-900 dark:bg-white items-center justify-center">
                        <Text className="text-white dark:text-zinc-900 text-xs font-bold">{fallback}</Text>
                    </View>
                )}
                <View className="flex-1">
                    <Text className="text-sm font-bold text-zinc-900 dark:text-white" numberOfLines={1}>
                        {tweet.displayName}
                    </Text>
                    <Text className="text-xs text-zinc-400" numberOfLines={1}>
                        @{tweet.userName}
                    </Text>
                </View>
                <TimeAgo date={tweet.tweetedAt} />
            </View>

            {/* Tweet text */}
            <Text className="text-sm text-zinc-700 dark:text-zinc-300 leading-5 mb-3">
                {tweet.text}
            </Text>

            {/* Engagement metrics row */}
            <View className="flex-row items-center gap-5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <View className="flex-row items-center gap-1.5">
                    <Heart size={14} color="#a1a1aa" />
                    <Text className="text-xs text-zinc-500">{formatCount(tweet.likeCount)}</Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                    <Repeat2 size={14} color="#a1a1aa" />
                    <Text className="text-xs text-zinc-500">{formatCount(tweet.retweetCount)}</Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                    <MessageCircle size={14} color="#a1a1aa" />
                    <Text className="text-xs text-zinc-500">{formatCount(tweet.replyCount)}</Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                    <Eye size={14} color="#a1a1aa" />
                    <Text className="text-xs text-zinc-500">{formatCount(tweet.viewCount)}</Text>
                </View>
            </View>
        </View>
    );
});

TweetCard.displayName = 'TweetCard';
