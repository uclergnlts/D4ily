import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Newspaper, ArrowRight } from 'lucide-react-native';

interface DigestCardProps {
    title: string;
    summary: string;
    onPress: () => void;
    disabled?: boolean;
}

export const DigestCard = ({ title, summary, onPress, disabled }: DigestCardProps) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.8}
            className="flex-1 rounded-[20px] p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 min-h-[180px] justify-between shadow-sm shadow-zinc-200/50 dark:shadow-none"
            style={{ opacity: disabled ? 0.6 : 1 }}
            accessibilityLabel={`Günün özeti: ${title}`}
            accessibilityRole="button"
            accessibilityHint="Özet detayını aç"
        >
            <View>
                <View className="flex-row items-center justify-between mb-3">
                    <View className="w-8 h-8 rounded-full items-center justify-center bg-primary-50 dark:bg-primary-900/30">
                        <Newspaper size={18} color="#006FFF" />
                    </View>
                    <Text
                        className="text-body-xs text-zinc-500 uppercase tracking-widest font-bold"
                    >
                        GÜNÜN ÖZETİ
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
                <Text className="text-[13px]" style={{ color: '#006FFF', fontFamily: 'DMSans_700Bold' }}>Oku</Text>
                <ArrowRight size={14} color="#006FFF" />
            </View>
        </TouchableOpacity>
    );
};
