import React from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bookmark, Lock, ArrowRight, ChevronLeft } from 'lucide-react-native';
import { useAuthStore } from '../src/store/useAuthStore';
import { useSavedArticles } from '../src/hooks/useInteraction';
import { ArticleCard } from '../src/components/article/ArticleCard';
import { Article } from '../src/types';

export default function SavedArticlesScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { data: savedArticles, isLoading, refetch } = useSavedArticles('tr');

    if (!user) {
        return (
            <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-black">
                {/* Header */}
                <View className="px-4 py-3 flex-row items-center border-b border-zinc-100 dark:border-zinc-800">
                    <TouchableOpacity onPress={() => router.back()} className="mr-3">
                        <ChevronLeft size={24} color="#71717a" />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold text-zinc-900 dark:text-white">Kaydedilenler</Text>
                </View>

                {/* Login Guard State */}
                <View className="flex-1 items-center justify-center px-10">
                    <View className="w-20 h-20 bg-zinc-100 dark:bg-zinc-900 rounded-full items-center justify-center mb-6">
                        <Lock size={32} color="#a1a1aa" />
                    </View>
                    <Text className="text-xl font-bold text-zinc-900 dark:text-white mb-2 text-center">
                        Giriş Yapmanız Gerekiyor
                    </Text>
                    <Text className="text-zinc-500 text-center leading-relaxed mb-8">
                        Kaydettiğiniz haberlere erişmek ve yeni haberler kaydetmek için lütfen hesabınıza giriş yapın.
                    </Text>

                    <TouchableOpacity
                        onPress={() => router.push('/auth')}
                        className="bg-[#006FFF] w-full py-4 rounded-xl flex-row items-center justify-center shadow-lg shadow-blue-500/30"
                    >
                        <Text className="text-white font-bold text-base mr-2">Giriş Yap</Text>
                        <ArrowRight size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const renderItem = ({ item }: { item: Article }) => (
        <ArticleCard article={item} />
    );

    return (
        <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-black" edges={['top']}>
            {/* Header */}
            <View className="px-4 py-3 flex-row items-center bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 z-10">
                <TouchableOpacity onPress={() => router.back()} className="mr-3">
                    <ChevronLeft size={24} color="#18181b" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-zinc-900 dark:text-white">Kaydedilenler</Text>
            </View>

            {/* Content or Empty State */}
            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#006FFF" />
                </View>
            ) : savedArticles && savedArticles.length > 0 ? (
                <FlatList
                    data={savedArticles}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingVertical: 16 }}
                    refreshing={isLoading}
                    onRefresh={refetch}
                />
            ) : (
                <View className="flex-1 items-center justify-center px-10 opacity-70">
                    <View className="bg-zinc-100 dark:bg-zinc-900 p-6 rounded-full mb-6">
                        <Bookmark size={40} color="#d4d4d8" strokeWidth={1.5} />
                    </View>
                    <Text className="text-zinc-900 dark:text-white font-bold text-lg text-center mb-1">
                        Listeniz Boş
                    </Text>
                    <Text className="text-zinc-500 text-center leading-relaxed">
                        İlginizi çeken haberleri daha sonra okumak için kaydedebilirsiniz.
                    </Text>
                </View>
            )}
        </SafeAreaView>
    );
}
