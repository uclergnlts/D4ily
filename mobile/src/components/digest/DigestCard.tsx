import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Sun, Moon, ArrowRight } from 'lucide-react-native';

interface DigestCardProps {
    type: 'morning' | 'evening';
    title: string;
    summary: string;
    onPress: () => void;
    disabled?: boolean;
}

export const DigestCard = ({ type, title, summary, onPress, disabled }: DigestCardProps) => {
    const isMorning = type === 'morning';
    const Icon = isMorning ? Sun : Moon;
    const bgColor = isMorning ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-indigo-50 dark:bg-indigo-950/30';
    const borderColor = isMorning ? 'border-amber-200 dark:border-amber-800' : 'border-indigo-200 dark:border-indigo-800';
    const iconColor = isMorning ? '#F59E0B' : '#6366F1';

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.8}
            className={`flex-1 rounded-[20px] p-4 border ${borderColor} ${bgColor} mr-3 last:mr-0 min-h-[180px] justify-between shadow-sm shadow-zinc-200/50 dark:shadow-none`}
            style={{ opacity: disabled ? 0.6 : 1 }}
            accessibilityLabel={`${isMorning ? 'Gündüz' : 'Akşam'} özeti: ${title}`}
            accessibilityRole="button"
            accessibilityHint="Özet detayını aç"
        >
            <View>
                <View className="flex-row items-center justify-between mb-3">
                    <View className="w-8 h-8 rounded-full items-center justify-center bg-surface-light dark:bg-black/20">
                        <Icon size={18} color={iconColor} fill={iconColor} />
                    </View>
                    <Text
                        className="text-body-xs text-zinc-500 uppercase tracking-widest font-bold"
                    >
                        {isMorning ? 'GÜNDÜZ' : 'AKŞAM'}
                    </Text>
                </View>

                <Text
                    className="text-body-lg font-bold text-zinc-900 dark:text-white mb-2 leading-[22px]"
                    numberOfLines={2}
                >
                    {title}
                </Text>

                <Text
                    className="text-body-sm text-zinc-600 dark:text-zinc-400 leading-[20px]"
                    style={{ fontFamily: 'DMSans_400Regular' }}
                    numberOfLines={3}
                >
                    {summary}
                </Text>
            </View>

            <View className="flex-row items-center gap-1 mt-4">
                <Text className="text-[13px]" style={{ color: iconColor, fontFamily: 'DMSans_700Bold' }}>Oku</Text>
                <ArrowRight size={14} color={iconColor} />
            </View>
        </TouchableOpacity>
    );
};
