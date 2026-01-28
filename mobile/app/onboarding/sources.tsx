import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check, ChevronRight } from 'lucide-react-native';
import { client } from '../../src/api/client';
import { ApiResponse } from '../../src/types';

interface Source {
    id: number;
    sourceName: string;
    sourceLogoUrl: string;
    countryCode: string;
}

export default function SourcesScreen() {
    const router = useRouter();
    const [sources, setSources] = useState<Source[]>([]);
    const [selected, setSelected] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSources();
    }, []);

    const fetchSources = async () => {
        try {
            const response = await client.get<ApiResponse<Source[]>>('/sources?country=tr');
            if (response.data.success) {
                setSources(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch sources:', error);
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

    const handleSave = async () => {
        if (selected.length === 0) {
            Alert.alert('Hata', 'Lütfen en az bir kaynak seçin.');
            return;
        }

        setSaving(true);
        try {
            // Save each selected source
            for (const sourceId of selected) {
                await client.post(`/user/sources/${sourceId}`);
            }
            router.push('/onboarding/categories');
        } catch (error: any) {
            Alert.alert('Hata', error.message || 'Kaydetme başarısız');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-white dark:bg-black items-center justify-center">
                <ActivityIndicator size="large" color="#006FFF" />
            </SafeAreaView>
        );
    }

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
                        {sources.map((source) => {
                            const isSelected = selected.includes(source.id);
                            return (
                                <TouchableOpacity
                                    key={source.id}
                                    onPress={() => toggleSelection(source.id)}
                                    className={`flex-row items-center p-4 rounded-2xl border-2 transition-all ${isSelected ? 'border-[#006FFF] bg-blue-50 dark:bg-blue-900/10' : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900'}`}
                                >
                                    <View className="w-12 h-12 bg-white rounded-lg items-center justify-center shadow-sm overflow-hidden mr-4">
                                        <Text className="font-bold text-xs">{source.sourceName[0]}</Text>
                                    </View>
                                    <View className="flex-1">
                                        <Text className={`font-bold text-lg ${isSelected ? 'text-[#006FFF]' : 'text-zinc-900 dark:text-white'}`}>
                                            {source.sourceName}
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
                        onPress={handleSave}
                        className={`w-full py-4 rounded-2xl flex-row items-center justify-center shadow-lg active:scale-[0.98] ${selected.length > 0 ? 'bg-[#006FFF] shadow-blue-500/30' : 'bg-zinc-200 dark:bg-zinc-800'}`}
                        disabled={selected.length === 0 || saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Text className={`font-bold text-lg mr-2 ${selected.length > 0 ? 'text-white' : 'text-zinc-400'}`}>
                                    Kategorilere Geç
                                </Text>
                                {selected.length > 0 && <ChevronRight size={20} color="white" />}
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}
