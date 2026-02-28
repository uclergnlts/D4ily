import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { safeBack } from '../src/utils/navigation';
import { ChevronLeft, Bell, Moon, Shield, FileText, Mail, ChevronRight, Sparkles } from 'lucide-react-native';

import { useThemeStore } from '../src/store/useThemeStore';

const SectionHeader = ({ title }: { title: string }) => (
    <Text className="px-5 py-2 text-body-sm font-sans-bold text-zinc-500 uppercase tracking-widest mb-2 mt-6">
        {title}
    </Text>
);

const SettingsItem = ({
    icon: Icon,
    label,
    value,
    onPress,
    type = 'link',
    color = '#0A66C2',
    isFirst = false,
    isLast = false
}: {
    icon: any,
    label: string,
    value?: boolean | string,
    onPress?: () => void,
    type?: 'link' | 'toggle' | 'info',
    color?: string,
    isFirst?: boolean,
    isLast?: boolean
}) => (
    <TouchableOpacity
        className={`flex-row items-center px-5 py-4 bg-surface-light-elevated dark:bg-surface-dark-elevated active:bg-surface-light-subtle dark:active:bg-surface-dark-subtle transition-colors
            ${!isLast ? 'border-b border-border-light dark:border-border-dark' : ''}
            ${isFirst ? 'rounded-t-3xl' : ''}
            ${isLast ? 'rounded-b-3xl' : ''}
        `}
        onPress={type === 'toggle' ? onPress : onPress}
        disabled={type === 'toggle'}
        activeOpacity={0.7}
    >
        <View className="w-9 h-9 rounded-full items-center justify-center mr-4" style={{ backgroundColor: `${color}20` }}>
            <Icon size={18} color={color} />
        </View>
        <Text className="flex-1 text-body-lg font-sans-medium text-zinc-900 dark:text-white">
            {label}
        </Text>

        {type === 'toggle' && (
            <Switch
                value={value as boolean}
                onValueChange={onPress}
                trackColor={{ false: '#E5E7EB', true: color }}
                thumbColor={'#FFFFFF'}
            />
        )}

        {type === 'link' && (
            <ChevronRight size={20} color="#A1A1AA" />
        )}

        {type === 'info' && (
            <Text className="text-body-sm font-sans text-zinc-500">{value}</Text>
        )}
    </TouchableOpacity>
);

export default function SettingsScreen() {
    const router = useRouter();
    const { mode, setMode } = useThemeStore();
    const activeScheme = useThemeStore(state => state.activeScheme);
    const isDark = activeScheme === 'dark';

    const toggleDarkMode = () => {
        setMode(mode === 'dark' ? 'light' : 'dark');
    };

    const openURL = async (url: string) => {
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert('Hata', 'Bu bağlantı açılamıyor.');
            }
        } catch {
            Alert.alert('Hata', 'Bağlantı açılırken bir sorun oluştu.');
        }
    };

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
                    Ayarlar
                </Text>
                <View className="w-11 h-11" />
            </View>

            <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
                <SectionHeader title="Uygulama Tercihleri" />
                <View className="rounded-3xl border border-border-light dark:border-border-dark shadow-sm shadow-zinc-200/50 dark:shadow-none mb-4 overflow-hidden">
                    <SettingsItem
                        icon={Bell}
                        label="Bildirimler"
                        type="link"
                        onPress={() => router.push('/settings/notifications')}
                        color="#EF4444"
                        isFirst={true}
                    />
                    <SettingsItem
                        icon={Sparkles}
                        label="İlgi Alanları"
                        type="link"
                        onPress={() => router.push('/settings/categories')}
                        color="#818CF8"
                    />
                    <SettingsItem
                        icon={Moon}
                        label="Karanlık Mod"
                        type="toggle"
                        value={mode === 'dark'}
                        onPress={toggleDarkMode}
                        color="#A855F7"
                        isLast={true}
                    />
                </View>

                <SectionHeader title="Destek ve Hakkında" />
                <View className="rounded-3xl border border-border-light dark:border-border-dark shadow-sm shadow-zinc-200/50 dark:shadow-none mb-6 overflow-hidden">
                    <SettingsItem
                        icon={Shield}
                        label="Gizlilik Politikası"
                        onPress={() => openURL('https://d4ily.com/privacy')}
                        color="#10B981"
                        isFirst={true}
                    />
                    <SettingsItem
                        icon={FileText}
                        label="Kullanım Koşulları"
                        onPress={() => openURL('https://d4ily.com/terms')}
                        color="#FBBF24"
                    />
                    <SettingsItem
                        icon={Mail}
                        label="İletişim"
                        onPress={() => openURL('mailto:destek@d4ily.com')}
                        color="#0A66C2"
                        isLast={true}
                    />
                </View>

                <View className="p-6 items-center mb-10">
                    <Text className="text-zinc-400 text-body-sm font-sans mb-1">
                        D4ILY v1.0.0 (Beta)
                    </Text>
                    <Text className="text-zinc-500 text-body-xs font-sans">
                        © 2026 D4ILY Inc. Tüm hakları saklıdır.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
