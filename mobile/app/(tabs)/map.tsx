import React, { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { safeBack } from '../../src/utils/navigation';
import { ChevronLeft } from 'lucide-react-native';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Globe } from '../../src/components/map/Globe';
import { CountryTooltip } from '../../src/components/map/CountryTooltip';
import { NewsLocationPanel } from '../../src/components/map/NewsLocationPanel';
import { COUNTRIES } from '../../src/components/map/mapConstants';
import { useAllCII } from '../../src/hooks/useCII';
import { useNewsLocations } from '../../src/hooks/useDigest';
import type { MapViewMode } from '../../src/components/map/WorldMap';
import { useThemeStore } from '../../src/store/useThemeStore';

const DAY_OPTIONS = [3, 7, 14] as const;

export default function MapScreen() {
    const router = useRouter();
    const [viewMode, setViewMode] = useState<MapViewMode>('news');
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
    const [days, setDays] = useState<number>(7);
    const activeScheme = useThemeStore(state => state.activeScheme);
    const isDark = activeScheme === 'dark';

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
        <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark" edges={['top']}>
            {/* Header */}
            <View className="px-5 pt-4 pb-4 flex-row items-center justify-between bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark z-20">
                <TouchableOpacity
                    onPress={() => safeBack(router)}
                    className="w-11 h-11 items-center justify-center rounded-full bg-surface-light-subtle dark:bg-surface-dark-subtle active:scale-95 transition-transform"
                >
                    <ChevronLeft size={24} color={isDark ? '#fff' : '#18181b'} />
                </TouchableOpacity>

                <Text className="text-display-lg font-display-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
                    Dünya Haritası
                </Text>

                <View className="w-11" />
            </View>

            {/* Controls Container */}
            <View className="px-5 py-5 bg-surface-light dark:bg-surface-dark z-10 border-b border-border-light dark:border-border-dark">
                {/* Mode Toggle (Segmented Control) */}
                <View className="flex-row bg-surface-light-subtle dark:bg-surface-dark-subtle p-1.5 rounded-2xl mb-4">
                    <TouchableOpacity
                        onPress={() => { setViewMode('risk'); setSelectedCountry(null); }}
                        className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl ${viewMode === 'risk'
                            ? 'bg-surface-light-elevated dark:bg-surface-dark-elevated shadow-sm shadow-zinc-200/50 dark:shadow-none'
                            : 'bg-transparent'
                            }`}
                    >
                        <Text className={`text-body-sm font-sans-bold ${viewMode === 'risk' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>
                            Risk Skorları
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => { setViewMode('news'); setSelectedCountry(null); }}
                        className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl ${viewMode === 'news'
                            ? 'bg-surface-light-elevated dark:bg-surface-dark-elevated shadow-sm shadow-zinc-200/50 dark:shadow-none'
                            : 'bg-transparent'
                            }`}
                    >
                        <Text className={`text-body-sm font-sans-bold ${viewMode === 'news' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>
                            Haftalık Haberler
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Day selector (news mode only) */}
                {viewMode === 'news' && (
                    <View className="flex-row items-center justify-center gap-3">
                        {DAY_OPTIONS.map((d) => (
                            <TouchableOpacity
                                key={d}
                                onPress={() => setDays(d)}
                                className={`px-5 py-2 rounded-full border ${days === d
                                    ? 'bg-primary border-primary'
                                    : 'bg-surface-light-elevated dark:bg-surface-dark-elevated border-border-light dark:border-border-dark shadow-sm shadow-zinc-200/50 dark:shadow-none'
                                    }`}
                            >
                                <Text
                                    className={`text-body-sm font-sans-bold ${days === d
                                        ? 'text-white'
                                        : 'text-zinc-600 dark:text-zinc-400'
                                        }`}
                                >
                                    Son {d} gün
                                </Text>
                            </TouchableOpacity>
                        ))}
                        {locationsLoading && (
                            <ActivityIndicator size="small" color="#0A66C2" className="ml-2" />
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
                    <View className="px-5 py-4 flex-row items-center justify-center gap-6 border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
                        <View className="flex-row items-center gap-2" accessibilityLabel="Düşük risk">
                            <View className="w-3.5 h-3.5 rounded-full bg-[#10B981] shadow-sm" />
                            <Text className="text-body-sm text-zinc-600 dark:text-zinc-400 font-sans-medium">Düşük</Text>
                        </View>
                        <View className="flex-row items-center gap-2" accessibilityLabel="Orta risk">
                            <View className="w-3.5 h-3.5 rounded-full bg-[#FBBF24] shadow-sm" />
                            <Text className="text-body-sm text-zinc-600 dark:text-zinc-400 font-sans-medium">Orta</Text>
                        </View>
                        <View className="flex-row items-center gap-2" accessibilityLabel="Yüksek risk">
                            <View className="w-3.5 h-3.5 rounded-full bg-[#EF4444] shadow-sm" />
                            <Text className="text-body-sm text-zinc-600 dark:text-zinc-400 font-sans-medium">Yüksek</Text>
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
