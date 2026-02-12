import React from 'react';
import { View, Text } from 'react-native';
import { Calendar, Sun, Moon } from 'lucide-react-native';

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

    const isMorning = period === 'morning';
    const periodLabel = isMorning ? 'SABAH ÖZETİ' : 'AKŞAM ÖZETİ';
    const PeriodIcon = isMorning ? Sun : Moon;
    const periodColor = isMorning ? 'text-amber-600' : 'text-indigo-400';
    const periodBg = isMorning ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-indigo-50 dark:bg-indigo-900/20';

    return (
        <View className={`mx-4 p-6 bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800 ${className}`}>
            <View className="flex-row justify-between items-center mb-5">
                <View className={`flex-row items-center gap-2 px-3 py-1.5 rounded-full ${periodBg}`}>
                    <PeriodIcon size={14} color={isMorning ? '#d97706' : '#818cf8'} />
                    <Text
                        className={`text-[10px] uppercase tracking-widest ${periodColor}`}
                        style={{ fontFamily: 'DMSans_900Black' }}
                    >
                        {periodLabel}
                    </Text>
                </View>

                <View className="flex-row items-center gap-1.5 opacity-60">
                    <Calendar size={14} color="#a1a1aa" />
                    <Text
                        className="text-xs text-zinc-500"
                        style={{ fontFamily: 'DMSans_500Medium' }}
                    >
                        {formattedDate}
                    </Text>
                </View>
            </View>

            <Text
                className="text-[28px] text-zinc-900 dark:text-white mb-3"
                style={{ fontFamily: 'Syne_800ExtraBold', letterSpacing: -0.5, lineHeight: 34 }}
                accessibilityRole="header"
            >
                {title}
            </Text>

            <View className="w-12 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full mb-4" />

            <Text
                className="text-[17px] text-zinc-600 dark:text-zinc-300"
                style={{ fontFamily: 'DMSans_400Regular', lineHeight: 26 }}
            >
                {summary}
            </Text>
        </View>
    );
});

DigestHeader.displayName = 'DigestHeader';
