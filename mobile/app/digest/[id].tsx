import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useDigestDetail } from '../../src/hooks/useDigest';
import { ChevronLeft, Share2 } from 'lucide-react-native';
import { DigestHeader } from '../../src/components/digest/DigestHeader';
import { DigestTopicList } from '../../src/components/digest/DigestTopicList';
import { useColorScheme } from 'react-native';

export default function DigestDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const { data: digest, isLoading } = useDigestDetail('tr', id!);

    if (isLoading || !digest) {
        return (
            <View className="flex-1 bg-zinc-50 dark:bg-black items-center justify-center">
                <ActivityIndicator size="large" color="#006FFF" />
            </View>
        );
    }

    const handleShare = async () => {
        try {
            await Share.share({
                message: `${digest.title}\n\n${digest.summary}\n\nD4ily uygulamasında oku.`,
            });
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <View className="flex-1 bg-zinc-50 dark:bg-black">
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />
            <SafeAreaView className="flex-1" edges={['top']}>
                {/* Custom Header */}
                <View className="flex-row items-center justify-between px-4 py-2 border-b border-zinc-100 dark:border-zinc-800">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="p-2 -ml-2"
                    >
                        <ChevronLeft size={28} color={isDark ? "#fff" : "#000"} />
                    </TouchableOpacity>
                    <Text className="text-[17px] font-bold text-zinc-900 dark:text-white">
                        Bülten Detayı
                    </Text>
                    <TouchableOpacity
                        onPress={handleShare}
                        className="p-2 -mr-2"
                    >
                        <Share2 size={24} color={isDark ? "#fff" : "#000"} />
                    </TouchableOpacity>
                </View>

                <ScrollView className="flex-1">
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
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
