import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { MessageCircle, Send, Heart } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { client } from '../../api/client';
import type { Comment } from '../../types';

interface CommentSectionProps {
    comments: Comment[];
    targetType: 'daily_digest' | 'article';
    targetId: string;
    country: string;
    onCommentAdded: () => void;
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'az önce';
    if (mins < 60) return `${mins}dk`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}sa`;
    const days = Math.floor(hours / 24);
    return `${days}g`;
}

function CommentItem({ comment }: { comment: Comment }) {
    return (
        <View className="py-3">
            <View className="flex-row items-center justify-between mb-1">
                <Text
                    className="text-[12px] text-zinc-500 dark:text-zinc-400"
                    style={{ fontFamily: 'DMSans_500Medium' }}
                >
                    {comment.userId.slice(0, 8)}...
                </Text>
                <Text
                    className="text-[11px] text-zinc-400"
                    style={{ fontFamily: 'DMSans_400Regular' }}
                >
                    {timeAgo(comment.createdAt)}
                </Text>
            </View>
            <Text
                className="text-[13px] text-zinc-800 dark:text-zinc-200"
                style={{ fontFamily: 'DMSans_400Regular', lineHeight: 20 }}
            >
                {comment.content}
            </Text>
            {comment.likeCount > 0 && (
                <View className="flex-row items-center gap-1 mt-1.5">
                    <Heart size={12} color="#a1a1aa" />
                    <Text className="text-[11px] text-zinc-400">{comment.likeCount}</Text>
                </View>
            )}

            {/* Replies */}
            {comment.replies && comment.replies.length > 0 && (
                <View className="ml-4 mt-2 border-l-2 border-zinc-100 dark:border-zinc-800 pl-3">
                    {comment.replies.map(reply => (
                        <CommentItem key={reply.id} comment={reply} />
                    ))}
                </View>
            )}
        </View>
    );
}

export const CommentSection: React.FC<CommentSectionProps> = ({
    comments,
    targetType,
    targetId,
    country,
    onCommentAdded,
}) => {
    const user = useAuthStore(state => state.user);
    const token = useAuthStore(state => state.token);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const handleSubmit = async () => {
        if (!newComment.trim() || !token) return;

        if (!user) {
            Alert.alert('Giriş Gerekli', 'Yorum yapmak için giriş yapmalısın.');
            return;
        }

        setSubmitting(true);
        try {
            await client.post(`/comments/${country}`, {
                articleId: targetId,
                targetType,
                content: newComment.trim(),
            });
            setNewComment('');
            onCommentAdded();
        } catch {
            Alert.alert('Hata', 'Yorum gönderilemedi. Tekrar dene.');
        } finally {
            setSubmitting(false);
        }
    };

    const displayComments = expanded ? comments : comments.slice(0, 3);

    return (
        <View className="mx-4 mb-6">
            {/* Header */}
            <TouchableOpacity
                onPress={() => setExpanded(!expanded)}
                className="flex-row items-center gap-2 mb-3 pl-2"
            >
                <MessageCircle size={18} color="#71717a" />
                <Text
                    className="text-[14px] text-zinc-700 dark:text-zinc-300"
                    style={{ fontFamily: 'DMSans_700Bold' }}
                >
                    Yorumlar
                </Text>
                <View className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                    <Text
                        className="text-[11px] text-zinc-500 dark:text-zinc-400"
                        style={{ fontFamily: 'DMSans_600SemiBold' }}
                    >
                        {comments.length}
                    </Text>
                </View>
            </TouchableOpacity>

            {/* Comment list */}
            {displayComments.length > 0 ? (
                <View className="bg-white dark:bg-zinc-900 rounded-2xl px-4 border border-zinc-100 dark:border-zinc-800">
                    {displayComments.map((comment, idx) => (
                        <View key={comment.id}>
                            <CommentItem comment={comment} />
                            {idx < displayComments.length - 1 && (
                                <View className="border-b border-zinc-100 dark:border-zinc-800" />
                            )}
                        </View>
                    ))}

                    {!expanded && comments.length > 3 && (
                        <TouchableOpacity
                            onPress={() => setExpanded(true)}
                            className="py-3 items-center border-t border-zinc-100 dark:border-zinc-800"
                        >
                            <Text
                                className="text-[12px] text-[#006FFF]"
                                style={{ fontFamily: 'DMSans_600SemiBold' }}
                            >
                                {comments.length - 3} yorum daha göster
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <View className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800 items-center">
                    <Text
                        className="text-[12px] text-zinc-400"
                        style={{ fontFamily: 'DMSans_400Regular' }}
                    >
                        Henüz yorum yok. İlk yorumu sen yap!
                    </Text>
                </View>
            )}

            {/* Input */}
            {user && (
                <View className="flex-row items-center gap-2 mt-3">
                    <TextInput
                        value={newComment}
                        onChangeText={setNewComment}
                        placeholder="Yorum yaz..."
                        placeholderTextColor="#a1a1aa"
                        className="flex-1 bg-white dark:bg-zinc-900 rounded-full px-4 py-2.5 text-[13px] text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700"
                        style={{ fontFamily: 'DMSans_400Regular' }}
                        maxLength={1000}
                        multiline={false}
                    />
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={!newComment.trim() || submitting}
                        className="w-10 h-10 rounded-full bg-[#006FFF] items-center justify-center"
                        style={{ opacity: !newComment.trim() || submitting ? 0.5 : 1 }}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Send size={16} color="#fff" />
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};
