import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check, Zap, Briefcase, Cpu, Trophy, Globe, Heart } from 'lucide-react-native';
import { client } from '../../src/api/client';
import { ApiResponse } from '../../src/types';

interface Category {
    id: number;
    name: string;
    slug: string;
    icon: string;
    color: string;
}

const CATEGORY_ICONS: Record<string, any> = {
    'Gündem': Zap,
    'Ekonomi': Briefcase,
    'Teknoloji': Cpu,
    'Spor': Trophy,
    'Dünya': Globe,
    'Sağlık': Heart,
};

const CATEGORY_COLORS: Record<string, string> = {
    'Gündem': '#ef4444',
    'Ekonomi': '#006FFF',
    'Teknoloji': '#a855f7',
    'Spor': '#10b981',
    'Dünya': '#f59e0b',
    'Sağlık': '#ec4899',
};

export default function CategoriesScreen() {
    const router = useRouter();
    const [categories, setCategories] = useState<Category[]>([]);
    const [selected, setSelected] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await client.get<ApiResponse<Category[]>>('/categories');
            if (response.data.success) {
                setCategories(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (id: number) => {
        if (selected.includes(id)) {
            setSelected(selected.filter(s => s !== id));
        } else {
            setSelected([...selected, id]);
        }
    };

    const handleComplete = async () => {
        if (selected.length === 0) {
            Alert.alert('Hata', 'Lütfen en az bir kategori seçin.');
            return;
        }

        setSaving(true);
        try {
            await client.post('/user/categories', { categoryIds: selected });
            router.replace('/(tabs)');
        } catch (error: any) {
            Alert.alert('Hata', error.message || 'Kaydetme başarısız');
        } finally {
            setSaving(false);
        }
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

                {loading && (
                    <View className="items-center justify-center py-10">
                        <Text className="text-zinc-500">Kategoriler yukleniyor...</Text>
                    </View>
                )}

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                    <View className="flex-row flex-wrap gap-3">
                        {categories.map((category) => {
                            const isSelected = selected.includes(category.id);
                            const Icon = CATEGORY_ICONS[category.name] || Zap;
                            const color = CATEGORY_COLORS[category.name] || '#006FFF';
                            return (
                                <TouchableOpacity
                                    key={category.id}
                                    onPress={() => toggleSelection(category.id)}
                                    className={`w-[48%] p-5 rounded-2xl border-2 mb-1 justify-between h-40 ${isSelected ? 'border-transparent' : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900'}`}
                                    style={isSelected ? { backgroundColor: color } : {}}
                                >
                                    <View className={`w-10 h-10 rounded-full items-center justify-center ${isSelected ? 'bg-white/20' : 'bg-white dark:bg-zinc-800'}`}>
                                        <Icon size={20} color={isSelected ? '#fff' : color} />
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
                        disabled={selected.length === 0 || saving}
                    >
                        <Text className={`font-bold text-lg mr-2 ${selected.length > 0 ? 'text-white dark:text-black' : 'text-zinc-400'}`}>
                            {saving ? 'Kaydediliyor...' : 'Kurulumu Tamamla'}
                        </Text>
                        {selected.length > 0 && <Check size={20} color={selected.length > 0 ? (true ? '#fff' : '#000') : '#9ca3af'} className="text-white dark:text-black" />}
                        {/* Note: In-line logic for icon color is simplified for brevity. Assuming dark mode creates black text. */}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}
