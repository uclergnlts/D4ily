import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, Trash2, Clock, BookOpen } from 'lucide-react-native';
import { useReadingHistory, useClearHistory } from '../src/hooks/useHistory';
import { useAuthStore } from '../src/store/useAuthStore';

const COUNTRY_FLAGS: Record<string, string> = {
    tr: '🇹🇷', us: '🇺🇸', de: '🇩🇪', uk: '🇬🇧', fr: '🇫🇷', es: '🇪🇸', it: '🇮🇹', ru: '🇷🇺',
};

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}dk once`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}sa once`;
    const days = Math.floor(hours / 24);
    return `${days}g once`;
}

export default function HistoryScreen() {
    const router = useRouter();
    const token = useAuthStore(s => s.token);
    const [page] = useState(1);
    const { data, isLoading } = useReadingHistory(page);
    const clearMutation = useClearHistory();

    const handleClear = () => {
        Alert.alert(
            'Gecmisi Temizle',
            'Tum okuma gecmisiniz silinecek. Emin misiniz?',
            [
                { text: 'Iptal', style: 'cancel' },
                {
                    text: 'Temizle',
                    style: 'destructive',
                    onPress: () => clearMutation.mutate(),
                },
            ]
        );
    };

    return (
        <View className="flex-1 bg-zinc-50 dark:bg-black">
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView className="flex-1" edges={['top']}>
                <View className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex-row items-center justify-between bg-white dark:bg-zinc-900">
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
                            Okuma Gecmisi
                        </Text>
                    </View>
                    {data && data.items.length > 0 && (
                        <TouchableOpacity onPress={handleClear} className="p-2">
                            <Trash2 size={20} color="#ef4444" />
                        </TouchableOpacity>
                    )}
                </View>

                {!token ? (
                    <View className="flex-1 items-center justify-center p-6">
                        <BookOpen size={48} color="#d4d4d8" />
                        <Text
                            className="text-zinc-500 text-center mt-4"
                            style={{ fontFamily: 'DMSans_500Medium' }}
                        >
                            Okuma gecmisinizi gormek icin giris yapin.
                        </Text>
                    </View>
                ) : isLoading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#006FFF" />
                    </View>
                ) : !data || data.items.length === 0 ? (
                    <View className="flex-1 items-center justify-center p-6">
                        <BookOpen size={48} color="#d4d4d8" />
                        <Text
                            className="text-zinc-900 dark:text-white text-lg mt-4"
                            style={{ fontFamily: 'DMSans_700Bold' }}
                        >
                            Henuz gecmis yok
                        </Text>
                        <Text
                            className="text-zinc-500 text-center mt-2"
                            style={{ fontFamily: 'DMSans_400Regular' }}
                        >
                            Okudugunuz ozetler burada gorunecek.
                        </Text>
                    </View>
                ) : (
                    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
                        {data.items.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                onPress={() => router.push({
                                    pathname: '/digest/[id]',
                                    params: { id: item.articleId, country: item.countryCode },
                                })}
                                className="bg-white dark:bg-zinc-900 rounded-2xl p-4 mb-2.5 border border-zinc-100 dark:border-zinc-800 flex-row items-center"
                                activeOpacity={0.7}
                            >
                                <View className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 items-center justify-center mr-3">
                                    <Text className="text-lg">{COUNTRY_FLAGS[item.countryCode] || '🏳️'}</Text>
                                </View>
                                <View className="flex-1">
                                    <Text
                                        className="text-[14px] text-zinc-900 dark:text-white"
                                        style={{ fontFamily: 'DMSans_600SemiBold' }}
                                    >
                                        {item.countryCode.toUpperCase()} Ozeti
                                    </Text>
                                    <View className="flex-row items-center gap-2 mt-1">
                                        <Clock size={12} color="#a1a1aa" />
                                        <Text
                                            className="text-[12px] text-zinc-400"
                                            style={{ fontFamily: 'DMSans_400Regular' }}
                                        >
                                            {timeAgo(item.viewedAt)}
                                        </Text>
                                        {item.timeSpentSeconds > 0 && (
                                            <Text
                                                className="text-[11px] text-zinc-400"
                                                style={{ fontFamily: 'DMSans_400Regular' }}
                                            >
                                                · {Math.round(item.timeSpentSeconds / 60)}dk okundu
                                            </Text>
                                        )}
                                    </View>
                                </View>
                                <ChevronLeft size={16} color="#a1a1aa" style={{ transform: [{ rotate: '180deg' }] }} />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}
            </SafeAreaView>
        </View>
    );
}
