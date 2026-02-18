import React, { useMemo } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, RefreshControl, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDigests } from '../../src/hooks/useDigest';
import { BookOpen, Menu } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { DigestCard } from '../../src/components/digest/DigestCard';
import { CountrySelector } from '../../src/components/navigation/CountrySelector';
import { useAppStore } from '../../src/store/useAppStore';
import { useThemeStore } from '../../src/store/useThemeStore';
import { useCII } from '../../src/hooks/useCII';
import { CIIBadge } from '../../src/components/ui/CIIBadge';
import { useStaggeredEntry } from '../../src/hooks/useStaggeredEntry';

export default function HomeScreen() {
    const router = useRouter();
    const activeScheme = useThemeStore(state => state.activeScheme);
    const isDark = activeScheme === 'dark';
    const { selectedCountry, toggleSideMenu } = useAppStore();

    const { data: digests, isLoading, refetch, isRefetching } = useDigests(selectedCountry);
    const { data: ciiData } = useCII(selectedCountry);

    // Sort digests by date descending
    const sortedDigests = useMemo(() => {
        if (!digests) return [];
        return [...digests].sort((a, b) => b.date.localeCompare(a.date));
    }, [digests]);

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-black items-center justify-center">
                <ActivityIndicator size="large" color="#006FFF" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-surface-light dark:bg-black" edges={['top']}>
            <View className="px-5 py-4 flex-row items-center justify-between bg-surface-light dark:bg-black z-10">
                <TouchableOpacity
                    onPress={toggleSideMenu}
                    className="p-1 -ml-1"
                    accessibilityLabel="Menüyü aç"
                    accessibilityRole="button"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Menu size={24} color={isDark ? "#ffffff" : "#18181b"} />
                </TouchableOpacity>

                <Text className="text-xl font-bold text-blue-500">Günlük Özet</Text>

                <View className="flex-row items-center gap-3">
                    {/* Keep CountrySelector/CIIBadge if needed, or maybe move them to a different place or keep them here? 
                         User design shows a bell icon. For now I'll keep the functionality accessible but maybe simplify.
                         Actually, let's keep the user's existing Country/CII logic but maybe cleaner. 
                         The user explicitly asked for the screenshot UI. 
                         Screenshot: Menu - Title - Bell. 
                         I will stick to the screenshot layout but keep CountrySelector maybe as a small element or remove if it conflicts too much.
                         Let's keep it simple and clean as requested. I'll put CountrySelector back in if they miss it, 
                         or maybe better: put it in the header but compact.
                     */}
                    {/* <CountrySelector /> */}
                    {/* I will comment out CountrySelector to match the clean design for now, assuming it's in the menu or unnecessary to show constantly. 
                         Wait, changing country is core functionality. I should probably keep it.
                         Let's place it next to the bell or instead of the bell since I don't have a bell action yet.
                      */}
                    <CountrySelector />
                    {/* <CIIBadge data={ciiData} compact /> */}
                </View>
            </View>

            <FlatList
                data={sortedDigests}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#006FFF" />
                }
                ListEmptyComponent={
                    <View className="rounded-[24px] p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-surface-subtle dark:bg-surface-subtle-dark min-h-[300px] items-center justify-center mt-10">
                        <View className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center mb-4">
                            <BookOpen size={32} color={isDark ? "#52525b" : "#a1a1aa"} />
                        </View>
                        <Text className="text-display-lg text-zinc-900 dark:text-white font-display text-center mb-2">
                            Özet Yok
                        </Text>
                        <Text className="text-body-md text-zinc-500 text-center font-medium max-w-[250px]">
                            Henüz bülten oluşturulmamış.
                        </Text>
                    </View>
                }
                renderItem={({ item, index }) => (
                    <DigestCard
                        title={item.title}
                        summary={item.summary}
                        date={item.date}
                        isFeatured={index === 0}
                        isNew={index === 0} // Logic: First one is "New"
                        // @ts-ignore
                        onPress={() => router.push({
                            pathname: '/digest/[id]',
                            params: { id: item.id, country: selectedCountry }
                        })}
                    />
                )}
            />
        </SafeAreaView>
    );
}
