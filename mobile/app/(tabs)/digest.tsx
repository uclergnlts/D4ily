import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLatestDigest } from '../../src/hooks/useDigest';
import { BookOpen, Share2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { DigestHeader } from '../../src/components/digest/DigestHeader';
import { DigestTopicList } from '../../src/components/digest/DigestTopicList';

export default function DigestScreen() {
    const { data: digest, isLoading, refetch, isRefetching } = useLatestDigest('tr');
    const router = useRouter();

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-black items-center justify-center">
                <ActivityIndicator size="large" color="#006FFF" />
            </SafeAreaView>
        );
    }

    if (!digest) {
        return (
            <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-black items-center justify-center p-6">
                <BookOpen size={48} color="#a1a1aa" className="mb-4" />
                <Text className="text-zinc-500 text-center mb-4">
                    Henüz bugünün bülteni hazırlanmadı.
                    {'\n'}Lütfen daha sonra tekrar kontrol et.
                </Text>
                <TouchableOpacity
                    className="bg-zinc-200 dark:bg-zinc-800 px-4 py-2 rounded-lg"
                    onPress={() => refetch()}
                >
                    <Text className="text-zinc-900 dark:text-white">Yenile</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    // Format date: "24 Ocak 2024, Çarşamba"
    const formattedDate = new Date(digest.date).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        weekday: 'long',
    });

    const periodLabel = digest.period === 'morning' ? 'Sabah Özeti' : 'Akşam Özeti';

    return (
        <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-black" edges={['top']}>
            <ScrollView
                className="flex-1"
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#006FFF" />
                }
            >
                {/* Header Card */}
                <DigestHeader
                    title={digest.title}
                    date={digest.date}
                    period={digest.period}
                    summary={digest.summary}
                    className="m-4"
                />

                {/* Top Topics */}
                <DigestTopicList
                    topics={digest.topTopics}
                    onTopicPress={(articleId) => router.push({
                        pathname: '/article/[id]',
                        params: { id: articleId }
                    })}
                    className="mb-6"
                />

                <View className="p-6 items-center">
                    <TouchableOpacity className="flex-row items-center gap-2 bg-zinc-100 dark:bg-zinc-800 px-6 py-3 rounded-full">
                        <Share2 size={18} color="#006FFF" />
                        <Text className="font-bold text-zinc-700 dark:text-zinc-300">Özeti Paylaş</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}
