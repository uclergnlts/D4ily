
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Zap, BookOpen, MessageCircle, Clock } from 'lucide-react-native';

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
        case 'breaking': return <Zap size={20} color="#ef4444" />;
        case 'digest': return <BookOpen size={20} color="#006FFF" />;
        case 'interaction': return <MessageCircle size={20} color="#f59e0b" />;
        default: return <Clock size={20} color="#71717a" />;
    }
};

const getBgColor = (type: string) => {
    switch (type) {
        case 'breaking': return 'bg-red-50 dark:bg-red-900/20';
        case 'digest': return 'bg-blue-50 dark:bg-blue-900/20';
        case 'interaction': return 'bg-amber-50 dark:bg-amber-900/20';
        default: return 'bg-zinc-100 dark:bg-zinc-800';
    }
};

export default function NotificationsScreen() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-black" edges={['top']}>
            {/* Header */}
            <View className="px-4 py-3 flex-row items-center bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-10 h-10 items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-full mr-3"
                >
                    <ChevronLeft size={24} color="#18181b" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-zinc-900 dark:text-white">Bildirimler</Text>
                <View className="flex-1" />
                <TouchableOpacity>
                    <Text className="text-sm font-bold text-[#006FFF]">Tümünü Oku</Text>
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 p-4">
                {MOCK_NOTIFICATIONS.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        className={`mb-3 p-4 rounded-2xl border ${item.read
                            ? 'bg-transparent border-transparent opacity-70'
                            : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 shadow-sm'}`}
                    >
                        <View className="flex-row gap-4">
                            <View className={`w-10 h-10 rounded-full items-center justify-center ${getBgColor(item.type)}`}>
                                {getIcon(item.type)}
                            </View>
                            <View className="flex-1 p-1">
                                <View className="flex-row justify-between items-start mb-1">
                                    <Text className={`text-[15px] font-bold ${item.read ? 'text-zinc-600 dark:text-zinc-400' : 'text-zinc-900 dark:text-white'}`}>
                                        {item.title}
                                    </Text>
                                    {!item.read && (
                                        <View className="w-2 h-2 rounded-full bg-[#006FFF] mt-2" />
                                    )}
                                </View>
                                <Text className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-5 mb-2">
                                    {item.message}
                                </Text>
                                <Text className="text-[11px] font-medium text-zinc-400">
                                    {item.time}
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}

                <Text className="text-center text-zinc-400 mt-8 text-xs">Son 30 günün bildirimleri gösteriliyor</Text>
            </ScrollView>
        </SafeAreaView>
    );
}
