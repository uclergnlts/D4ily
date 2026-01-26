import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { useAppStore, CountryCode } from '../../store/useAppStore';

const COUNTRIES: { code: CountryCode; name: string; flag: string }[] = [
    { code: 'tr', name: 'Türkiye', flag: '🇹🇷' },
    { code: 'us', name: 'United States', flag: '🇺🇸' },
    { code: 'uk', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'de', name: 'Deutschland', flag: '🇩🇪' },
    { code: 'fr', name: 'France', flag: '🇫🇷' },
    { code: 'es', name: 'España', flag: '🇪🇸' },
    { code: 'it', name: 'Italia', flag: '🇮🇹' },
    { code: 'ru', name: 'Russia', flag: '🇷🇺' },
];

export const CountrySelector = () => {
    const { selectedCountry, setSelectedCountry } = useAppStore();
    const [isExpanded, setIsExpanded] = React.useState(false);

    const activeCountry = COUNTRIES.find(c => c.code === selectedCountry) || COUNTRIES[0];

    const handleSelect = (code: CountryCode) => {
        setSelectedCountry(code);
        setIsExpanded(false);
    };

    return (
        <View className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl overflow-hidden border border-zinc-100 dark:border-zinc-800">
            {/* Header / Trigger */}
            <TouchableOpacity
                onPress={() => setIsExpanded(!isExpanded)}
                className="flex-row items-center justify-between p-3"
                activeOpacity={0.7}
            >
                <View className="flex-row items-center">
                    <Text className="text-2xl mr-3">{activeCountry.flag}</Text>
                    <Text className="text-base font-bold text-zinc-900 dark:text-white">
                        {activeCountry.name}
                    </Text>
                </View>
                <ChevronDown
                    size={20}
                    color="#71717a"
                    style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
                />
            </TouchableOpacity>

            {/* Expanded List */}
            {isExpanded && (
                <View className="border-t border-zinc-200 dark:border-zinc-700">
                    {COUNTRIES.map((country) => {
                        if (country.code === selectedCountry) return null; // Skip active
                        return (
                            <TouchableOpacity
                                key={country.code}
                                onPress={() => handleSelect(country.code)}
                                className="flex-row items-center p-3 pl-4 active:bg-zinc-100 dark:active:bg-zinc-700/50"
                            >
                                <Text className="text-xl mr-3">{country.flag}</Text>
                                <Text className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                    {country.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}
        </View>
    );
};
