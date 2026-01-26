import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check, Zap, Briefcase, Cpu, Trophy, Globe, Heart } from 'lucide-react-native';

const CATEGORIES = [
    { id: '1', name: 'Gündem', icon: Zap, color: '#ef4444' },
    { id: '2', name: 'Ekonomi', icon: Briefcase, color: '#006FFF' },
    { id: '3', name: 'Teknoloji', icon: Cpu, color: '#a855f7' },
    { id: '4', name: 'Spor', icon: Trophy, color: '#10b981' },
    { id: '5', name: 'Dünya', icon: Globe, color: '#f59e0b' },
    { id: '6', name: 'Sağlık', icon: Heart, color: '#ec4899' },
];

export default function CategoriesScreen() {
    const router = useRouter();
    const [selected, setSelected] = useState<string[]>([]);

    const toggleSelection = (id: string) => {
        if (selected.includes(id)) {
            setSelected(selected.filter(s => s !== id));
        } else {
            setSelected([...selected, id]);
        }
    };

    const handleComplete = () => {
        // Here we would save preferences using a store
        // useAuthStore.getState().setPreferences(...)
        router.replace('/(tabs)');
    };

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-black">
            <View className="flex-1 px-6 pt-8">
                <Text className="text-3xl font-black text-zinc-900 dark:text-white mb-2 tracking-tighter">
                    İlgi Alanların
                </Text>
                <Text className="text-zinc-500 mb-8 text-lg font-medium">
                    Hangi konularda haber almak istersin?
                </Text>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                    <View className="flex-row flex-wrap gap-3">
                        {CATEGORIES.map((category) => {
                            const isSelected = selected.includes(category.id);
                            return (
                                <TouchableOpacity
                                    key={category.id}
                                    onPress={() => toggleSelection(category.id)}
                                    className={`w-[48%] p-5 rounded-2xl border-2 mb-1 justify-between h-40 ${isSelected ? 'border-transparent' : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900'}`}
                                    style={isSelected ? { backgroundColor: category.color } : {}}
                                >
                                    <View className={`w-10 h-10 rounded-full items-center justify-center ${isSelected ? 'bg-white/20' : 'bg-white dark:bg-zinc-800'}`}>
                                        <category.icon size={20} color={isSelected ? '#fff' : category.color} />
                                    </View>

                                    <View>
                                        <Text className={`font-black text-xl mb-1 ${isSelected ? 'text-white' : 'text-zinc-900 dark:text-white'}`}>
                                            {category.name}
                                        </Text>
                                        <Text className={`text-xs font-medium ${isSelected ? 'text-white/80' : 'text-zinc-400'}`}>
                                            +100 haber
                                        </Text>
                                    </View>

                                    {isSelected && (
                                        <View className="absolute top-4 right-4 bg-white/20 p-1 rounded-full">
                                            <Check size={12} color="white" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                </ScrollView>

                {/* Footer Action */}
                <View className="absolute bottom-10 left-6 right-6">
                    <TouchableOpacity
                        onPress={handleComplete}
                        className={`w-full py-4 rounded-2xl flex-row items-center justify-center shadow-lg active:scale-[0.98] ${selected.length > 0 ? 'bg-zinc-900 dark:bg-white shadow-zinc-500/20' : 'bg-zinc-200 dark:bg-zinc-800'}`}
                        disabled={selected.length === 0}
                    >
                        <Text className={`font-bold text-lg mr-2 ${selected.length > 0 ? 'text-white dark:text-black' : 'text-zinc-400'}`}>
                            Kurulumu Tamamla
                        </Text>
                        {selected.length > 0 && <Check size={20} color={selected.length > 0 ? (true ? '#fff' : '#000') : '#9ca3af'} className="text-white dark:text-black" />}
                        {/* Note: In-line logic for icon color is simplified for brevity. Assuming dark mode creates black text. */}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}
