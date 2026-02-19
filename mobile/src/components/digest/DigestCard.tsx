import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowRight } from 'lucide-react-native';

interface DigestCardProps {
    title: string;
    summary: string;
    date: string;
    onPress: () => void;
    disabled?: boolean;
    isFeatured?: boolean;
    isNew?: boolean;
}

export const DigestCard = ({ title, summary, date, onPress, disabled, isFeatured = false, isNew = false }: DigestCardProps) => {
    // Parse date to get day name (e.g., "Perşembe")
    const dateObj = new Date(date);
    const dayName = dateObj.toLocaleDateString('tr-TR', { weekday: 'long' });
    const formattedDate = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.8}
            className={`w-full rounded-[32px] p-5 mb-4 border bg-white dark:bg-zinc-900 ${isFeatured
                ? 'border-blue-500 dark:border-blue-500 shadow-md shadow-blue-100 dark:shadow-blue-900/20'
                : 'border-blue-200 dark:border-zinc-800'
                }`}
            style={{ opacity: disabled ? 0.6 : 1 }}
            accessibilityLabel={`${formattedDate} Özeti`}
            accessibilityRole="button"
        >
            <View className="flex-row justify-between items-start mb-2">
                {isFeatured && isNew ? (
                    <View className="bg-red-500 rounded-full px-3 py-1">
                        <Text className="text-white text-xs font-bold">Yeni</Text>
                    </View>
                ) : (
                    <Text className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
                        {dayName}
                    </Text>
                )}

                {isFeatured && (
                    <Text className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
                        {dayName}
                    </Text>
                )}
            </View>

            <Text className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                {formattedDate} Özeti
            </Text>

            {isFeatured && (
                <Text
                    className="text-zinc-500 dark:text-zinc-400 text-sm leading-5 mb-4"
                    numberOfLines={4}
                >
                    {summary}
                </Text>
            )}

            <View className="flex-row items-center gap-1 mt-2">
                <Text className="text-blue-500 font-bold text-sm">Oku</Text>
                <ArrowRight size={16} color="#3b82f6" />
            </View>
        </TouchableOpacity>
    );
};
