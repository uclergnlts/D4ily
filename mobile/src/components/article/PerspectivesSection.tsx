import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { AlignmentDot } from '../ui/AlignmentDot';
import { Link } from 'expo-router';
import { PerspectiveMatch } from '../../types';
import { Split } from 'lucide-react-native';

interface PerspectivesSectionProps {
    perspectives: PerspectiveMatch[];
    className?: string;
}

export const PerspectivesSection = React.memo(({ perspectives, className }: PerspectivesSectionProps) => {
    if (!perspectives || perspectives.length === 0) return null;

    return (
        <View className={`mt-4 mb-6 ${className}`}>

            {/* Header */}
            <View className="flex-row items-center gap-3 mb-4 px-5">
                <View className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 items-center justify-center">
                    <Split size={16} color="#006FFF" />
                </View>
                <Text className="text-[17px] font-bold text-zinc-900 dark:text-white">
                    Farklı Bakış Açıları
                </Text>
            </View>

            {/* List */}
            <View className="gap-3 px-4">
                {perspectives.map((item) => (
                    <Link href={`/article/${item.articleId}`} key={item.articleId} asChild>
                        <TouchableOpacity className="flex-row items-center bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 shadow-sm active:scale-[0.99] transition-transform">

                            {/* Source Info */}
                            <View className="mr-3.5 items-center">
                                {item.sourceLogoUrl ? (
                                    <Image
                                        source={{ uri: item.sourceLogoUrl }}
                                        style={{ width: 40, height: 40, borderRadius: 12 }}
                                        contentFit="cover"
                                        transition={200}
                                    />
                                ) : (
                                    <View className="w-10 h-10 bg-zinc-100 rounded-xl" />
                                )}
                                <View className="mt-[-8px] bg-white dark:bg-zinc-900 rounded-full p-[2px] shadow-sm ring-2 ring-white dark:ring-zinc-900">
                                    <AlignmentDot score={item.govAlignmentScore} size={8} />
                                </View>
                            </View>

                            {/* Content */}
                            <View className="flex-1 justify-center">
                                <Text numberOfLines={2} className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5 leading-[20px] tracking-tight">
                                    {item.title}
                                </Text>

                                <View className="flex-row items-center justify-between">
                                    <Text className="text-[11px] text-zinc-500 font-medium">
                                        {item.sourceName}
                                    </Text>

                                    <View className="bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-900/30">
                                        <Text className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wide">
                                            %{Math.round(item.similarityScore * 100)} BENZERLİK
                                        </Text>
                                    </View>
                                </View>
                            </View>

                        </TouchableOpacity>
                    </Link>
                ))}
            </View>

        </View>
    );
});

PerspectivesSection.displayName = 'PerspectivesSection';
