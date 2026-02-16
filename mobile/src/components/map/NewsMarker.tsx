import React from 'react';
import { G, Circle, Text as SvgText } from 'react-native-svg';
import type { CountryMeta } from './mapConstants';
import { MARKER_THEME } from './mapConstants';

interface NewsMarkerProps {
    country: CountryMeta;
    count: number;
    isDark: boolean;
    isSelected: boolean;
    onPress: (code: string) => void;
}

export const NewsMarker: React.FC<NewsMarkerProps> = ({
    country,
    count,
    isDark,
    isSelected,
    onPress,
}) => {
    if (count === 0) return null;

    const theme = isDark ? MARKER_THEME.dark : MARKER_THEME.light;
    const cx = country.labelX;
    const cy = country.labelY - 5;
    const bg = isSelected ? theme.selectedBg : theme.bg;
    const ring = isSelected ? theme.selectedRing : theme.ring;
    const radius = 2.8;

    return (
        <G onPress={() => onPress(country.code)}>
            {/* Outer ring */}
            <Circle
                cx={cx}
                cy={cy}
                r={radius + 1}
                fill={ring}
                opacity={isSelected ? 0.5 : 0.3}
            />
            {/* Main circle */}
            <Circle
                cx={cx}
                cy={cy}
                r={radius}
                fill={bg}
            />
            {/* Count text */}
            <SvgText
                x={cx}
                y={cy + 1.2}
                textAnchor="middle"
                fontSize={2.8}
                fontWeight="800"
                fill={theme.text}
            >
                {count}
            </SvgText>
        </G>
    );
};
