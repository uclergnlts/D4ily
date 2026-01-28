import React from 'react';
import { View, Text } from 'react-native';
import { AlertTriangle, Tag, Megaphone } from 'lucide-react-native';

interface ContentQualityBadgesProps {
    isClickbait: boolean;
    isAd: boolean;
    sentiment?: 'positive' | 'neutral' | 'negative' | null;
    className?: string;
}

export const ContentQualityBadges = React.memo(function ContentQualityBadges({ isClickbait, isAd, sentiment, className }: ContentQualityBadgesProps) {
    if (!isClickbait && !isAd && !sentiment) return null;

    return (
        <View className={`flex-row flex-wrap gap-2 mb-4 px-4 ${className}`}>

            {/* Clickbait Warning */}
            {isClickbait && (
                <View className="flex-row items-center gap-1.5 bg-rose-50 dark:bg-rose-900/20 px-2.5 py-1.5 rounded-lg border border-rose-100 dark:border-rose-900/30">
                    <AlertTriangle size={14} color="#e11d48" />
                    <Text className="text-xs font-bold text-rose-600 dark:text-rose-400">
                        Clickbait Şüphesi
                    </Text>
                </View>
            )}

            {/* Ad Label */}
            {isAd && (
                <View className="flex-row items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1.5 rounded-lg border border-amber-100 dark:border-amber-900/30">
                    <Megaphone size={14} color="#d97706" />
                    <Text className="text-xs font-bold text-amber-600 dark:text-amber-500">
                        Sponsorlu İçerik
                    </Text>
                </View>
            )}

            {/* Sentiment Badge */}
            {sentiment && (
                <SentimentBadge value={sentiment} />
            )}

        </View>
    );
});

function SentimentBadge({ value }: { value: string }) {
    let colorClass = 'bg-zinc-100 text-zinc-600 border-zinc-200';
    let label = 'Nötr';
    let iconColor = '#52525b';

    if (value === 'positive') {
        colorClass = 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/30';
        label = 'Olumlu';
        iconColor = '#059669';
    } else if (value === 'negative') {
        colorClass = 'bg-slate-50 border-slate-100 dark:bg-slate-900/20 dark:border-slate-900/30';
        label = 'Olumsuz';
        iconColor = '#475569';
    }

    return (
        <View className={`flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${colorClass}`}>
            <Tag size={14} color={iconColor} />
            <Text className="text-xs font-bold capitalize" style={{ color: iconColor }}>
                {label} Dil
            </Text>
        </View>
    );
}

ContentQualityBadges.displayName = 'ContentQualityBadges';
