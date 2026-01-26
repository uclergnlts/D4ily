 
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Bell, Moon, Shield, FileText, Mail, ChevronRight } from 'lucide-react-native';

import { useThemeStore } from '../src/store/useThemeStore';

const SectionHeader = ({ title }: { title: string }) => (
    <Text className="px-6 py-2 text-sm font-bold text-zinc-500 uppercase tracking-wider mb-1 mt-4">
        {title}
    </Text>
);

const SettingsItem = ({
    icon: Icon,
    label,
    value,
    onPress,
    type = 'link',
    color = '#006FFF'
}: {
    icon: any,
    label: string,
    value?: boolean | string,
    onPress?: () => void,
    type?: 'link' | 'toggle' | 'info',
    color?: string
}) => (
    <TouchableOpacity
        className="flex-row items-center px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 active:bg-zinc-50 dark:active:bg-zinc-800/50"
        onPress={type === 'toggle' ? onPress : onPress}
        disabled={type === 'toggle'}
    >
        <View className={`w-8 h-8 rounded-full items-center justify-center mr-4 bg-opacity-10`} style={{ backgroundColor: `${color}20` }}>
            <Icon size={18} color={color} />
        </View>
        <Text className="flex-1 text-base font-medium text-zinc-900 dark:text-white">
            {label}
        </Text>

        {type === 'toggle' && (
            <Switch
                value={value as boolean}
                onValueChange={onPress}
                trackColor={{ false: '#e4e4e7', true: color }}
                thumbColor={'#fff'}
            />
        )}

        {type === 'link' && (
            <ChevronRight size={18} color="#d4d4d8" />
        )}

        {type === 'info' && (
            <Text className="text-zinc-500 text-sm">{value}</Text>
        )}
    </TouchableOpacity>
);

export default function SettingsScreen() {
    const router = useRouter();
    // const [notificationsEnabled, setNotificationsEnabled] = useState(true); // Kept for future use
    const { mode, setMode } = useThemeStore();

    // Simple toggle: If dark, go light. If light or system, go dark (enforce explicit mode)
    const toggleDarkMode = () => {
        setMode(mode === 'dark' ? 'light' : 'dark');
    };

    return (
        <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-black" edges={['top']}>
            {/* Header */}
            <View className="px-4 py-3 flex-row items-center bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-10 h-10 items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-full"
                >
                    <ChevronLeft size={24} color="#18181b" />
                </TouchableOpacity>
                <Text className="flex-1 text-center text-lg font-bold text-zinc-900 dark:text-white mr-10">
                    Ayarlar
                </Text>
            </View>

            <ScrollView className="flex-1">
                <SectionHeader title="Uygulama Tercihleri" />
                <View className="bg-white dark:bg-zinc-900 border-y border-zinc-100 dark:border-zinc-800">
                    <SettingsItem
                        icon={Bell}
                        label="Bildirimler"
                        type="link"
                        onPress={() => router.push('/settings/notifications')}
                        color="#ef4444"
                    />
                    <SettingsItem
                        icon={Moon}
                        label="Karanlık Mod"
                        type="toggle"
                        value={mode === 'dark'}
                        onPress={toggleDarkMode}
                        color="#a855f7"
                    />
                </View>

                <SectionHeader title="Destek ve Hakkında" />
                <View className="bg-white dark:bg-zinc-900 border-y border-zinc-100 dark:border-zinc-800">
                    <SettingsItem
                        icon={Shield}
                        label="Gizlilik Politikası"
                        onPress={() => { }}
                        color="#10b981"
                    />
                    <SettingsItem
                        icon={FileText}
                        label="Kullanım Koşulları"
                        onPress={() => { }}
                        color="#f59e0b"
                    />
                    <SettingsItem
                        icon={Mail}
                        label="İletişim"
                        onPress={() => Alert.alert('İletişim', 'destek@d4ily.com')}
                        color="#3b82f6"
                    />
                </View>

                <View className="p-6 items-center">
                    <Text className="text-zinc-400 text-xs text-center mb-1">
                        D4ILY v1.0.0 (Beta)
                    </Text>
                    <Text className="text-zinc-300 text-[10px] text-center">
                        © 2024 D4ILY Inc. Tüm hakları saklıdır.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
