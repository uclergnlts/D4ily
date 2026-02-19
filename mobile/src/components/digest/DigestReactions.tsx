import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { ThumbsUp, ThumbsDown } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { client } from '../../api/client';

interface DigestReactionsProps {
    digestId: string;
    country: string;
}

export const DigestReactions = React.memo(function DigestReactions({ digestId, country }: DigestReactionsProps) {
    const user = useAuthStore(state => state.user);
    const [userReaction, setUserReaction] = useState<'like' | 'dislike' | null>(null);
    const [likeCount, setLikeCount] = useState(0);
    const [dislikeCount, setDislikeCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await client.get(`/digest/${country}/${digestId}/reaction-status`);
            if (res.data.success) {
                setUserReaction(res.data.data.userReaction);
                setLikeCount(res.data.data.likeCount);
                setDislikeCount(res.data.data.dislikeCount);
            }
        } catch {
            // Silently fail - counts stay at 0
        }
    }, [country, digestId]);

    useEffect(() => {
        if (user) {
            fetchStatus();
        }
    }, [fetchStatus, user]);

    const handleReaction = async (action: 'like' | 'dislike') => {
        if (!user) {
            Alert.alert('Giris Gerekli', 'Reaksiyon vermek icin giris yapmalisin.');
            return;
        }

        if (loading) return;
        setLoading(true);

        try {
            const newAction = userReaction === action ? 'remove' : action;
            const res = await client.post(`/digest/${country}/${digestId}/react`, { action: newAction });

            if (res.data.success) {
                setUserReaction(res.data.data.userReaction);
                setLikeCount(res.data.data.likeCount);
                setDislikeCount(res.data.data.dislikeCount);
            }
        } catch {
            Alert.alert('Hata', 'Bir sorun olustu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-row items-center gap-4 mx-4 mb-4">
            <TouchableOpacity
                onPress={() => handleReaction('like')}
                className={`flex-row items-center gap-2 px-4 py-2.5 rounded-full border ${
                    userReaction === 'like'
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700'
                }`}
                activeOpacity={0.7}
            >
                <ThumbsUp
                    size={18}
                    color={userReaction === 'like' ? '#16a34a' : '#a1a1aa'}
                    fill={userReaction === 'like' ? '#16a34a' : 'none'}
                />
                <Text
                    className={`text-[13px] ${
                        userReaction === 'like' ? 'text-green-600 dark:text-green-400' : 'text-zinc-500'
                    }`}
                    style={{ fontFamily: 'DMSans_600SemiBold' }}
                >
                    {likeCount > 0 ? likeCount : 'Begen'}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => handleReaction('dislike')}
                className={`flex-row items-center gap-2 px-4 py-2.5 rounded-full border ${
                    userReaction === 'dislike'
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700'
                }`}
                activeOpacity={0.7}
            >
                <ThumbsDown
                    size={18}
                    color={userReaction === 'dislike' ? '#dc2626' : '#a1a1aa'}
                    fill={userReaction === 'dislike' ? '#dc2626' : 'none'}
                />
                <Text
                    className={`text-[13px] ${
                        userReaction === 'dislike' ? 'text-red-600 dark:text-red-400' : 'text-zinc-500'
                    }`}
                    style={{ fontFamily: 'DMSans_600SemiBold' }}
                >
                    {dislikeCount > 0 ? dislikeCount : 'Begenme'}
                </Text>
            </TouchableOpacity>
        </View>
    );
});

DigestReactions.displayName = 'DigestReactions';
