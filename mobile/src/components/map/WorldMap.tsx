import React, { useCallback } from 'react';
import { View, Text, Pressable, useColorScheme, useWindowDimensions } from 'react-native';
import Svg from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useAllCII } from '../../hooks/useCII';
import { COUNTRIES, MAP_VIEWBOX, THEME } from './mapConstants';
import { COUNTRY_PATHS } from './countryPaths';
import { CountryShape } from './CountryShape';
import { NewsMarker } from './NewsMarker';
import type { NewsLocationData } from '../../api/services/digestService';

export type MapViewMode = 'risk' | 'news';

interface WorldMapProps {
    viewMode: MapViewMode;
    selectedCountry: string | null;
    onCountrySelect: (code: string | null) => void;
    newsLocations?: Record<string, NewsLocationData>;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const SPRING_CONFIG = { damping: 20, stiffness: 200 };

export const WorldMap: React.FC<WorldMapProps> = ({
    viewMode,
    selectedCountry,
    onCountrySelect,
    newsLocations,
}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = isDark ? THEME.dark : THEME.light;
    const { width: screenWidth } = useWindowDimensions();

    const { data: allCII } = useAllCII();

    // Gesture shared values
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    const handleCountryPress = useCallback((code: string) => {
        onCountrySelect(selectedCountry === code ? null : code);
    }, [selectedCountry, onCountrySelect]);

    // Clamp helper
    const clampTranslation = (tx: number, ty: number, s: number) => {
        'worklet';
        const maxTx = ((s - 1) * screenWidth) / 2;
        const maxTy = ((s - 1) * screenWidth) / 4;
        return {
            x: Math.max(-maxTx, Math.min(maxTx, tx)),
            y: Math.max(-maxTy, Math.min(maxTy, ty)),
        };
    };

    // Pinch gesture
    const pinchGesture = Gesture.Pinch()
        .onStart(() => {
            savedScale.value = scale.value;
        })
        .onUpdate((e) => {
            const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, savedScale.value * e.scale));
            scale.value = newScale;
            const clamped = clampTranslation(translateX.value, translateY.value, newScale);
            translateX.value = clamped.x;
            translateY.value = clamped.y;
        })
        .onEnd(() => {
            if (scale.value < MIN_SCALE) {
                scale.value = withSpring(MIN_SCALE, SPRING_CONFIG);
                translateX.value = withSpring(0, SPRING_CONFIG);
                translateY.value = withSpring(0, SPRING_CONFIG);
            }
        });

    // Pan gesture (minDistance prevents intercepting taps)
    const panGesture = Gesture.Pan()
        .minDistance(10)
        .onStart(() => {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        })
        .onUpdate((e) => {
            const clamped = clampTranslation(
                savedTranslateX.value + e.translationX,
                savedTranslateY.value + e.translationY,
                scale.value
            );
            translateX.value = clamped.x;
            translateY.value = clamped.y;
        });

    const combinedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    // Zoom button handlers
    const zoomIn = useCallback(() => {
        const newScale = Math.min(MAX_SCALE, scale.value * 1.5);
        scale.value = withSpring(newScale, SPRING_CONFIG);
    }, [scale]);

    const zoomOut = useCallback(() => {
        const newScale = Math.max(MIN_SCALE, scale.value / 1.5);
        scale.value = withSpring(newScale, SPRING_CONFIG);
        if (newScale <= 1.1) {
            translateX.value = withSpring(0, SPRING_CONFIG);
            translateY.value = withSpring(0, SPRING_CONFIG);
        }
    }, [scale, translateX, translateY]);

    const resetZoom = useCallback(() => {
        scale.value = withSpring(1, SPRING_CONFIG);
        translateX.value = withSpring(0, SPRING_CONFIG);
        translateY.value = withSpring(0, SPRING_CONFIG);
    }, [scale, translateX, translateY]);

    // SVG dimensions
    const svgWidth = screenWidth;
    const aspectRatio = MAP_VIEWBOX.width / MAP_VIEWBOX.height;
    const svgHeight = svgWidth / aspectRatio;

    return (
        <View className="flex-1" style={{ backgroundColor: theme.bg, overflow: 'hidden' }}>
            <GestureDetector gesture={combinedGesture}>
                <Animated.View
                    style={[
                        { flex: 1, justifyContent: 'center', alignItems: 'center' },
                        animatedStyle,
                    ]}
                >
                    <Svg
                        width={svgWidth}
                        height={svgHeight}
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
                                    cii={viewMode === 'risk' ? allCII?.[country.code] : undefined}
                                    isDark={isDark}
                                    isSelected={selectedCountry === country.code}
                                    strokeColor={theme.countryStroke}
                                    onPress={handleCountryPress}
                                />
                            );
                        })}

                        {/* News markers overlay */}
                        {viewMode === 'news' && newsLocations &&
                            COUNTRIES.map((country) => {
                                const loc = newsLocations[country.code];
                                if (!loc) return null;
                                return (
                                    <NewsMarker
                                        key={`marker-${country.code}`}
                                        country={country}
                                        count={loc.digestCount}
                                        isDark={isDark}
                                        isSelected={selectedCountry === country.code}
                                        onPress={handleCountryPress}
                                    />
                                );
                            })
                        }
                    </Svg>
                </Animated.View>
            </GestureDetector>

            {/* Zoom controls */}
            <View className="absolute right-3 bottom-3 gap-1.5">
                <Pressable
                    onPress={zoomIn}
                    className="w-9 h-9 rounded-lg bg-white/90 dark:bg-zinc-800/90 items-center justify-center border border-zinc-200 dark:border-zinc-700"
                    accessibilityLabel="Yakınlaştır"
                >
                    <Text className="text-[18px] font-bold text-zinc-700 dark:text-zinc-200">+</Text>
                </Pressable>
                <Pressable
                    onPress={zoomOut}
                    className="w-9 h-9 rounded-lg bg-white/90 dark:bg-zinc-800/90 items-center justify-center border border-zinc-200 dark:border-zinc-700"
                    accessibilityLabel="Uzaklaştır"
                >
                    <Text className="text-[18px] font-bold text-zinc-700 dark:text-zinc-200">−</Text>
                </Pressable>
                <Pressable
                    onPress={resetZoom}
                    className="w-9 h-9 rounded-lg bg-white/90 dark:bg-zinc-800/90 items-center justify-center border border-zinc-200 dark:border-zinc-700"
                    accessibilityLabel="Sıfırla"
                >
                    <Text className="text-[12px] font-semibold text-zinc-500 dark:text-zinc-400">1:1</Text>
                </Pressable>
            </View>
        </View>
    );
};
