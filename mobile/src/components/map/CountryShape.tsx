import React from 'react';
import { Path, G, Text as SvgText, Circle } from 'react-native-svg';
import type { CIIData } from '../../hooks/useCII';
import type { CountryMeta } from './mapConstants';
import { getCIIColor, getCIIFillTint } from './mapConstants';

interface CountryShapeProps {
    country: CountryMeta;
    pathData: string;
    cii?: CIIData;
    isDark: boolean;
    isSelected: boolean;
    strokeColor: string;
    onPress: (code: string) => void;
}

export const CountryShape: React.FC<CountryShapeProps> = ({
    country,
    pathData,
    cii,
    isDark,
    isSelected,
    strokeColor,
    onPress,
}) => {
    const fillColor = getCIIFillTint(cii?.level, isDark);
    const dotColor = getCIIColor(cii?.level);

    return (
        <G onPress={() => onPress(country.code)}>
            <Path
                d={pathData}
                fill={fillColor}
                stroke={isSelected ? dotColor : strokeColor}
                strokeWidth={isSelected ? 0.5 : 0.2}
                strokeLinejoin="round"
            />
            <Circle
                cx={country.labelX}
                cy={country.labelY}
                r={1.4}
                fill={dotColor}
            />
            {cii && (
                <SvgText
                    x={country.labelX}
                    y={country.labelY + 4}
                    textAnchor="middle"
                    fontSize={3}
                    fontWeight="700"
                    fill={isDark ? '#e4e4e7' : '#27272a'}
                >
                    {cii.score}
                </SvgText>
            )}
        </G>
    );
};
