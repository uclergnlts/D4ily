import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Comment } from '../../types';
import { TimeAgo } from '../ui/TimeAgo';
import { Heart, MessageCircle, MoreHorizontal } from 'lucide-react-native';
import { Image } from 'expo-image';

interface CommentCardProps {
    comment: Comment;
    onLike?: (id: string) => void;
    onReply?: (id: string, username: string) => void;
    isLiked?: boolean;
    className?: string;
}

export const CommentCard = React.memo(({ comment, onLike, onReply, isLiked, className }: CommentCardProps) => {
    // Mock user name if not provided (Backend currently returns raw comment)
    const username = 'Kullanıcı';
    const avatarUrl = undefined; // Placeholder for real avatar
    const randomColor = 'bg-indigo-500'; // Could be dynamic based on name hash

    return (
        <View className={`bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 ${className}`}>

            <View className="flex-row gap-3">
                {/* Avatar */}
                {avatarUrl ? (
                    <Image
                        source={{ uri: avatarUrl }}
                        style={{ width: 36, height: 36, borderRadius: 14 }}
                    />
                ) : (
                    <View className={`w-9 h-9 rounded-xl ${randomColor} items-center justify-center shadow-sm`}>
                        <Text className="text-sm font-bold text-white">
                            {username[0]}
                        </Text>
                    </View>
                )}

                {/* Content Body */}
                <View className="flex-1">
                    {/* Header: Name & Time */}
                    <View className="flex-row items-center justify-between mb-1">
                        <View className="flex-row items-center gap-2">
                            <Text className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100">
                                {username}
                            </Text>
                            <View className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                            <TimeAgo date={comment.createdAt} className="text-[11px] text-zinc-400 font-medium" />
                        </View>
                        <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <MoreHorizontal size={16} color="#d4d4d8" />
                        </TouchableOpacity>
                    </View>

                    {/* Text */}
                    <Text className="text-[14px] text-zinc-700 dark:text-zinc-300 leading-[22px] mb-3 font-normal">
                        {comment.content}
                    </Text>

                    {/* Actions Bar */}
                    <View className="flex-row items-center gap-6">
                        <TouchableOpacity
                            onPress={() => onLike?.(comment.id)}
                            className="flex-row items-center gap-1.5 active:opacity-60"
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Heart
                                size={16}
                                color={isLiked ? "#ef4444" : "#a1a1aa"}
                                fill={isLiked ? "#ef4444" : "transparent"}
                            />
                            {comment.likeCount > 0 && (
                                <Text className={`text-xs font-medium ${isLiked ? 'text-red-500' : 'text-zinc-500'}`}>
                                    {comment.likeCount}
                                </Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => onReply?.(comment.id, username)}
                            className="flex-row items-center gap-1.5 active:opacity-60"
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <MessageCircle size={16} color="#a1a1aa" />
                            <Text className="text-xs font-medium text-zinc-500">Yanıtla</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
});
