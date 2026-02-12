import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDigests } from '../../src/hooks/useDigest';
import { BookOpen, ChevronLeft, ChevronRight, Calendar, Menu } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { DigestCard } from '../../src/components/digest/DigestCard';
import { CountrySelector } from '../../src/components/navigation/CountrySelector';
import { useAppStore } from '../../src/store/useAppStore';
import { useCII } from '../../src/hooks/useCII';
import { CIIBadge } from '../../src/components/ui/CIIBadge';

export default function HomeScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { selectedCountry, toggleSideMenu } = useAppStore();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [hasAutoSelected, setHasAutoSelected] = useState(false);

    const { data: digests, isLoading, refetch, isRefetching } = useDigests(selectedCountry);
    const { data: ciiData } = useCII(selectedCountry);

    // Auto-select the latest available digest date when data loads
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

    // Filter digests for selected date
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
        return date.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
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
            {/* Header: Country & Date Selector */}
            <View className="px-5 py-4 flex-row items-center justify-between border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-black z-10">
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity onPress={toggleSideMenu} className="p-1 -ml-1">
                        <Menu size={24} color={isDark ? "#ffffff" : "#18181b"} />
                    </TouchableOpacity>
                    <CountrySelector />
                    <CIIBadge data={ciiData} compact />
                </View>

                <View className="flex-row items-center bg-white dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 shadow-sm">
                    <TouchableOpacity onPress={() => changeDate(-1)} className="p-1">
                        <ChevronLeft size={20} color="#71717a" />
                    </TouchableOpacity>

                    <View className="flex-row items-center mx-2 gap-2">
                        <Calendar size={14} color="#71717a" />
                        <Text className="text-[14px] font-bold text-zinc-700 dark:text-zinc-300">
                            {formatDateDisplay(selectedDate)}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={() => changeDate(1)}
                        disabled={isToday}
                        className="p-1"
                        style={{ opacity: isToday ? 0.3 : 1 }}
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
                {/* Date Title */}
                <View className="mb-6 items-center">
                    <Text className="text-[28px] font-black text-zinc-900 dark:text-white mb-1">
                        {selectedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                    </Text>
                    <Text className="text-[16px] font-medium text-zinc-500 dark:text-zinc-400">
                        {selectedDate.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric' })}
                    </Text>
                </View>

                {/* Digests Row */}
                <View className="flex-row gap-4">
                    {/* Morning Card */}
                    {dailyDigests.morning ? (
                        <DigestCard
                            type="morning"
                            title={dailyDigests.morning.title}
                            summary={dailyDigests.morning.summary}
                            // @ts-ignore
                            onPress={() => router.push({
                                pathname: '/digest/[id]',
                                params: { id: dailyDigests.morning!.id }
                            })}
                        />
                    ) : (
                        <View className="flex-1 rounded-2xl p-4 border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 min-h-[180px] items-center justify-center opacity-60">
                            <Text className="text-zinc-400 text-center font-medium">Gündüz özeti yok</Text>
                        </View>
                    )}

                    {/* Evening Card */}
                    {dailyDigests.evening ? (
                        <DigestCard
                            type="evening"
                            title={dailyDigests.evening.title}
                            summary={dailyDigests.evening.summary}
                            // @ts-ignore
                            onPress={() => router.push({
                                pathname: '/digest/[id]',
                                params: { id: dailyDigests.evening!.id }
                            })}
                        />
                    ) : (
                        <View className="flex-1 rounded-2xl p-4 border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 min-h-[180px] items-center justify-center opacity-60">
                            <Text className="text-zinc-400 text-center font-medium">Akşam özeti yok</Text>
                        </View>
                    )}
                </View>

                {/* Helper / Status */}
                {!dailyDigests.morning && !dailyDigests.evening && (
                    <View className="mt-12 items-center">
                        <BookOpen size={48} color="#e4e4e7" strokeWidth={1.5} />
                        <Text className="text-zinc-400 text-center mt-4">
                            Bu tarih için henüz bülten oluşturulmamış.
                        </Text>
                    </View>
                )}

            </ScrollView>
        </SafeAreaView>
    );
}
