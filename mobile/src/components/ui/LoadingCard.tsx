import React from 'react';
import { View } from 'react-native';
import { MotiView } from 'moti';

interface LoadingCardProps {
    variant?: 'card' | 'list' | 'article' | 'comment';
    count?: number;
}

/**
 * LoadingCard - Skeleton loading component using Moti
 * Provides smooth, animated loading states for different content types
 */
export const LoadingCard: React.FC<LoadingCardProps> = ({
    variant = 'card',
    count = 1,
}) => {
    const renderCardSkeleton = () => (
        <View className="bg-white dark:bg-zinc-900 rounded-2xl p-4 mb-4 border border-zinc-100 dark:border-zinc-800">
            {/* Header */}
            <View className="flex-row items-center mb-3">
                <MotiView
                    from={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: 'timing', duration: 1000, loop: true }}
                    className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 mr-3"
                />
                <View className="flex-1">
                    <MotiView
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ type: 'timing', duration: 1000, loop: true }}
                        className="h-3 w-24 bg-zinc-200 dark:bg-zinc-700 rounded mb-2"
                    />
                    <MotiView
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ type: 'timing', duration: 1000, loop: true, delay: 100 }}
                        className="h-2 w-16 bg-zinc-200 dark:bg-zinc-700 rounded"
                    />
                </View>
            </View>

            {/* Title */}
            <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ type: 'timing', duration: 1000, loop: true, delay: 200 }}
                className="h-5 w-full bg-zinc-200 dark:bg-zinc-700 rounded mb-3"
            />
            <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ type: 'timing', duration: 1000, loop: true, delay: 300 }}
                className="h-5 w-3/4 bg-zinc-200 dark:bg-zinc-700 rounded mb-4"
            />

            {/* Image placeholder */}
            <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ type: 'timing', duration: 1000, loop: true, delay: 400 }}
                className="h-40 w-full bg-zinc-200 dark:bg-zinc-700 rounded-xl mb-4"
            />

            {/* Footer */}
            <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                    <MotiView
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ type: 'timing', duration: 1000, loop: true, delay: 500 }}
                        className="h-3 w-12 bg-zinc-200 dark:bg-zinc-700 rounded mr-2"
                    />
                    <MotiView
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ type: 'timing', duration: 1000, loop: true, delay: 600 }}
                        className="h-3 w-12 bg-zinc-200 dark:bg-zinc-700 rounded"
                    />
                </View>
                <MotiView
                    from={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: 'timing', duration: 1000, loop: true, delay: 700 }}
                    className="h-3 w-16 bg-zinc-200 dark:bg-zinc-700 rounded"
                />
            </View>
        </View>
    );

    const renderListSkeleton = () => (
        <View className="bg-white dark:bg-zinc-900 rounded-xl p-4 mb-3 border border-zinc-100 dark:border-zinc-800">
            <View className="flex-row items-center">
                <MotiView
                    from={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: 'timing', duration: 1000, loop: true }}
                    className="w-16 h-16 rounded-lg bg-zinc-200 dark:bg-zinc-700 mr-4"
                />
                <View className="flex-1">
                    <MotiView
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ type: 'timing', duration: 1000, loop: true, delay: 100 }}
                        className="h-4 w-full bg-zinc-200 dark:bg-zinc-700 rounded mb-2"
                    />
                    <MotiView
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ type: 'timing', duration: 1000, loop: true, delay: 200 }}
                        className="h-3 w-2/3 bg-zinc-200 dark:bg-zinc-700 rounded"
                    />
                </View>
            </View>
        </View>
    );

    const renderArticleSkeleton = () => (
        <View className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden mb-4 border border-zinc-100 dark:border-zinc-800">
            {/* Image */}
            <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ type: 'timing', duration: 1000, loop: true }}
                className="h-48 w-full bg-zinc-200 dark:bg-zinc-700"
            />

            {/* Content */}
            <View className="p-4">
                <View className="flex-row items-center mb-3">
                    <MotiView
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ type: 'timing', duration: 1000, loop: true, delay: 100 }}
                        className="h-6 w-20 bg-zinc-200 dark:bg-zinc-700 rounded mr-2"
                    />
                    <MotiView
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ type: 'timing', duration: 1000, loop: true, delay: 200 }}
                        className="h-6 w-16 bg-zinc-200 dark:bg-zinc-700 rounded"
                    />
                </View>

                <MotiView
                    from={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: 'timing', duration: 1000, loop: true, delay: 300 }}
                    className="h-6 w-full bg-zinc-200 dark:bg-zinc-700 rounded mb-2"
                />
                <MotiView
                    from={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: 'timing', duration: 1000, loop: true, delay: 400 }}
                    className="h-6 w-5/6 bg-zinc-200 dark:bg-zinc-700 rounded mb-2"
                />
                <MotiView
                    from={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: 'timing', duration: 1000, loop: true, delay: 500 }}
                    className="h-6 w-4/6 bg-zinc-200 dark:bg-zinc-700 rounded mb-4"
                />

                {/* Footer */}
                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                        <MotiView
                            from={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ type: 'timing', duration: 1000, loop: true, delay: 600 }}
                            className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 mr-2"
                        />
                        <MotiView
                            from={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ type: 'timing', duration: 1000, loop: true, delay: 700 }}
                            className="h-3 w-20 bg-zinc-200 dark:bg-zinc-700 rounded"
                        />
                    </View>
                    <MotiView
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ type: 'timing', duration: 1000, loop: true, delay: 800 }}
                        className="h-3 w-12 bg-zinc-200 dark:bg-zinc-700 rounded"
                    />
                </View>
            </View>
        </View>
    );

    const renderCommentSkeleton = () => (
        <View className="bg-white dark:bg-zinc-900 rounded-xl p-4 mb-3 border border-zinc-100 dark:border-zinc-800">
            <View className="flex-row items-start mb-3">
                <MotiView
                    from={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: 'timing', duration: 1000, loop: true }}
                    className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 mr-3"
                />
                <View className="flex-1">
                    <MotiView
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ type: 'timing', duration: 1000, loop: true, delay: 100 }}
                        className="h-3 w-24 bg-zinc-200 dark:bg-zinc-700 rounded mb-2"
                    />
                    <MotiView
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ type: 'timing', duration: 1000, loop: true, delay: 200 }}
                        className="h-3 w-16 bg-zinc-200 dark:bg-zinc-700 rounded"
                    />
                </View>
            </View>

            <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ type: 'timing', duration: 1000, loop: true, delay: 300 }}
                className="h-4 w-full bg-zinc-200 dark:bg-zinc-700 rounded mb-2"
            />
            <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ type: 'timing', duration: 1000, loop: true, delay: 400 }}
                className="h-4 w-4/5 bg-zinc-200 dark:bg-zinc-700 rounded mb-3"
            />

            <View className="flex-row items-center">
                <MotiView
                    from={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: 'timing', duration: 1000, loop: true, delay: 500 }}
                    className="h-3 w-12 bg-zinc-200 dark:bg-zinc-700 rounded mr-4"
                />
                <MotiView
                    from={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: 'timing', duration: 1000, loop: true, delay: 600 }}
                    className="h-3 w-12 bg-zinc-200 dark:bg-zinc-700 rounded"
                />
            </View>
        </View>
    );

    const renderSkeleton = () => {
        switch (variant) {
            case 'list':
                return renderListSkeleton();
            case 'article':
                return renderArticleSkeleton();
            case 'comment':
                return renderCommentSkeleton();
            default:
                return renderCardSkeleton();
        }
    };

    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <View key={index}>{renderSkeleton()}</View>
            ))}
        </>
    );
};

LoadingCard.displayName = 'LoadingCard';
