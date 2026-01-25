import React from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { ChevronDown, Globe, Check } from 'lucide-react-native';
import { useAppStore, CountryCode } from '../../store/useAppStore';

const COUNTRIES: { code: CountryCode; name: string; flag: string }[] = [
    { code: 'tr', name: 'Türkiye', flag: '🇹🇷' },
    { code: 'us', name: 'USA', flag: '🇺🇸' },
    { code: 'de', name: 'Germany', flag: '🇩🇪' },
    { code: 'uk', name: 'UK', flag: '🇬🇧' },
    { code: 'fr', name: 'France', flag: '🇫🇷' },
];

export const CountrySelector = () => {
    const { selectedCountry, setSelectedCountry } = useAppStore();
    const [isVisible, setIsVisible] = React.useState(false);

    const activeCountry = COUNTRIES.find(c => c.code === selectedCountry) || COUNTRIES[0];

    const handleSelect = (code: CountryCode) => {
        setSelectedCountry(code);
        setIsVisible(false);
    };

    return (
        <>
            <TouchableOpacity
                onPress={() => setIsVisible(true)}
                className="flex-row items-center bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700"
            >
                <Text className="text-base mr-2">{activeCountry.flag}</Text>
                <Text className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mr-1 uppercase">
                    {activeCountry.code}
                </Text>
                <ChevronDown size={14} color="#71717a" />
            </TouchableOpacity>

            <Modal
                visible={isVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsVisible(false)}
            >
                <TouchableOpacity
                    className="flex-1 bg-black/50 justify-center items-center"
                    activeOpacity={1}
                    onPress={() => setIsVisible(false)}
                >
                    <View className="bg-white dark:bg-zinc-900 w-3/4 rounded-2xl overflow-hidden shadow-xl">
                        <View className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                            <Text className="font-bold text-lg text-zinc-900 dark:text-white text-center">
                                Ülke Seçimi
                            </Text>
                        </View>
                        {COUNTRIES.map((country) => (
                            <TouchableOpacity
                                key={country.code}
                                onPress={() => handleSelect(country.code)}
                                className="flex-row items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800 active:bg-zinc-50 dark:active:bg-zinc-800"
                            >
                                <View className="flex-row items-center">
                                    <Text className="text-2xl mr-3">{country.flag}</Text>
                                    <Text className={`font-medium ${selectedCountry === country.code ? 'text-primary' : 'text-zinc-900 dark:text-white'}`}>
                                        {country.name}
                                    </Text>
                                </View>
                                {selectedCountry === country.code && (
                                    <Check size={20} color="#006FFF" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
};
