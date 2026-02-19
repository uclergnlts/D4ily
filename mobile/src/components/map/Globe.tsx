import React, { useCallback, useMemo, useState } from 'react';
import { View, useWindowDimensions, Text } from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { geoOrthographic, geoPath, geoGraticule } from 'd3-geo';
import { WORLD_GEOJSON } from './worldGeoJson';
import { useAllCII } from '../../hooks/useCII';
import { getCIIFillTint, COUNTRIES } from './mapConstants';
import type { MapViewMode } from './WorldMap';
import type { NewsLocationData } from '../../api/services/digestService';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';

interface GlobeProps {
    viewMode: MapViewMode;
    selectedCountry: string | null;
    onCountrySelect: (code: string | null) => void;
    newsLocations?: Record<string, NewsLocationData>;
    isDark?: boolean;
}

export const Globe: React.FC<GlobeProps> = ({
    viewMode,
    selectedCountry,
    onCountrySelect,
    newsLocations,
    isDark = false,
}) => {
    const { width } = useWindowDimensions();
    const size = width - 40;
    const { data: allCII } = useAllCII();

    // Initial Rotation
    const [rotation, setRotation] = useState<[number, number, number]>([-35, -40, 0]);

    // Shared Values for Gestures (Must be declared at top level)
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const rotationSv = useSharedValue<[number, number, number]>([-35, -40, 0]);
    const startRotationSv = useSharedValue<[number, number, number]>([-35, -40, 0]);

    // Gesture Handler
    const panGesture = Gesture.Pan()
        .onStart(() => {
            startRotationSv.value = rotationSv.value;
        })
        .onUpdate((e) => {
            // Sensitivity
            const sensitivity = 0.5;
            const newRot: [number, number, number] = [
                startRotationSv.value[0] + e.translationX * sensitivity,
                startRotationSv.value[1] - e.translationY * sensitivity,
                startRotationSv.value[2]
            ];
            rotationSv.value = newRot;
            runOnJS(setRotation)(newRot);
        });

    const pinchGesture = Gesture.Pinch()
        .onStart(() => {
            savedScale.value = scale.value;
        })
        .onUpdate((e) => {
            scale.value = savedScale.value * e.scale;
        })
        .onEnd(() => {
            if (scale.value < 1) withSpring(scale.value = 1);
            else if (scale.value > 2) withSpring(scale.value = 2);
        });

    const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

    // Helper for Important Countries
    const importantCodes = useMemo(() => new Set(COUNTRIES.map(c => c.code)), []);

    // Projection & Path Generator
    const { paths, graticulePath } = useMemo(() => {
        const projection = geoOrthographic()
            .fitSize([size, size], { type: 'Sphere' })
            .rotate(rotation);

        const pathGenerator = geoPath().projection(projection);
        const features = WORLD_GEOJSON.features.map(f => {
            const d = pathGenerator(f as any);
            return {
                feature: f,
                d: d || ''
            };
        });

        const graticule = geoGraticule()();
        return {
            paths: features,
            graticulePath: pathGenerator(graticule) || ''
        };
    }, [rotation, size]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    const handlePress = useCallback((code: string) => {
        onCountrySelect(selectedCountry === code ? null : code);
    }, [selectedCountry, onCountrySelect]);

    return (
        <View className="flex-1 items-center justify-center bg-black overflow-hidden relative">
            <GestureDetector gesture={composedGesture}>
                <Animated.View style={[{ width: size, height: size }, animatedStyle]}>
                    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>

                        {/* 1. Ocean Background (Solid Color) */}
                        <Circle cx={size / 2} cy={size / 2} r={size / 2 - 1} fill="#0f172a" />

                        {/* 2. Graticule Lines (Subtle) */}
                        <Path
                            d={graticulePath}
                            fill="none"
                            stroke="#334155" // Slate-700
                            strokeWidth="0.5"
                            opacity={0.5}
                        />

                        {/* 3. Countries */}
                        {paths.map(({ feature, d }) => {
                            if (!d) return null;

                            const cii = allCII?.[feature.id];
                            const isSelected = selectedCountry === feature.id;
                            const isImportant = importantCodes.has(feature.id);

                            // Default Colors
                            // Important countries: Visible Gray (#64748b)
                            // Others: Darker Slate (#1e293b) to blend with ocean but still be visible
                            let fill = isImportant ? '#64748b' : '#1e293b';
                            let stroke = isImportant ? '#94a3b8' : '#334155';
                            let strokeWidth = isImportant ? 0.5 : 0.25;

                            if (viewMode === 'risk' && cii) {
                                fill = getCIIFillTint(cii.level, true);
                            } else if (viewMode === 'news' && newsLocations?.[feature.id]) {
                                const count = newsLocations[feature.id].digestCount || 0;
                                fill = count > 0 ? '#4f46e5' : fill;
                            }

                            if (isSelected) {
                                stroke = '#ffffff';
                                strokeWidth = 1.5;
                                fill = viewMode === 'news' ? '#6366f1' : fill;
                            }

                            return (
                                <G key={feature.id} onPress={() => handlePress(feature.id)}>
                                    <Path
                                        d={d}
                                        fill={fill}
                                        stroke={stroke}
                                        strokeWidth={strokeWidth}
                                    />
                                </G>
                            );
                        })}

                        {/* 4. Atmosphere Glow (Stroke Only) */}
                        <Circle
                            cx={size / 2}
                            cy={size / 2}
                            r={size / 2}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="2"
                            strokeOpacity={0.3}
                            pointerEvents="none"
                        />
                    </Svg>
                </Animated.View>
            </GestureDetector>

            <View className="absolute bottom-6 pointer-events-none">
                <Text className="text-zinc-500 text-[10px] text-center font-medium opacity-60">
                    DÜNYAYI DÖNDÜRMEK İÇİN KAYDIRIN
                </Text>
            </View>
        </View>
    );
};
