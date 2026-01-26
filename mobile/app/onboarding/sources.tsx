import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check, ChevronRight } from 'lucide-react-native';

const SOURCES = [
    { id: '1', name: 'NTV', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/NTV_logo.svg/1200px-NTV_logo.svg.png' },
    { id: '2', name: 'BBC Türkçe', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/BBC_Logo_2021.svg/1200px-BBC_Logo_2021.svg.png' },
    { id: '3', name: 'Sözcü', logo: 'https://geoim.bloomberght.com/2021/04/05/ver1617621867/2275765_1200x627.jpg' },
    { id: '4', name: 'Webrazzi', logo: 'https://cdn.webrazzi.com/uploads/2023/12/webrazzi-logo-2023.png' },
    { id: '5', name: 'ShiftDelete', logo: 'https://shiftdelete.net/wp-content/uploads/2020/08/shiftdelete-net-logo-1.png' },
    { id: '6', name: 'Anadolu Ajansı', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Anadolu_Agency_logo.svg/2560px-Anadolu_Agency_logo.svg.png' },
];

export default function SourcesScreen() {
    const router = useRouter();
    const [selected, setSelected] = useState<string[]>([]);

    const toggleSelection = (id: string) => {
        if (selected.includes(id)) {
            setSelected(selected.filter(s => s !== id));
        } else {
            setSelected([...selected, id]);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-black">
            <View className="flex-1 px-6 pt-8">
                <Text className="text-3xl font-black text-zinc-900 dark:text-white mb-2 tracking-tighter">
                    Haber Kaynakları
                </Text>
                <Text className="text-zinc-500 mb-8 text-lg font-medium">
                    Takip etmek istediğin güvenilir kaynakları seç. Akışın buna göre şekillenecek.
                </Text>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                    <View className="gap-4">
                        {SOURCES.map((source) => {
                            const isSelected = selected.includes(source.id);
                            return (
                                <TouchableOpacity
                                    key={source.id}
                                    onPress={() => toggleSelection(source.id)}
                                    className={`flex-row items-center p-4 rounded-2xl border-2 transition-all ${isSelected ? 'border-[#006FFF] bg-blue-50 dark:bg-blue-900/10' : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900'}`}
                                >
                                    <View className="w-12 h-12 bg-white rounded-lg items-center justify-center shadow-sm overflow-hidden mr-4">
                                        <Text className="font-bold text-xs">{source.name[0]}</Text>
                                        {/* In real app, use Image component with uri={source.logo} */}
                                    </View>
                                    <View className="flex-1">
                                        <Text className={`font-bold text-lg ${isSelected ? 'text-[#006FFF]' : 'text-zinc-900 dark:text-white'}`}>
                                            {source.name}
                                        </Text>
                                    </View>
                                    <View className={`w-6 h-6 rounded-full items-center justify-center border ${isSelected ? 'bg-[#006FFF] border-[#006FFF]' : 'border-zinc-300'}`}>
                                        {isSelected && <Check size={14} color="white" />}
                                    </View>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                </ScrollView>

                {/* Footer Action */}
                <View className="absolute bottom-10 left-6 right-6">
                    <TouchableOpacity
                        onPress={() => router.push('/onboarding/categories')}
                        className={`w-full py-4 rounded-2xl flex-row items-center justify-center shadow-lg active:scale-[0.98] ${selected.length > 0 ? 'bg-[#006FFF] shadow-blue-500/30' : 'bg-zinc-200 dark:bg-zinc-800'}`}
                        disabled={selected.length === 0}
                    >
                        <Text className={`font-bold text-lg mr-2 ${selected.length > 0 ? 'text-white' : 'text-zinc-400'}`}>
                            Kategorilere Geç
                        </Text>
                        {selected.length > 0 && <ChevronRight size={20} color="white" />}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}
