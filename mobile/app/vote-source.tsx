import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/useAuthStore';
import { sourceService } from '../src/api/services/sourceService';

export default function VoteSourceScreen() {
    const { sourceId, sourceName } = useLocalSearchParams<{ sourceId: string, sourceName: string }>();
    const [selectedScore, setSelectedScore] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    const user = useAuthStore(state => state.user);
    const router = useRouter();

    if (!user) {
        return (
            <View className="flex-1 items-center justify-center bg-white dark:bg-zinc-900 p-6">
                <Text className="text-lg font-bold text-zinc-900 mb-4 text-center">
                    Oylama Yapmak İçin Giriş Yapmalısın
                </Text>
                <TouchableOpacity
                    className="bg-primary px-6 py-3 rounded-full"
                    onPress={() => router.replace('/auth')}
                >
                    <Text className="text-white font-bold">Giriş Yap</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleVote = async () => {
        if (selectedScore === null) return;
        setLoading(true);
        try {
            await sourceService.voteSource(Number(sourceId), selectedScore);
            Alert.alert('Başarılı', 'Oyunuz kaydedildi!', [
                { text: 'Tamam', onPress: () => router.back() }
            ]);
        } catch (error: any) {
            Alert.alert('Hata', error.message || 'Oylama başarısız oldu.');
        } finally {
            setLoading(false);
        }
    };

    const scores = [
        { value: -5, label: 'Tamamen Muhalif', color: 'bg-indigo-600' },
        { value: -3, label: 'Muhalif Eğilimli', color: 'bg-indigo-400' },
        { value: 0, label: 'Tarafsız / Dengeli', color: 'bg-zinc-400' },
        { value: 3, label: 'İktidar Eğilimli', color: 'bg-amber-400' },
        { value: 5, label: 'Tamamen İktidar Yanlısı', color: 'bg-amber-600' },
    ];

    return (
        <View className="flex-1 bg-white dark:bg-zinc-900 p-6">
            <Text className="text-xl font-bold text-center text-zinc-900 dark:text-white mb-2">
                Editoryal Duruşu Oyla
            </Text>
            <Text className="text-base text-center text-zinc-500 mb-8">
                {sourceName}
            </Text>

            <ScrollView className="flex-1">
                <View className="gap-3">
                    {scores.map((s) => (
                        <TouchableOpacity
                            key={s.value}
                            className={`p-4 rounded-xl border-2 flex-row items-center justify-between ${selectedScore === s.value
                                    ? 'border-primary bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-zinc-100 dark:border-zinc-800'
                                }`}
                            onPress={() => setSelectedScore(s.value)}
                        >
                            <Text className={`font-medium ${selectedScore === s.value ? 'text-primary' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                {s.label}
                            </Text>
                            <View className={`w-4 h-4 rounded-full ${s.color}`} />
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            <TouchableOpacity
                className={`mt-4 p-4 rounded-xl items-center ${selectedScore !== null ? 'bg-primary' : 'bg-zinc-300'}`}
                disabled={selectedScore === null || loading}
                onPress={handleVote}
            >
                {loading ? <ActivityIndicator color="white" /> : (
                    <Text className="text-white font-bold text-lg">Oyu Gönder</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}
