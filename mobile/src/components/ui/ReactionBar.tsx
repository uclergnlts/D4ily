import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Heart, ThumbsDown, Bookmark, Share2 } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, SharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface ReactionBarProps {
    likeCount: number;
    dislikeCount: number;
    commentCount: number;
    isLiked?: boolean;
    isDisliked?: boolean;
    isBookmarked?: boolean;
    onLike?: () => void;
    onDislike?: () => void;
    onBookmark?: () => void;
    onShare?: () => void;
}

const AnimatedButton = Animated.createAnimatedComponent(TouchableOpacity);

export function ReactionBar({
    likeCount,
    dislikeCount,
    commentCount,
    isLiked,
    isDisliked,
    isBookmarked,
    onLike,
    onDislike,
    onBookmark,
    onShare
}: ReactionBarProps) {

    const likeScale = useSharedValue(1);
    const dislikeScale = useSharedValue(1);
    const bookmarkScale = useSharedValue(1);

    const handlePress = (action: (() => void) | undefined, scaleValue: SharedValue<number>) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        scaleValue.value = withSequence(
            withSpring(1.4),
            withSpring(1)
        );
        if (action) action();
    };

    const useButtonAnimation = (scale: SharedValue<number>) => useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    return (
        <View className="flex-row items-center justify-between py-3 border-t border-zinc-100 dark:border-zinc-800/50 mt-2">
            {/* Reactions Group */}
            <View className="flex-row items-center gap-5">
                {/* Like */}
                <AnimatedButton
                    onPress={() => handlePress(onLike, likeScale)}
                    className="flex-row items-center gap-1.5 active:opacity-70"
                    style={useButtonAnimation(likeScale)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Heart
                        size={22}
                        color={isLiked ? '#ef4444' : '#a1a1aa'}
                        fill={isLiked ? '#ef4444' : 'transparent'}
                        strokeWidth={isLiked ? 0 : 2}
                    />
                    <Text className={`text-xs font-semibold ${isLiked ? 'text-red-500' : 'text-zinc-500'}`}>
                        {likeCount}
                    </Text>
                </AnimatedButton>

                {/* Dislike */}
                <AnimatedButton
                    onPress={() => handlePress(onDislike, dislikeScale)}
                    className="flex-row items-center gap-1.5 active:opacity-70"
                    style={useButtonAnimation(dislikeScale)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <ThumbsDown
                        size={22}
                        color={isDisliked ? '#3b82f6' : '#a1a1aa'}
                        fill={isDisliked ? '#3b82f6' : 'transparent'}
                        strokeWidth={isDisliked ? 0 : 2}
                    />
                    <Text className={`text-xs font-semibold ${isDisliked ? 'text-blue-500' : 'text-zinc-500'}`}>
                        {dislikeCount}
                    </Text>
                </AnimatedButton>
            </View>

            {/* Actions Group */}
            <View className="flex-row items-center gap-5">
                {/* Bookmark */}
                <AnimatedButton
                    onPress={() => handlePress(onBookmark, bookmarkScale)}
                    className="p-1 active:opacity-70"
                    style={useButtonAnimation(bookmarkScale)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Bookmark
                        size={22}
                        color={isBookmarked ? '#eab308' : '#a1a1aa'}
                        fill={isBookmarked ? '#eab308' : 'transparent'}
                        strokeWidth={isBookmarked ? 0 : 2}
                    />
                </AnimatedButton>

                {/* Share */}
                <TouchableOpacity
                    onPress={() => {
                        Haptics.selectionAsync();
                        onShare?.();
                    }}
                    className="p-1 active:opacity-70"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Share2
                        size={22}
                        color="#a1a1aa"
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
}
