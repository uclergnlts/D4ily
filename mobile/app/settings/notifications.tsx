/* eslint-disable react/display-name */
import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Bell, Zap, BookOpen, Clock } from 'lucide-react-native';

function NotificationOption({
    icon: Icon,
    label,
    description,
    value,
    onToggle,
    color = "#006FFF"
}: any) {
    return (
        <View className="flex-row items-center justify-between p-4 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
            <View className="flex-row items-center flex-1 mr-4">
                <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 bg-opacity-10`} style={{ backgroundColor: `${color}20` }}>
                    <Icon size={20} color={color} />
                </View>
                <View className="flex-1">
                    <Text className="text-base font-bold text-zinc-900 dark:text-white mb-0.5">{label}</Text>
                    <Text className="text-xs text-zinc-500 leading-4">{description}</Text>
                </View>
            </View>
            <Switch
                value={value}
                onValueChange={onToggle}
                trackColor={{ false: '#e4e4e7', true: color }}
                thumbColor={'#fff'}
            />
        </View>
    );
}


NotificationOption.displayName = 'NotificationOption';

export default function NotificationsScreen() {
    const router = useRouter();

    // Mock State
    const [settings, setSettings] = useState({
        breakingDetails: true,
        dailyDigest: true,
        weeklyAnalysis: false,
        mentions: true,
        marketing: false,
    });

    const toggleCheck = (key: keyof typeof settings) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-black" edges={['top']}>
            {/* Header */}
            <View className="px-4 py-3 flex-row items-center bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
                <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-full mr-3">
                    <ChevronLeft size={24} color="#18181b" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-zinc-900 dark:text-white">Bildirim Ayarları</Text>
            </View>

            <ScrollView className="flex-1">

                {/* News Alerts */}
                <View className="mt-4">
                    <Text className="px-6 pb-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">Haber Bildirimleri</Text>
                    <View className="border-t border-zinc-200 dark:border-zinc-800">
                        <NotificationOption
                            icon={Zap}
                            label="Son Dakika"
                            description="Önemli gelişmelerden anında haberdar ol."
                            value={settings.breakingDetails}
                            onToggle={() => toggleCheck('breakingDetails')}
                            color="#ef4444"
                        />
                        <NotificationOption
                            icon={BookOpen}
                            label="Günlük Bülten"
                            description="Her sabah 08:00'de günün özeti."
                            value={settings.dailyDigest}
                            onToggle={() => toggleCheck('dailyDigest')}
                            color="#006FFF"
                        />
                        <NotificationOption
                            icon={Clock}
                            label="Haftalık Analiz"
                            description="Pazar günleri haftanın derinlemesine analizi."
                            value={settings.weeklyAnalysis}
                            onToggle={() => toggleCheck('weeklyAnalysis')}
                            color="#a855f7"
                        />
                    </View>
                </View>

                {/* Interaction Alerts */}
                <View className="mt-6">
                    <Text className="px-6 pb-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">Etkileşimler</Text>
                    <View className="border-t border-zinc-200 dark:border-zinc-800">
                        <NotificationOption
                            icon={Bell}
                            label="Yorum ve Yanıtlar"
                            description="Yorumuna yanıt geldiğinde bildir."
                            value={settings.mentions}
                            onToggle={() => toggleCheck('mentions')}
                            color="#f59e0b"
                        />
                    </View>
                </View>

                {/* Tip Box */}
                <View className="m-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                    <Text className="text-blue-700 dark:text-blue-300 font-bold text-sm mb-1">İpucu</Text>
                    <Text className="text-blue-600 dark:text-blue-400 text-xs leading-5">
                        Bildirimleri sessize almak için cihazınızın "Rahatsız Etme" modunu kullanabilirsiniz. Uygulama içi ayarlar anında geçerli olur.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
