import React from 'react';
import { View, Text } from 'react-native';

interface DigestHeaderProps {
    title: string;
    date: string;
    period: 'morning' | 'evening';
    summary: string;
    className?: string;
}

export const DigestHeader = React.memo(function DigestHeader({ title, date, period, summary, className }: DigestHeaderProps) {
    const dateObj = new Date(date);
    const formattedDate = !isNaN(dateObj.getTime())
        ? dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })
        : date;

    const periodLabel = period === 'morning' ? 'SABAH OZETI' : 'AKSAM OZETI';

    return (
        <View className={`mx-4 mt-2 mb-6 ${className}`}>
            <View className="flex-row justify-between items-start mb-4">
                <Text
                    className="text-[13px] uppercase tracking-widest text-blue-600 dark:text-blue-400 font-bold"
                >
                    {periodLabel}
                </Text>
                <Text className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
                    {formattedDate}
                </Text>
            </View>

            <Text
                className="text-3xl text-zinc-900 dark:text-white mb-4 font-bold leading-tight"
            >
                {title}
            </Text>

            <View className="h-[1px] bg-zinc-100 dark:bg-zinc-800 w-full mb-4" />

            <Text
                className="text-[17px] text-zinc-600 dark:text-zinc-300 leading-[26px]"
            >
                {summary}
            </Text>
        </View>
    );
});

DigestHeader.displayName = 'DigestHeader';
