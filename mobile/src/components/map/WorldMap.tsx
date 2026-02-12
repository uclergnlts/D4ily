import React, { useMemo } from 'react';
import { View, Text, Platform } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { useAllCII } from '../../hooks/useCII';
import { useLatestDigest } from '../../hooks/useDigest';
import type { CIIData } from '../../hooks/useCII';

interface CountryPin {
    code: string;
    name: string;
    flag: string;
    latitude: number;
    longitude: number;
}

const COUNTRY_PINS: CountryPin[] = [
    { code: 'tr', name: 'Türkiye', flag: '🇹🇷', latitude: 39.9334, longitude: 32.8597 },
    { code: 'us', name: 'ABD', flag: '🇺🇸', latitude: 38.9072, longitude: -77.0369 },
    { code: 'uk', name: 'Birleşik Krallık', flag: '🇬🇧', latitude: 51.5074, longitude: -0.1278 },
    { code: 'de', name: 'Almanya', flag: '🇩🇪', latitude: 52.5200, longitude: 13.4050 },
    { code: 'fr', name: 'Fransa', flag: '🇫🇷', latitude: 48.8566, longitude: 2.3522 },
    { code: 'es', name: 'İspanya', flag: '🇪🇸', latitude: 40.4168, longitude: -3.7038 },
    { code: 'it', name: 'İtalya', flag: '🇮🇹', latitude: 41.9028, longitude: 12.4964 },
    { code: 'ru', name: 'Rusya', flag: '🇷🇺', latitude: 55.7558, longitude: 37.6173 },
];

function getCIIColor(cii?: CIIData): string {
    if (!cii) return '#a1a1aa';
    if (cii.level === 'low') return '#10b981';
    if (cii.level === 'medium') return '#f59e0b';
    return '#ef4444';
}

function getAnomalyText(cii?: CIIData): string | null {
    if (!cii?.anomaly || cii.anomaly.level === 'NORMAL') return null;
    const labels: Record<string, string> = {
        ELEVATED: 'Yükselen',
        HIGH: 'Yüksek',
        CRITICAL: 'Kritik',
    };
    return `${labels[cii.anomaly.level]} (${cii.anomaly.zScore}x)`;
}

function CountryCallout({ pin, cii }: { pin: CountryPin; cii?: CIIData }) {
    const anomalyText = getAnomalyText(cii);

    return (
        <View className="bg-white dark:bg-zinc-900 rounded-xl p-3 min-w-[180px]">
            <View className="flex-row items-center gap-2 mb-2">
                <Text className="text-lg">{pin.flag}</Text>
                <Text className="text-[15px] font-bold text-zinc-900 dark:text-white">{pin.name}</Text>
            </View>

            {cii ? (
                <>
                    <View className="flex-row items-center gap-2 mb-1">
                        <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getCIIColor(cii) }} />
                        <Text className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300">
                            Risk: {cii.score}/100
                        </Text>
                    </View>
                    <Text className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Son 24s: {cii.articleCount24h} haber
                    </Text>
                    {anomalyText && (
                        <Text className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1">
                            Anomali: {anomalyText}
                        </Text>
                    )}
                </>
            ) : (
                <Text className="text-[12px] text-zinc-400">Veri yükleniyor...</Text>
            )}
        </View>
    );
}

export const WorldMap: React.FC = () => {
    const { data: allCII, isLoading } = useAllCII();

    const initialRegion = useMemo(() => ({
        latitude: 40,
        longitude: 15,
        latitudeDelta: 60,
        longitudeDelta: 80,
    }), []);

    return (
        <View className="flex-1">
            <MapView
                style={{ flex: 1 }}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                initialRegion={initialRegion}
                mapType="standard"
            >
                {COUNTRY_PINS.map((pin) => {
                    const cii = allCII?.[pin.code];
                    const color = getCIIColor(cii);

                    return (
                        <Marker
                            key={pin.code}
                            coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
                            pinColor={color}
                            title={pin.name}
                        >
                            <View className="items-center">
                                <View
                                    className="w-8 h-8 rounded-full items-center justify-center border-2 border-white shadow-md"
                                    style={{ backgroundColor: color }}
                                >
                                    <Text className="text-[14px]">{pin.flag}</Text>
                                </View>
                                {cii && (
                                    <View className="mt-0.5 px-1.5 py-0.5 rounded-md" style={{ backgroundColor: color }}>
                                        <Text className="text-[9px] font-bold text-white">{cii.score}</Text>
                                    </View>
                                )}
                            </View>
                            <Callout tooltip>
                                <CountryCallout pin={pin} cii={cii} />
                            </Callout>
                        </Marker>
                    );
                })}
            </MapView>

            {isLoading && (
                <View className="absolute top-4 left-0 right-0 items-center">
                    <View className="bg-white/90 dark:bg-zinc-900/90 px-4 py-2 rounded-full">
                        <Text className="text-[12px] font-medium text-zinc-600 dark:text-zinc-400">
                            Risk verileri yükleniyor...
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
};
