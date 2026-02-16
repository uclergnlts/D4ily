import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl, useColorScheme } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDigests } from '../../src/hooks/useDigest';
import { BookOpen, ChevronLeft, ChevronRight, Calendar, Menu } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { DigestCard } from '../../src/components/digest/DigestCard';
import { CountrySelector } from '../../src/components/navigation/CountrySelector';
import { useAppStore } from '../../src/store/useAppStore';
import { useCII } from '../../src/hooks/useCII';
import { CIIBadge } from '../../src/components/ui/CIIBadge';
import { useStaggeredEntry } from '../../src/hooks/useStaggeredEntry';

export default function HomeScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { selectedCountry, toggleSideMenu } = useAppStore();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [hasAutoSelected, setHasAutoSelected] = useState(false);
    const { getEntryAnimation } = useStaggeredEntry();

    const { data: digests, isLoading, refetch, isRefetching } = useDigests(selectedCountry);
    const { data: ciiData } = useCII(selectedCountry);

    useEffect(() => {
        if (digests && digests.length > 0 && !hasAutoSelected) {
            const latestDate = digests
                .map(d => d.date)
                .sort((a, b) => b.localeCompare(a))[0];

            if (latestDate) {
                const todayStr = new Date().toISOString().split('T')[0];
                const hasTodayDigest = digests.some(d => d.date === todayStr);
                if (!hasTodayDigest) {
                    setSelectedDate(new Date(latestDate + 'T12:00:00'));
                }
            }
            setHasAutoSelected(true);
        }
    }, [digests, hasAutoSelected]);

    const dailyDigests = useMemo(() => {
        if (!digests) return { morning: null, evening: null };
        const dateStr = selectedDate.toISOString().split('T')[0];
        return {
            morning: digests.find(d => d.date === dateStr && d.period === 'morning'),
            evening: digests.find(d => d.date === dateStr && d.period === 'evening')
        };
    }, [digests, selectedDate]);

    const changeDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + days);
        if (newDate > new Date()) return;
        setSelectedDate(newDate);
    };

    const isToday = selectedDate.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];

    const formatDateDisplay = (date: Date) => {
        return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-black items-center justify-center">
                <ActivityIndicator size="large" color="#006FFF" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-black" edges={['top']}>
            <View className="px-5 py-4 flex-row items-center justify-between border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-black z-10">
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity
                        onPress={toggleSideMenu}
                        className="p-1 -ml-1"
                        accessibilityLabel="Menüyü aç"
                        accessibilityRole="button"
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Menu size={24} color={isDark ? "#ffffff" : "#18181b"} />
                    </TouchableOpacity>
                    <CountrySelector />
                    <CIIBadge data={ciiData} compact />
                </View>

                <View className="flex-row items-center bg-white dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 shadow-sm">
                    <TouchableOpacity
                        onPress={() => changeDate(-1)}
                        className="p-1"
                        accessibilityLabel="Önceki gün"
                        accessibilityRole="button"
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <ChevronLeft size={20} color="#71717a" />
                    </TouchableOpacity>

                    <View className="flex-row items-center mx-2 gap-2">
                        <Calendar size={14} color="#71717a" />
                        <Text
                            className="text-[14px] text-zinc-700 dark:text-zinc-300"
                            style={{ fontFamily: 'DMSans_700Bold' }}
                        >
                            {formatDateDisplay(selectedDate)}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={() => changeDate(1)}
                        disabled={isToday}
                        className="p-1"
                        style={{ opacity: isToday ? 0.3 : 1 }}
                        accessibilityLabel="Sonraki gün"
                        accessibilityRole="button"
                        accessibilityState={{ disabled: isToday }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <ChevronRight size={20} color="#71717a" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 20 }}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#006FFF" />
                }
            >
                <Animated.View className="mb-6 items-center" entering={getEntryAnimation(0)}>
                    <Text
                        className="text-[28px] text-zinc-900 dark:text-white mb-1"
                        style={{ fontFamily: 'Syne_800ExtraBold', letterSpacing: -0.5 }}
                        accessibilityRole="header"
                    >
                        {selectedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                    </Text>
                    <Text
                        className="text-[16px] text-zinc-500 dark:text-zinc-400"
                        style={{ fontFamily: 'DMSans_500Medium' }}
                    >
                        {selectedDate.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric' })}
                    </Text>
                </Animated.View>

                <View className="flex-row gap-4">
                    <Animated.View className="flex-1" entering={getEntryAnimation(1)}>
                        {dailyDigests.morning ? (
                            <DigestCard
                                type="morning"
                                title={dailyDigests.morning.title}
                                summary={dailyDigests.morning.summary}
                                // @ts-ignore
                                onPress={() => router.push({
                                    pathname: '/digest/[id]',
                                    params: { id: dailyDigests.morning!.id, country: selectedCountry }
                                })}
                            />
                        ) : (
                            <View className="rounded-3xl p-4 border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 min-h-[180px] items-center justify-center opacity-60">
                                <Text className="text-zinc-400 text-center" style={{ fontFamily: 'DMSans_500Medium' }}>Gündüz özeti yok</Text>
                            </View>
                        )}
                    </Animated.View>

                    <Animated.View className="flex-1" entering={getEntryAnimation(2)}>
                        {dailyDigests.evening ? (
                            <DigestCard
                                type="evening"
                                title={dailyDigests.evening.title}
                                summary={dailyDigests.evening.summary}
                                // @ts-ignore
                                onPress={() => router.push({
                                    pathname: '/digest/[id]',
                                    params: { id: dailyDigests.evening!.id, country: selectedCountry }
                                })}
                            />
                        ) : (
                            <View className="rounded-3xl p-4 border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 min-h-[180px] items-center justify-center opacity-60">
                                <Text className="text-zinc-400 text-center" style={{ fontFamily: 'DMSans_500Medium' }}>Akşam özeti yok</Text>
                            </View>
                        )}
                    </Animated.View>
                </View>

                {!dailyDigests.morning && !dailyDigests.evening && (
                    <Animated.View className="mt-12 items-center" entering={getEntryAnimation(0)}>
                        <BookOpen size={48} color="#e4e4e7" strokeWidth={1.5} />
                        <Text
                            className="text-zinc-400 text-center mt-4"
                            style={{ fontFamily: 'DMSans_400Regular' }}
                        >
                            Bu tarih için henüz bülten oluşturulmamış.
                        </Text>
                    </Animated.View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
