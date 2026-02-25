import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { safeBack } from '../src/utils/navigation';
import { ChevronLeft, Zap, BookOpen, MessageCircle, Clock } from 'lucide-react-native';
import { useThemeStore } from '../src/store/useThemeStore';

const MOCK_NOTIFICATIONS = [
    {
        id: '1',
        type: 'breaking',
        title: 'Son Dakika: Merkez Bankası Faiz Kararı',
        message: 'Merkez Bankası politika faizini 500 baz puan artırarak %40 seviyesine yükseltti.',
        time: '2 dk önce',
        read: false,
    },
    {
        id: '2',
        type: 'digest',
        title: 'Günlük Bülten Hazır',
        message: 'Sabah özetin seni bekliyor. Bugünün önemli başlıklarına göz at.',
        time: '3 saat önce',
        read: true,
    },
    {
        id: '3',
        type: 'interaction',
        title: 'Yorumuna Yanıt Geldi',
        message: 'Ahmet Yılmaz senin "Ekonomi Politikaları" hakkındaki yorumuna yanıt verdi.',
        time: '5 saat önce',
        read: true,
    },
    {
        id: '4',
        type: 'analysis',
        title: 'Haftalık Analiz: Yapay Zeka',
        message: 'Teknoloji dünyasında geçen haftanın en kritik gelişmeleri ve analizler.',
        time: '1 gün önce',
        read: true,
    },
];

const getIcon = (type: string) => {
    switch (type) {
        case 'breaking': return <Zap size={22} color="#EF4444" />;
        case 'digest': return <BookOpen size={22} color="#0A66C2" />;
        case 'interaction': return <MessageCircle size={22} color="#F59E0B" />;
        default: return <Clock size={22} color="#71717A" />;
    }
};

const getBgColor = (type: string) => {
    switch (type) {
        case 'breaking': return 'bg-red-50 dark:bg-red-900/20';
        case 'digest': return 'bg-primary-50 dark:bg-primary-900/20';
        case 'interaction': return 'bg-amber-50 dark:bg-amber-900/20';
        default: return 'bg-surface-light-subtle dark:bg-surface-dark-subtle';
    }
};

export default function NotificationsScreen() {
    const router = useRouter();
    const activeScheme = useThemeStore(state => state.activeScheme);
    const isDark = activeScheme === 'dark';

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
                    Bildirimler
                </Text>
                <TouchableOpacity className="w-11 h-11 items-center justify-center">
                    <Text className="text-body-xs font-sans-bold tracking-widest text-primary uppercase">Tümü</Text>
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-5 pt-5" showsVerticalScrollIndicator={false}>
                {MOCK_NOTIFICATIONS.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        className={`mb-4 p-5 rounded-3xl border border-border-light dark:border-border-dark ${item.read
                            ? 'bg-transparent border-transparent opacity-70'
                            : 'bg-surface-light-elevated dark:bg-surface-dark-elevated shadow-sm shadow-zinc-200/50 dark:shadow-none'}`}
                        activeOpacity={item.read ? 1 : 0.7}
                    >
                        <View className="flex-row gap-4 items-start">
                            <View className={`w-12 h-12 rounded-full items-center justify-center shrink-0 ${getBgColor(item.type)}`}>
                                {getIcon(item.type)}
                            </View>
                            <View className="flex-1">
                                <View className="flex-row justify-between items-start mb-1.5">
                                    <View className="flex-1 pr-3">
                                        <Text className={`text-body-lg font-sans-bold ${item.read ? 'text-zinc-600 dark:text-zinc-400' : 'text-zinc-900 dark:text-white'}`}>
                                            {item.title}
                                        </Text>
                                    </View>
                                    {!item.read && (
                                        <View className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5 shrink-0 shadow-sm" />
                                    )}
                                </View>
                                <Text className="text-body-sm font-sans text-zinc-500 dark:text-zinc-400 leading-[22px] mb-3">
                                    {item.message}
                                </Text>
                                <Text className="text-body-xs font-sans-medium text-zinc-400 tracking-wide uppercase">
                                    {item.time}
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}

                <Text className="text-center text-zinc-400 mt-8 mb-12 text-body-xs font-sans-medium tracking-wide">
                    Son 30 günün bildirimleri gösteriliyor
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}
