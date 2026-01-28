import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { ShieldCheck, TrendingUp, Info } from 'lucide-react-native';

interface SourceCardProps {
    name: string;
    logoUrl?: string;
    alignmentScore: number;
    alignmentLabel: string;
    trustScore?: number; // 0-100
    articleCount?: number;
    className?: string;
}

export const SourceCard = React.memo(function SourceCard({ name, logoUrl, alignmentScore, alignmentLabel, trustScore = 85, articleCount, className }: SourceCardProps) {
    return (
        <View className={`bg-white dark:bg-zinc-900 p-5 rounded-[24px] shadow-sm border border-zinc-100 dark:border-zinc-800 ${className}`}>

            {/* Header: Logo & Name */}
            <View className="flex-row items-start mb-5">
                <View className="w-14 h-14 bg-zinc-50 dark:bg-zinc-800 rounded-2xl items-center justify-center p-1 mr-4 border border-zinc-100 dark:border-zinc-700 shadow-sm">
                    {logoUrl ? (
                        <Image source={{ uri: logoUrl }} style={{ width: 44, height: 44, borderRadius: 12 }} contentFit="contain" />
                    ) : (
                        <Text className="text-xl font-bold text-zinc-400">{name[0]}</Text>
                    )}
                </View>
                <View className="flex-1">
                    <View className="flex-row justify-between items-start">
                        <Text className="text-lg font-bold text-zinc-900 dark:text-white mb-1.5 flex-1 mr-2">
                            {name}
                        </Text>
                        <View className="bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-900/30 flex-row items-center gap-1.5">
                            <ShieldCheck size={12} color="#10b981" />
                            <Text className="text-[10px] font-bold text-emerald-700 dark:text-emerald-500">
                                %{trustScore}
                            </Text>
                        </View>
                    </View>

                    <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                        Ulusal Haber Kaynağı
                    </Text>
                </View>
            </View>

            {/* Alignment Section */}
            <View className="mb-5 bg-zinc-50 dark:bg-zinc-800/30 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <View className="flex-row justify-between mb-3">
                    <View className="flex-row items-center gap-1.5">
                        <Info size={14} color="#71717a" />
                        <Text className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Yayın Politikası</Text>
                    </View>
                    <Text className="text-xs font-medium text-zinc-500 uppercase">{alignmentLabel}</Text>
                </View>

                {/* Visual Bar for Alignment - Enhanced */}
                <View className="h-2.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden relative mb-1.5">
                    {/* Tick for center */}
                    <View className="absolute left-[50%] top-0 bottom-0 w-[1px] bg-zinc-400/50 z-10" />

                    {/* Indicator */}
                    <View
                        className={`absolute top-0 bottom-0 w-3 h-3 rounded-full -mt-0.5 shadow-sm border border-white dark:border-zinc-900 ${alignmentScore < -1 ? 'bg-indigo-500' : alignmentScore > 1 ? 'bg-amber-500' : 'bg-zinc-500'
                            }`}
                        style={{
                            left: `${Math.max(0, Math.min(100, ((alignmentScore + 5) / 10) * 100))}%`,
                            transform: [{ translateX: -6 }]
                        }}
                    />
                </View>
                <View className="flex-row justify-between opacity-50 px-0.5">
                    <Text className="text-[9px] text-zinc-500 font-medium">Muhalif</Text>
                    <Text className="text-[9px] text-zinc-500 font-medium">Nötr</Text>
                    <Text className="text-[9px] text-zinc-500 font-medium">İktidar</Text>
                </View>
            </View>

            {/* Footer Stats */}
            {articleCount !== undefined && (
                <View className="pt-0 flex-row items-center gap-2">
                    <TrendingUp size={14} color="#006FFF" />
                    <Text className="text-xs text-zinc-500">
                        Bu hafta <Text className="font-bold text-zinc-900 dark:text-white">{articleCount} haber</Text> ile gündemde.
                    </Text>
                </View>
            )}

        </View>
    );
});

SourceCard.displayName = 'SourceCard';
