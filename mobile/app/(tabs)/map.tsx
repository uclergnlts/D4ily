import React from 'react';
import { View, Text, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WorldMap } from '../../src/components/map/WorldMap';

export default function MapScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-black" edges={['top']}>
            {/* Header */}
            <View className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-black">
                <Text className="text-[18px] font-bold text-zinc-900 dark:text-white">
                    Dünya Risk Haritası
                </Text>
                <Text className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Ülke risk skorları ve anomali tespiti
                </Text>
            </View>

            {/* Map */}
            <WorldMap />

            {/* Legend */}
            <View className="px-5 py-3 flex-row items-center justify-center gap-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-black">
                <View className="flex-row items-center gap-1.5">
                    <View className="w-3 h-3 rounded-full bg-emerald-500" />
                    <Text className="text-[11px] text-zinc-600 dark:text-zinc-400">Düşük</Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                    <View className="w-3 h-3 rounded-full bg-amber-500" />
                    <Text className="text-[11px] text-zinc-600 dark:text-zinc-400">Orta</Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                    <View className="w-3 h-3 rounded-full bg-red-500" />
                    <Text className="text-[11px] text-zinc-600 dark:text-zinc-400">Yüksek</Text>
                </View>
            </View>
        </SafeAreaView>
    );
}
