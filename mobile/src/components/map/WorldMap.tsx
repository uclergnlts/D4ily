import React, { useState, useCallback } from 'react';
import { View, Text, useColorScheme } from 'react-native';
import Svg from 'react-native-svg';
import { useAllCII } from '../../hooks/useCII';
import { COUNTRIES, MAP_VIEWBOX, THEME } from './mapConstants';
import { COUNTRY_PATHS } from './countryPaths';
import { CountryShape } from './CountryShape';
import { CountryTooltip } from './CountryTooltip';

export const WorldMap: React.FC = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = isDark ? THEME.dark : THEME.light;

    const { data: allCII, isLoading } = useAllCII();
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

    const handleCountryPress = useCallback((code: string) => {
        setSelectedCountry((prev) => (prev === code ? null : code));
    }, []);

    const handleTooltipClose = useCallback(() => {
        setSelectedCountry(null);
    }, []);

    const selectedMeta = COUNTRIES.find((c) => c.code === selectedCountry);

    return (
        <View className="flex-1" style={{ backgroundColor: theme.bg }}>
            <Svg
                width="100%"
                height="100%"
                viewBox={`${MAP_VIEWBOX.x} ${MAP_VIEWBOX.y} ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`}
                preserveAspectRatio="xMidYMid meet"
            >
                {COUNTRIES.map((country) => {
                    const pathData = COUNTRY_PATHS[country.code];
                    if (!pathData) return null;

                    return (
                        <CountryShape
                            key={country.code}
                            country={country}
                            pathData={pathData}
                            cii={allCII?.[country.code]}
                            isDark={isDark}
                            isSelected={selectedCountry === country.code}
                            strokeColor={theme.countryStroke}
                            onPress={handleCountryPress}
                        />
                    );
                })}
            </Svg>

            {selectedMeta && (
                <CountryTooltip
                    country={selectedMeta}
                    cii={allCII?.[selectedMeta.code]}
                    onClose={handleTooltipClose}
                />
            )}

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
