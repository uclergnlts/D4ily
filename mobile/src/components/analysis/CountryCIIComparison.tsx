import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Globe } from 'lucide-react-native';
import type { CIIData } from '../../hooks/useCII';


const COUNTRY_INFO: Record<string, { flag: string; name: string }> = {
    tr: { flag: '🇹🇷', name: 'Türkiye' },
    us: { flag: '🇺🇸', name: 'ABD' },
    de: { flag: '🇩🇪', name: 'Almanya' },
    uk: { flag: '🇬🇧', name: 'İngiltere' },
    fr: { flag: '🇫🇷', name: 'Fransa' },
    es: { flag: '🇪🇸', name: 'İspanya' },
    it: { flag: '🇮🇹', name: 'İtalya' },
    ru: { flag: '🇷🇺', name: 'Rusya' },
};

function getColor(score: number) {
    if (score < 30) return '#10b981';
    if (score < 60) return '#f59e0b';
    return '#ef4444';
}

function CountryBar({ country, data, maxScore, index, isSelected }: {
    country: string;
    data: CIIData;
    maxScore: number;
    index: number;
    isSelected: boolean;
}) {
    const width = useSharedValue(0);
    const pct = maxScore > 0 ? (data.score / maxScore) * 100 : 0;
    const color = getColor(data.score);
    const info = COUNTRY_INFO[country] || { flag: '🏳️', name: country.toUpperCase() };

    useEffect(() => {
        width.value = withDelay(index * 80, withTiming(Math.max(8, pct), { duration: 600 }));
    }, [pct, index, width]);

    const animatedStyle = useAnimatedStyle(() => ({
        width: `${width.value}%`,
    }));

    return (
        <View className={`flex-row items-center mb-2.5 ${isSelected ? 'opacity-100' : 'opacity-70'}`}>
            <View className="w-16 flex-row items-center gap-1">
                <Text className="text-base">{info.flag}</Text>
                <Text
                    className="text-[11px] text-zinc-600 dark:text-zinc-400"
                    style={{ fontFamily: isSelected ? 'DMSans_700Bold' : 'DMSans_500Medium' }}
                    numberOfLines={1}
                >
                    {info.name}
                </Text>
            </View>
            <View className="flex-1 h-5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mx-2">
                <Animated.View
                    className="h-full rounded-full items-end justify-center pr-2"
                    style={[animatedStyle, { backgroundColor: color }]}
                >
                    <Text
                        className="text-[10px] text-white"
                        style={{ fontFamily: 'DMSans_700Bold' }}
                    >
                        {data.score}
                    </Text>
                </Animated.View>
            </View>
            {data.anomaly && data.anomaly.level !== 'NORMAL' && (
                <View className="w-4 h-4 rounded-full bg-red-100 dark:bg-red-900/30 items-center justify-center">
                    <Text className="text-[8px]">⚠️</Text>
                </View>
            )}
        </View>
    );
}

interface CountryCIIComparisonProps {
    allCII: Record<string, CIIData>;
    selectedCountry: string;
    className?: string;
}

export function CountryCIIComparison({ allCII, selectedCountry, className }: CountryCIIComparisonProps) {
    const entries = Object.entries(allCII)
        .sort(([, a], [, b]) => b.score - a.score);

    if (entries.length === 0) return null;

    const maxScore = Math.max(...entries.map(([, d]) => d.score), 1);

    return (
        <View className={`bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4 ${className || ''}`}>
            <View className="flex-row items-center gap-2 mb-4">
                <Globe size={16} color="#006FFF" />
                <Text
                    className="text-sm text-zinc-900 dark:text-white"
                    style={{ fontFamily: 'DMSans_700Bold' }}
                >
                    Ülke Karşılaştırması
                </Text>
            </View>

            {entries.map(([country, data], i) => (
                <CountryBar
                    key={country}
                    country={country}
                    data={data}
                    maxScore={maxScore}
                    index={i}
                    isSelected={country === selectedCountry}
                />
            ))}

            <View className="flex-row justify-between mt-2 px-16">
                <View className="flex-row items-center gap-1">
                    <View className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} />
                    <Text className="text-[10px] text-zinc-400" style={{ fontFamily: 'DMSans_400Regular' }}>Sakin</Text>
                </View>
                <View className="flex-row items-center gap-1">
                    <View className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
                    <Text className="text-[10px] text-zinc-400" style={{ fontFamily: 'DMSans_400Regular' }}>Hareketli</Text>
                </View>
                <View className="flex-row items-center gap-1">
                    <View className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ef4444' }} />
                    <Text className="text-[10px] text-zinc-400" style={{ fontFamily: 'DMSans_400Regular' }}>Gergin</Text>
                </View>
            </View>
        </View>
    );
}
