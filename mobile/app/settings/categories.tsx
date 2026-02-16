import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Check, Sparkles } from 'lucide-react-native';
import { useAllCategories, useUserCategories, useSetUserCategories } from '../../src/hooks/useCategories';
import { useAuthStore } from '../../src/store/useAuthStore';

const CATEGORY_ICONS: Record<string, string> = {
    politics: '🏛️',
    economy: '💰',
    technology: '💻',
    sports: '⚽',
    health: '🏥',
    science: '🔬',
    culture: '🎭',
    world: '🌍',
    education: '📚',
    environment: '🌱',
};

export default function CategoriesScreen() {
    const router = useRouter();
    const token = useAuthStore(s => s.token);
    const { data: allCategories, isLoading: categoriesLoading } = useAllCategories();
    const { data: userCategories, isLoading: userCatsLoading } = useUserCategories();
    const setCategories = useSetUserCategories();
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [hasChanged, setHasChanged] = useState(false);

    useEffect(() => {
        if (userCategories) {
            setSelected(new Set(userCategories.map(c => c.categoryId)));
        }
    }, [userCategories]);

    const toggleCategory = (id: number) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            setHasChanged(true);
            return next;
        });
    };

    const handleSave = async () => {
        if (!token) {
            Alert.alert('Giris Gerekli', 'Tercihleri kaydetmek icin giris yapin.');
            return;
        }
        try {
            await setCategories.mutateAsync(Array.from(selected));
            Alert.alert('Kaydedildi', 'Kategori tercihleriniz guncellendi.');
            setHasChanged(false);
        } catch {
            Alert.alert('Hata', 'Tercihler kaydedilemedi.');
        }
    };

    const isLoading = categoriesLoading || userCatsLoading;

    return (
        <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-black" edges={['top']}>
            <View className="px-4 py-3 flex-row items-center justify-between bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
                <View className="flex-row items-center">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-full mr-3"
                    >
                        <ChevronLeft size={24} color="#18181b" />
                    </TouchableOpacity>
                    <Text
                        className="text-lg text-zinc-900 dark:text-white"
                        style={{ fontFamily: 'DMSans_700Bold' }}
                    >
                        Ilgi Alanlari
                    </Text>
                </View>
                {hasChanged && (
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={setCategories.isPending}
                        className="bg-blue-600 px-4 py-2 rounded-xl"
                    >
                        {setCategories.isPending ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text
                                className="text-white text-[13px]"
                                style={{ fontFamily: 'DMSans_700Bold' }}
                            >
                                Kaydet
                            </Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#006FFF" />
                </View>
            ) : (
                <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
                    <View className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-5 border border-blue-100 dark:border-blue-800">
                        <View className="flex-row items-center gap-2 mb-1">
                            <Sparkles size={16} color="#006FFF" />
                            <Text
                                className="text-blue-700 dark:text-blue-300 text-[13px]"
                                style={{ fontFamily: 'DMSans_700Bold' }}
                            >
                                Kisisel Ozet
                            </Text>
                        </View>
                        <Text
                            className="text-blue-600 dark:text-blue-400 text-[12px] leading-5"
                            style={{ fontFamily: 'DMSans_400Regular' }}
                        >
                            Ilgilendiginiz kategorileri secin. Ozetler bu tercihlere gore onceliklendirilecek.
                        </Text>
                    </View>

                    <Text
                        className="text-xs text-zinc-500 uppercase tracking-wider mb-3 px-1"
                        style={{ fontFamily: 'DMSans_600SemiBold' }}
                    >
                        Kategoriler ({selected.size} secili)
                    </Text>

                    <View className="flex-row flex-wrap gap-3">
                        {allCategories?.map((cat) => {
                            const isSelected = selected.has(cat.id);
                            const icon = cat.icon || CATEGORY_ICONS[cat.slug] || '📰';

                            return (
                                <TouchableOpacity
                                    key={cat.id}
                                    onPress={() => toggleCategory(cat.id)}
                                    className={`rounded-2xl px-4 py-3 border ${isSelected
                                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                                        }`}
                                    style={{ minWidth: '45%' }}
                                    activeOpacity={0.7}
                                >
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-row items-center gap-2">
                                            <Text className="text-xl">{icon}</Text>
                                            <Text
                                                className={`text-[14px] ${isSelected
                                                    ? 'text-blue-700 dark:text-blue-300'
                                                    : 'text-zinc-700 dark:text-zinc-300'
                                                    }`}
                                                style={{ fontFamily: isSelected ? 'DMSans_700Bold' : 'DMSans_500Medium' }}
                                            >
                                                {cat.name}
                                            </Text>
                                        </View>
                                        {isSelected && (
                                            <Check size={18} color="#006FFF" />
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {selected.size === 0 && (
                        <View className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800">
                            <Text
                                className="text-amber-700 dark:text-amber-300 text-[12px] text-center"
                                style={{ fontFamily: 'DMSans_500Medium' }}
                            >
                                Hic kategori secilmezse tum haberler gosterilir.
                            </Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
