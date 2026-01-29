import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Comment } from '../../types';
import { CommentCard } from './CommentCard';
import { usePremium } from '../../hooks/usePremium';
import { Lock, Crown } from 'lucide-react-native';

interface CommentThreadProps {
    comment: Comment;
    onLike?: (id: string) => void;
    onReply?: (id: string, username: string) => void;
    isPremiumFeature?: boolean;
    maxReplies?: number;
}

export const CommentThread = React.memo(function CommentThread({ 
    comment, 
    onLike, 
    onReply,
    isPremiumFeature = false,
    maxReplies = 3,
}: CommentThreadProps) {
    const { isPremium, requirePremium, purchasePackage, packages } = usePremium();
    const [showPremiumModal, setShowPremiumModal] = React.useState(false);

    const handleReply = (id: string, username: string) => {
        if (isPremiumFeature && !isPremium) {
            setShowPremiumModal(true);
            return;
        }
        if (onReply) {
            onReply(id, username);
        }
    };

    const visibleReplies = comment.replies && comment.replies.length > 0 
        ? comment.replies.slice(0, isPremium ? comment.replies.length : maxReplies)
        : [];

    const hasMoreReplies = comment.replies && comment.replies.length > maxReplies && !isPremium;

    return (
        <View className="mb-4">
            {/* Parent Comment */}
            <CommentCard
                comment={comment}
                onLike={onLike}
                onReply={handleReply}
            />

            {/* Replies (Recursive) */}
            {visibleReplies.length > 0 && (
                <View className="ml-6 mt-3 pl-4 border-l-2 border-zinc-100 dark:border-zinc-800/80">
                    {visibleReplies.map((reply) => (
                        <CommentCard
                            key={reply.id}
                            comment={reply}
                            onLike={onLike}
                            onReply={handleReply}
                            className="mb-3"
                        />
                    ))}
                </View>
            )}

            {/* Premium Gate for More Replies */}
            {hasMoreReplies && (
                <View className="ml-6 mt-3 pl-4">
                    <TouchableOpacity
                        onPress={() => setShowPremiumModal(true)}
                        className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-xl flex-row items-center"
                    >
                        <Lock size={20} color="#a1a1aa" className="mr-3" />
                        <View className="flex-1">
                            <Text className="text-zinc-900 dark:text-white font-bold text-sm mb-1">
                                {comment.replies!.length - maxReplies} Daha Fazla Yanıt
                            </Text>
                            <Text className="text-zinc-500 text-xs">
                                Tüm yanıtları görmek için premium'a geç
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
            )}

            {/* Premium Modal */}
            <Modal
                visible={showPremiumModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowPremiumModal(false)}
            >
                <View className="flex-1 bg-black/50 items-center justify-center p-6">
                    <View className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-sm">
                        <View className="items-center mb-6">
                            <View className="w-16 h-16 bg-primary/20 rounded-full items-center justify-center mb-4">
                                <Crown size={32} color="#006FFF" />
                            </View>
                            <Text className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                                Premium'a Geç
                            </Text>
                            <Text className="text-zinc-500 text-center text-sm leading-6">
                                Sınırsız yorum okuma ve etkileşim için premium'a geç.
                            </Text>
                        </View>

                        {/* Features */}
                        <View className="mb-6 space-y-3">
                            <View className="flex-row items-center">
                                <View className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full items-center justify-center mr-3">
                                    <Text className="text-green-600 dark:text-green-400 text-xs">✓</Text>
                                </View>
                                <Text className="text-zinc-700 dark:text-zinc-300 text-sm">Sınırsız yorum okuma</Text>
                            </View>
                            <View className="flex-row items-center">
                                <View className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full items-center justify-center mr-3">
                                    <Text className="text-green-600 dark:text-green-400 text-xs">✓</Text>
                                </View>
                                <Text className="text-zinc-700 dark:text-zinc-300 text-sm">Tüm yanıtları gör</Text>
                            </View>
                            <View className="flex-row items-center">
                                <View className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full items-center justify-center mr-3">
                                    <Text className="text-green-600 dark:text-green-400 text-xs">✓</Text>
                                </View>
                                <Text className="text-zinc-700 dark:text-zinc-300 text-sm">Sınırsız yorum yapma</Text>
                            </View>
                            <View className="flex-row items-center">
                                <View className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full items-center justify-center mr-3">
                                    <Text className="text-green-600 dark:text-green-400 text-xs">✓</Text>
                                </View>
                                <Text className="text-zinc-700 dark:text-zinc-300 text-sm">Reklamsız deneyim</Text>
                            </View>
                        </View>

                        {/* Pricing */}
                        <View className="mb-6">
                            {packages.length > 0 && (
                                <View className="space-y-3">
                                    {packages.map((pkg) => (
                                        <TouchableOpacity
                                            key={pkg.identifier}
                                            onPress={() => {
                                                purchasePackage(pkg);
                                                setShowPremiumModal(false);
                                            }}
                                            className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-xl border-2 border-transparent active:border-primary"
                                        >
                                            <View className="flex-row items-center justify-between">
                                                <View>
                                                    <Text className="text-zinc-900 dark:text-white font-bold text-base">
                                                        {pkg.productTitle}
                                                    </Text>
                                                    <Text className="text-zinc-500 text-xs">
                                                        {pkg.description}
                                                    </Text>
                                                </View>
                                                <Text className="text-primary font-bold text-lg">
                                                    {pkg.priceString}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Close Button */}
                        <TouchableOpacity
                            onPress={() => setShowPremiumModal(false)}
                            className="py-3"
                        >
                            <Text className="text-zinc-500 text-center text-sm">Kapat</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
});

CommentThread.displayName = 'CommentThread';
