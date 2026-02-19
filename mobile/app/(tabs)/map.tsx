import React, { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Globe } from '../../src/components/map/Globe';
import { CountryTooltip } from '../../src/components/map/CountryTooltip';
import { NewsLocationPanel } from '../../src/components/map/NewsLocationPanel';
import { COUNTRIES } from '../../src/components/map/mapConstants';
import { useAllCII } from '../../src/hooks/useCII';
import { useNewsLocations } from '../../src/hooks/useDigest';
import type { MapViewMode } from '../../src/components/map/WorldMap';

const DAY_OPTIONS = [3, 7, 14] as const;

export default function MapScreen() {
    const router = useRouter();
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
            <View className="px-5 py-4 flex-row items-center justify-between bg-zinc-50 dark:bg-black border-b border-zinc-100 dark:border-zinc-800">
                <Pressable
                    onPress={() => router.back()}
                    className="p-2 -ml-2 rounded-full active:bg-zinc-100 dark:active:bg-zinc-900"
                >
                    <ChevronLeft size={24} color="#18181b" className="dark:text-white" />
                </Pressable>

                <Text className="text-[16px] font-bold text-blue-600">
                    Dünya Haritası
                </Text>

                <View className="w-10" />
            </View>

            {/* Controls Container */}
            <View className="px-5 py-4 bg-zinc-50 dark:bg-black z-10">
                {/* Mode Toggle (Segmented Control) */}
                <View className="flex-row bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl mb-3">
                    <Pressable
                        onPress={() => { setViewMode('risk'); setSelectedCountry(null); }}
                        className={`flex-1 py-2 items-center rounded-lg ${viewMode === 'risk'
                            ? 'bg-white dark:bg-zinc-800 shadow-sm'
                            : 'bg-transparent'
                            }`}
                    >
                        <Text className={`text-[13px] font-semibold ${viewMode === 'risk' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'
                            }`}>
                            Risk Skorları
                        </Text>
                    </Pressable>
                    <Pressable
                        onPress={() => { setViewMode('news'); setSelectedCountry(null); }}
                        className={`flex-1 py-2 items-center rounded-lg ${viewMode === 'news'
                            ? 'bg-white dark:bg-zinc-800 shadow-sm'
                            : 'bg-transparent'
                            }`}
                    >
                        <Text className={`text-[13px] font-semibold ${viewMode === 'news' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'
                            }`}>
                            Haftalık Haberler
                        </Text>
                    </Pressable>
                </View>

                {/* Day selector (news mode only) */}
                {viewMode === 'news' && (
                    <View className="flex-row items-center justify-center gap-2">
                        {DAY_OPTIONS.map((d) => (
                            <Pressable
                                key={d}
                                onPress={() => setDays(d)}
                                className={`px-4 py-1.5 rounded-full border ${days === d
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                                    }`}
                            >
                                <Text
                                    className={`text-[12px] font-medium ${days === d
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : 'text-zinc-500 dark:text-zinc-400'
                                        }`}
                                >
                                    Son {d} gün
                                </Text>
                            </Pressable>
                        ))}
                        {locationsLoading && (
                            <ActivityIndicator size="small" color="#2563eb" className="ml-2" />
                        )}
                    </View>
                )}
            </View>


            {/* Map */}
            <Globe
                viewMode={viewMode}
                selectedCountry={selectedCountry}
                onCountrySelect={handleCountrySelect}
                newsLocations={newsLocations}
                isDark={true} // Globe looks best in dark mode style
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
