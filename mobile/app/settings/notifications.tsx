import React, { useEffect, useState } from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Bell, Zap, BookOpen, Clock, Users } from 'lucide-react-native';
import { useAuthStore } from '../../src/store/useAuthStore';

interface NotificationPrefs {
    notifBreakingNews: boolean;
    notifDailyDigest: boolean;
    notifWeeklyComparison: boolean;
    notifComments: boolean;
    notifAlignmentChanges: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
    notifBreakingNews: true,
    notifDailyDigest: true,
    notifWeeklyComparison: true,
    notifComments: true,
    notifAlignmentChanges: true,
};

function NotificationOption({
    icon: Icon,
    label,
    description,
    value,
    onToggle,
    color = "#006FFF"
}: {
    icon: any;
    label: string;
    description: string;
    value: boolean;
    onToggle: () => void;
    color?: string;
}) {
    return (
        <View className="flex-row items-center justify-between p-4 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
            <View className="flex-row items-center flex-1 mr-4">
                <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: `${color}20` }}>
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
                thumbColor="#fff"
            />
        </View>
    );
}

export default function NotificationsScreen() {
    const router = useRouter();
    const token = useAuthStore(state => state.token);
    const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) { setLoading(false); return; }

        fetch(`${process.env.EXPO_PUBLIC_API_URL}/notifications/preferences`, {
            headers: { 'Authorization': `Bearer ${token}` },
        })
            .then(res => res.json())
            .then(({ data }) => {
                if (data) {
                    setPrefs({
                        notifBreakingNews: data.notifBreakingNews ?? true,
                        notifDailyDigest: data.notifDailyDigest ?? true,
                        notifWeeklyComparison: data.notifWeeklyComparison ?? true,
                        notifComments: data.notifComments ?? true,
                        notifAlignmentChanges: data.notifAlignmentChanges ?? true,
                    });
                }
            })
            .catch(console.warn)
            .finally(() => setLoading(false));
    }, [token]);

    const togglePref = async (key: keyof NotificationPrefs) => {
        const newValue = !prefs[key];
        setPrefs(prev => ({ ...prev, [key]: newValue }));

        if (!token) return;

        try {
            await fetch(`${process.env.EXPO_PUBLIC_API_URL}/notifications/preferences`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ [key]: newValue }),
            });
        } catch (error) {
            setPrefs(prev => ({ ...prev, [key]: !newValue }));
            console.warn('Failed to update notification preference:', error);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-black" edges={['top']}>
            <View className="px-4 py-3 flex-row items-center bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
                <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-full mr-3">
                    <ChevronLeft size={24} color="#18181b" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-zinc-900 dark:text-white">Bildirim Ayarları</Text>
                {loading && <ActivityIndicator size="small" color="#006FFF" style={{ marginLeft: 8 }} />}
            </View>

            <ScrollView className="flex-1">
                <View className="mt-4">
                    <Text className="px-6 pb-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">Haber Bildirimleri</Text>
                    <View className="border-t border-zinc-200 dark:border-zinc-800">
                        <NotificationOption
                            icon={Zap}
                            label="Son Dakika"
                            description="Önemli gelişmelerden anında haberdar ol."
                            value={prefs.notifBreakingNews}
                            onToggle={() => togglePref('notifBreakingNews')}
                            color="#ef4444"
                        />
                        <NotificationOption
                            icon={BookOpen}
                            label="Günlük Bülten"
                            description="Sabah ve akşam günün özeti."
                            value={prefs.notifDailyDigest}
                            onToggle={() => togglePref('notifDailyDigest')}
                            color="#006FFF"
                        />
                        <NotificationOption
                            icon={Clock}
                            label="Haftalık Analiz"
                            description="Pazar günleri haftanın derinlemesine analizi."
                            value={prefs.notifWeeklyComparison}
                            onToggle={() => togglePref('notifWeeklyComparison')}
                            color="#a855f7"
                        />
                    </View>
                </View>

                <View className="mt-6">
                    <Text className="px-6 pb-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">Etkileşimler</Text>
                    <View className="border-t border-zinc-200 dark:border-zinc-800">
                        <NotificationOption
                            icon={Bell}
                            label="Yorum ve Yanıtlar"
                            description="Yorumuna yanıt geldiğinde bildir."
                            value={prefs.notifComments}
                            onToggle={() => togglePref('notifComments')}
                            color="#f59e0b"
                        />
                        <NotificationOption
                            icon={Users}
                            label="Kaynak Güncellemeleri"
                            description="Takip ettiğin kaynakların durumu değişince bildir."
                            value={prefs.notifAlignmentChanges}
                            onToggle={() => togglePref('notifAlignmentChanges')}
                            color="#10b981"
                        />
                    </View>
                </View>

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
