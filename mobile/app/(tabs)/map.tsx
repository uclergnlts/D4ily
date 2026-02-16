import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WorldMap } from '../../src/components/map/WorldMap';
import { CountryTooltip } from '../../src/components/map/CountryTooltip';
import { NewsLocationPanel } from '../../src/components/map/NewsLocationPanel';
import { COUNTRIES } from '../../src/components/map/mapConstants';
import { useAllCII } from '../../src/hooks/useCII';
import { useNewsLocations } from '../../src/hooks/useDigest';
import type { MapViewMode } from '../../src/components/map/WorldMap';

const DAY_OPTIONS = [3, 7, 14] as const;

export default function MapScreen() {
    const [viewMode, setViewMode] = useState<MapViewMode>('news');
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
    const [days, setDays] = useState<number>(7);

    const { data: allCII } = useAllCII();
    const { data: newsLocations, isLoading: locationsLoading } = useNewsLocations(days);

    const selectedMeta = COUNTRIES.find((c) => c.code === selectedCountry);

    const handleCountrySelect = useCallback((code: string | null) => {
        setSelectedCountry(code);
    }, []);

    const handlePanelClose = useCallback(() => {
        setSelectedCountry(null);
    }, []);

    return (
        <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-black" edges={['top']}>
            {/* Header */}
            <View className="px-5 pt-3 pb-2 bg-zinc-50 dark:bg-black">
                <Text
                    className="text-[18px] text-zinc-900 dark:text-white"
                    style={{ fontFamily: 'Syne_700Bold', letterSpacing: -0.3 }}
                    accessibilityRole="header"
                >
                    Dünya Haritası
                </Text>

                {/* Mode toggle */}
                <View className="flex-row mt-2 gap-2">
                    <Pressable
                        onPress={() => { setViewMode('risk'); setSelectedCountry(null); }}
                        className={`px-3 py-1.5 rounded-full border ${
                            viewMode === 'risk'
                                ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white'
                                : 'bg-transparent border-zinc-300 dark:border-zinc-600'
                        }`}
                    >
                        <Text
                            className={`text-[12px] ${
                                viewMode === 'risk'
                                    ? 'text-white dark:text-black'
                                    : 'text-zinc-600 dark:text-zinc-400'
                            }`}
                            style={{ fontFamily: 'DMSans_600SemiBold' }}
                        >
                            Risk Skorları
                        </Text>
                    </Pressable>
                    <Pressable
                        onPress={() => { setViewMode('news'); setSelectedCountry(null); }}
                        className={`px-3 py-1.5 rounded-full border ${
                            viewMode === 'news'
                                ? 'bg-indigo-600 dark:bg-indigo-500 border-indigo-600 dark:border-indigo-500'
                                : 'bg-transparent border-zinc-300 dark:border-zinc-600'
                        }`}
                    >
                        <Text
                            className={`text-[12px] ${
                                viewMode === 'news'
                                    ? 'text-white'
                                    : 'text-zinc-600 dark:text-zinc-400'
                            }`}
                            style={{ fontFamily: 'DMSans_600SemiBold' }}
                        >
                            Haftalık Haberler
                        </Text>
                    </Pressable>
                </View>

                {/* Day selector (news mode only) */}
                {viewMode === 'news' && (
                    <View className="flex-row mt-2 gap-1.5 items-center">
                        <Text
                            className="text-[11px] text-zinc-500 dark:text-zinc-400 mr-1"
                            style={{ fontFamily: 'DMSans_400Regular' }}
                        >
                            Son:
                        </Text>
                        {DAY_OPTIONS.map((d) => (
                            <Pressable
                                key={d}
                                onPress={() => setDays(d)}
                                className={`px-2.5 py-1 rounded-md ${
                                    days === d
                                        ? 'bg-indigo-100 dark:bg-indigo-900/40'
                                        : 'bg-zinc-100 dark:bg-zinc-800'
                                }`}
                            >
                                <Text
                                    className={`text-[11px] ${
                                        days === d
                                            ? 'text-indigo-700 dark:text-indigo-300'
                                            : 'text-zinc-500 dark:text-zinc-400'
                                    }`}
                                    style={{ fontFamily: 'DMSans_600SemiBold' }}
                                >
                                    {d} gün
                                </Text>
                            </Pressable>
                        ))}
                        {locationsLoading && (
                            <ActivityIndicator size="small" color="#6366f1" style={{ marginLeft: 4 }} />
                        )}
                    </View>
                )}
            </View>

            {/* Map */}
            <WorldMap
                viewMode={viewMode}
                selectedCountry={selectedCountry}
                onCountrySelect={handleCountrySelect}
                newsLocations={newsLocations}
            />

            {/* Bottom panels */}
            {viewMode === 'risk' && (
                <>
                    {/* Risk legend */}
                    <View className="px-5 py-3 flex-row items-center justify-center gap-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-black">
                        <View className="flex-row items-center gap-1.5" accessibilityLabel="Düşük risk">
                            <View className="w-3 h-3 rounded-full bg-emerald-500" />
                            <Text className="text-[11px] text-zinc-600 dark:text-zinc-400" style={{ fontFamily: 'DMSans_500Medium' }}>Düşük</Text>
                        </View>
                        <View className="flex-row items-center gap-1.5" accessibilityLabel="Orta risk">
                            <View className="w-3 h-3 rounded-full bg-amber-500" />
                            <Text className="text-[11px] text-zinc-600 dark:text-zinc-400" style={{ fontFamily: 'DMSans_500Medium' }}>Orta</Text>
                        </View>
                        <View className="flex-row items-center gap-1.5" accessibilityLabel="Yüksek risk">
                            <View className="w-3 h-3 rounded-full bg-red-500" />
                            <Text className="text-[11px] text-zinc-600 dark:text-zinc-400" style={{ fontFamily: 'DMSans_500Medium' }}>Yüksek</Text>
                        </View>
                    </View>

                    {/* Risk tooltip */}
                    {selectedMeta && (
                        <CountryTooltip
                            country={selectedMeta}
                            cii={allCII?.[selectedMeta.code]}
                            onClose={handlePanelClose}
                        />
                    )}
                </>
            )}

            {viewMode === 'news' && selectedMeta && newsLocations?.[selectedMeta.code] && (
                <NewsLocationPanel
                    country={selectedMeta}
                    locationData={newsLocations[selectedMeta.code]}
                    onClose={handlePanelClose}
                />
            )}
        </SafeAreaView>
    );
}
