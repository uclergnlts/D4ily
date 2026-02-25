import React from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { safeBack } from '../src/utils/navigation';
import { Bookmark, Lock, ArrowRight, ChevronLeft } from 'lucide-react-native';
import { useAuthStore } from '../src/store/useAuthStore';
import { useSavedArticles } from '../src/hooks/useInteraction';
import { ArticleCard } from '../src/components/article/ArticleCard';
import { Article } from '../src/types';
import { useThemeStore } from '../src/store/useThemeStore';

export default function SavedArticlesScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { data: savedArticles, isLoading, refetch } = useSavedArticles('tr');

    const activeScheme = useThemeStore(state => state.activeScheme);
    const isDark = activeScheme === 'dark';

    if (!user) {
        return (
            <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark" edges={['top']}>
                {/* Header */}
                <View className="px-5 pt-4 pb-4 flex-row items-center justify-between border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark z-10">
                    <TouchableOpacity
                        onPress={() => safeBack(router)}
                        className="w-11 h-11 items-center justify-center bg-surface-light-subtle dark:bg-surface-dark-subtle rounded-full active:scale-95 transition-transform"
                    >
                        <ChevronLeft size={24} color={isDark ? '#FFFFFF' : '#18181B'} />
                    </TouchableOpacity>
                    <Text className="text-display-lg font-display-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
                        Kaydedilenler
                    </Text>
                    <View className="w-11 h-11" />
                </View>

                {/* Login Guard State */}
                <View className="flex-1 items-center justify-center px-10">
                    <View className="w-24 h-24 bg-surface-light-subtle dark:bg-surface-dark-subtle rounded-3xl items-center justify-center mb-8 border border-border-light dark:border-border-dark shadow-sm">
                        <Lock size={36} color="#A1A1AA" />
                    </View>
                    <Text className="text-display-lg font-sans-black tracking-tight text-zinc-900 dark:text-white mb-3 text-center">
                        Giriş Yapmanız Gerekiyor
                    </Text>
                    <Text className="text-body-md font-sans text-zinc-500 text-center leading-[24px] mb-8">
                        Kaydettiğiniz haberlere erişmek ve yeni haberler kaydetmek için lütfen hesabınıza giriş yapın.
                    </Text>

                    <TouchableOpacity
                        onPress={() => router.push('/auth')}
                        className="bg-primary w-full py-4 rounded-full flex-row items-center justify-center shadow-lg shadow-primary-500/30 active:scale-95 transition-transform"
                    >
                        <Text className="text-white font-sans-bold text-body-lg mr-2">Giriş Yap</Text>
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
        <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark" edges={['top']}>
            {/* Header */}
            <View className="px-5 pt-4 pb-4 flex-row items-center justify-between border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark z-10">
                <TouchableOpacity
                    onPress={() => safeBack(router)}
                    className="w-11 h-11 items-center justify-center bg-surface-light-subtle dark:bg-surface-dark-subtle rounded-full active:scale-95 transition-transform"
                >
                    <ChevronLeft size={24} color={isDark ? '#FFFFFF' : '#18181B'} />
                </TouchableOpacity>
                <Text className="text-display-lg font-display-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
                    Kaydedilenler
                </Text>
                <View className="w-11 h-11" />
            </View>

            {/* Content or Empty State */}
            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#0A66C2" />
                </View>
            ) : savedArticles && savedArticles.length > 0 ? (
                <FlatList
                    data={savedArticles}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingVertical: 20 }}
                    refreshing={isLoading}
                    onRefresh={refetch}
                />
            ) : (
                <View className="flex-1 items-center justify-center px-10">
                    <View className="bg-surface-light-subtle dark:bg-surface-dark-subtle p-8 rounded-full mb-6 border border-border-light dark:border-border-dark shadow-sm">
                        <Bookmark size={48} color="#A1A1AA" strokeWidth={1.5} />
                    </View>
                    <Text className="text-zinc-900 dark:text-white font-sans-black tracking-tight text-display-lg text-center mb-3">
                        Listeniz Boş
                    </Text>
                    <Text className="text-zinc-500 text-body-md font-sans text-center leading-[24px]">
                        İlginizi çeken haberleri daha sonra okumak için sağ üstteki ikona tıklayarak kaydedebilirsiniz.
                    </Text>
                </View>
            )}
        </SafeAreaView>
    );
}
