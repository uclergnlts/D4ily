import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, Pressable, Modal } from 'react-native';
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

export const CountrySelector = React.memo(() => {
    const { selectedCountry, setSelectedCountry } = useAppStore();
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [buttonLayout, setButtonLayout] = React.useState({ x: 0, y: 0, width: 0, height: 0 });
    const buttonRef = React.useRef<View>(null);

    const activeCountry = COUNTRIES.find(c => c.code === selectedCountry) || COUNTRIES[0];

    const handleSelect = useCallback((code: CountryCode) => {
        setSelectedCountry(code);
        setIsExpanded(false);
    }, [setSelectedCountry]);

    const openDropdown = useCallback(() => {
        buttonRef.current?.measureInWindow((x, y, width, height) => {
            setButtonLayout({ x, y, width, height });
            setIsExpanded(true);
        });
    }, []);

    const closeDropdown = useCallback(() => {
        setIsExpanded(false);
    }, []);

    return (
        <View ref={buttonRef}>
            <TouchableOpacity
                onPress={openDropdown}
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

            <Modal
                visible={isExpanded}
                transparent
                animationType="fade"
                onRequestClose={closeDropdown}
            >
                <Pressable
                    className="flex-1"
                    onPress={closeDropdown}
                >
                    <View
                        className="w-48 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-xl shadow-black/10 overflow-hidden"
                        style={{
                            position: 'absolute',
                            top: buttonLayout.y + buttonLayout.height + 8,
                            right: 20,
                        }}
                    >
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
                </Pressable>
            </Modal>
        </View>
    );
});
