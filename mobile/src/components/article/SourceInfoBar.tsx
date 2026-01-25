import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { AlignmentDot } from '../ui/AlignmentDot';
import { ArticleSource } from '../../types';

interface SourceInfoBarProps {
    sources: ArticleSource[];
    className?: string;
}

export const SourceInfoBar = React.memo(({ sources, className }: SourceInfoBarProps) => {
    const primarySource = sources.find(s => s.isPrimary) || sources[0];

    if (!primarySource) return null;

    const { sourceName, sourceLogoUrl, govAlignmentScore, govAlignmentLabel } = primarySource;
    const stanceScore = govAlignmentScore || 0;

    return (
        <View className={`px-5 py-3 flex-row items-center justify-between bg-white dark:bg-zinc-900 mx-4 rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-800 ${className}`}>

            {/* Source Info */}
            <View className="flex-row items-center gap-3.5">
                {sourceLogoUrl ? (
                    <Image
                        source={{ uri: sourceLogoUrl }}
                        style={{ width: 40, height: 40, borderRadius: 14 }}
                        contentFit="cover"
                        transition={200}
                    />
                ) : (
                    <View className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl items-center justify-center">
                        <Text className="text-sm font-bold text-zinc-400">{sourceName.charAt(0)}</Text>
                    </View>
                )}

                <View>
                    <Text className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                        {sourceName}
                    </Text>
                    {sources.length > 1 ? (
                        <Text className="text-[11px] font-medium text-zinc-400 mt-0.5">
                            + {sources.length - 1} diğer kaynak
                        </Text>
                    ) : (
                        <Text className="text-[11px] font-medium text-zinc-400 mt-0.5">
                            Ana Kaynak
                        </Text>
                    )}
                </View>
            </View>

            {/* Alignment Badge */}
            <View className="flex-row items-center gap-2 bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-100 dark:border-zinc-700/50">
                <AlignmentDot score={stanceScore} size={8} />
                {govAlignmentLabel && (
                    <Text className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                        {govAlignmentLabel}
                    </Text>
                )}
            </View>

        </View>
    );
});
