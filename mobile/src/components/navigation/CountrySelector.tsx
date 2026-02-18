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
        <View className="relative z-50">
            <TouchableOpacity
                onPress={() => setIsExpanded(!isExpanded)}
                className="flex-row items-center p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800"
                activeOpacity={0.7}
                accessibilityLabel={`Ülke seçici: ${activeCountry.name}`}
                accessibilityRole="button"
                accessibilityHint="Ülke listesini aç"
                accessibilityState={{ expanded: isExpanded }}
            >
                <Text className="text-2xl mr-2">{activeCountry.flag}</Text>
                <ChevronDown
                    size={16}
                    color="#71717a"
                    style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
                />
            </TouchableOpacity>

            {isExpanded && (
                <View className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-xl shadow-black/10 z-50 overflow-hidden">
                    {COUNTRIES.map((country) => (
                        <TouchableOpacity
                            key={country.code}
                            onPress={() => handleSelect(country.code)}
                            className={`flex-row items-center p-3 pl-4 active:bg-zinc-50 dark:active:bg-zinc-800 ${country.code === selectedCountry ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                                }`}
                            accessibilityLabel={`${country.name} seç`}
                            accessibilityRole="button"
                        >
                            <Text className="text-xl mr-3">{country.flag}</Text>
                            <Text
                                className={`text-sm ${country.code === selectedCountry
                                        ? 'text-blue-600 dark:text-blue-400 font-bold'
                                        : 'text-zinc-600 dark:text-zinc-400 font-medium'
                                    }`}
                            >
                                {country.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
};
