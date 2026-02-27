import React from 'react';
import { View, Text } from 'react-native';
import { formatDigestDate } from '../../utils/digestDate';

interface DigestHeaderProps {
    title: string;
    date: string;
    summary: string;
    className?: string;
}

export const DigestHeader = React.memo(function DigestHeader({ title, date, summary, className }: DigestHeaderProps) {
    const formattedDate = formatDigestDate(date, { day: 'numeric', month: 'long', weekday: 'long' });

    const periodLabel = 'GÜNLÜK ÖZET';

    return (
        <View className={`mx-5 mt-4 mb-8 ${className}`}>
            <View className="flex-row justify-between items-center mb-5">
                <View className="px-3 py-1.5 bg-primary-50 dark:bg-primary-900/30 rounded-full">
                    <Text
                        className="text-body-xs uppercase tracking-widest text-primary-700 dark:text-primary-300 font-sans-bold"
                    >
                        {periodLabel}
                    </Text>
                </View>
                <Text className="text-zinc-500 dark:text-zinc-400 text-body-sm font-sans-medium">
                    {formattedDate}
                </Text>
            </View>

            <Text
                className="text-display-2xl text-zinc-900 dark:text-white mb-6 font-sans-black tracking-tight leading-[42px]"
            >
                {title}
            </Text>

            <View className="h-[1px] bg-border-light dark:bg-border-dark w-12 mb-6" />

            <View className="gap-3">
                {summary.split('\n').map((line, index) => {
                    const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*');
                    const cleanLine = line.trim().replace(/^[•\-\*]\s*/, '');

                    if (!cleanLine) return null;

                    return (
                        <View key={index} className="flex-row items-start gap-2">
                            {isBullet && (
                                <View className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2.5 shrink-0" />
                            )}
                            <Text className={`text-[17px] text-zinc-600 dark:text-zinc-300 leading-[26px] ${isBullet ? 'flex-1' : ''}`}>
                                {cleanLine}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
});

DigestHeader.displayName = 'DigestHeader';
