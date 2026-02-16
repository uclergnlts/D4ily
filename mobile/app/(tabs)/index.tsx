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
    const activeScheme = useThemeStore(state => state.activeScheme);
    const isDark = activeScheme === 'dark';
    const { selectedCountry, toggleSideMenu } = useAppStore();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [hasAutoSelected, setHasAutoSelected] = useState(false);

    // Initialize period based on time of day (Morning < 17:00 <= Evening)
    const [selectedPeriod, setSelectedPeriod] = useState<'morning' | 'evening'>(() => {
        const hour = new Date().getHours();
        return hour >= 17 ? 'evening' : 'morning';
    });

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

    const currentDigest = useMemo(() => {
        if (!digests) return null;
        const dateStr = selectedDate.toISOString().split('T')[0];
        return digests.find(d => d.date === dateStr && d.period === selectedPeriod);
    }, [digests, selectedDate, selectedPeriod]);

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
        <SafeAreaView className="flex-1 bg-surface-light dark:bg-black" edges={['top']}>
            <View className="px-5 py-4 flex-row items-center justify-between border-b border-zinc-100 dark:border-zinc-800 bg-surface-light dark:bg-black z-10">
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
                            className="text-body-md text-zinc-700 dark:text-zinc-300 font-sans-bold"
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
                        className="text-display-xl text-zinc-900 dark:text-white mb-1 font-display-extrabold"
                        style={{ letterSpacing: -0.5 }}
                        accessibilityRole="header"
                    >
                        {selectedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                    </Text>
                    <Text
                        className="text-body-lg text-zinc-500 dark:text-zinc-400 font-sans-medium"
                    >
                        {selectedDate.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric' })}
                    </Text>
                </Animated.View>

                {/* Period Toggle */}
                <View className="flex-row bg-zinc-100 dark:bg-zinc-900 p-1 rounded-2xl mb-6 border border-zinc-200 dark:border-zinc-800">
                    <TouchableOpacity
                        onPress={() => setSelectedPeriod('morning')}
                        className={`flex-1 flex-row items-center justify-center py-3 rounded-xl gap-2 ${selectedPeriod === 'morning' ? 'bg-white dark:bg-zinc-800 shadow-sm' : ''}`}
                    >
                        <View className={`w-2 h-2 rounded-full ${selectedPeriod === 'morning' ? 'bg-amber-500' : 'bg-zinc-400'}`} />
                        <Text className={`text-body-md font-bold ${selectedPeriod === 'morning' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>
                            Gündüz Bülteni
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setSelectedPeriod('evening')}
                        className={`flex-1 flex-row items-center justify-center py-3 rounded-xl gap-2 ${selectedPeriod === 'evening' ? 'bg-white dark:bg-zinc-800 shadow-sm' : ''}`}
                    >
                        <View className={`w-2 h-2 rounded-full ${selectedPeriod === 'evening' ? 'bg-indigo-500' : 'bg-zinc-400'}`} />
                        <Text className={`text-body-md font-bold ${selectedPeriod === 'evening' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>
                            Akşam Bülteni
                        </Text>
                    </TouchableOpacity>
                </View>

                <Animated.View className="flex-1" entering={getEntryAnimation(1)}>
                    {currentDigest ? (
                        <View className="min-h-[300px]">
                            <DigestCard
                                type={selectedPeriod}
                                title={currentDigest.title}
                                summary={currentDigest.summary}
                                // @ts-ignore
                                onPress={() => router.push({
                                    pathname: '/digest/[id]',
                                    params: { id: currentDigest.id, country: selectedCountry }
                                })}
                            />
                        </View>
                    ) : (
                        <View className="rounded-[24px] p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-surface-subtle dark:bg-surface-subtle-dark min-h-[300px] items-center justify-center">
                            <View className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center mb-4">
                                <BookOpen size={32} color={isDark ? "#52525b" : "#a1a1aa"} />
                            </View>
                            <Text className="text-display-lg text-zinc-900 dark:text-white font-display text-center mb-2">
                                {selectedPeriod === 'morning' ? 'Gündüz' : 'Akşam'} Özeti Yok
                            </Text>
                            <Text className="text-body-md text-zinc-500 text-center font-medium max-w-[250px]">
                                Bu tarih için henüz {selectedPeriod === 'morning' ? 'sabah' : 'akşam'} bülteni oluşturulmamış.
                            </Text>
                        </View>
                    )}
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}
