import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { safeBack } from '../src/utils/navigation';
import { ChevronRight, Award, Shield, BookOpen, ChevronLeft, User } from 'lucide-react-native';

import { useAuthStore } from '../src/store/useAuthStore';
import { useUserProfile, useUserReputation } from '../src/hooks/useUser';
import { ReputationCard } from '../src/components/profile/ReputationCard';
import { StatsOverview } from '../src/components/profile/StatsOverview';
import { ProfileHeader } from '../src/components/profile/ProfileHeader';
import { useThemeStore } from '../src/store/useThemeStore';

const SettingsItem = ({ icon: Icon, label, onPress, showChevron = true, isFirst = false, isLast = false }: any) => (
    <TouchableOpacity
        className={`flex-row items-center px-5 py-4 bg-surface-light-elevated dark:bg-surface-dark-elevated active:bg-surface-light-subtle dark:active:bg-surface-dark-subtle transition-colors
            ${!isLast ? 'border-b border-border-light dark:border-border-dark' : ''}
            ${isFirst ? 'rounded-t-3xl' : ''}
            ${isLast ? 'rounded-b-3xl' : ''}
        `}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View className="w-9 h-9 rounded-full bg-surface-light-subtle dark:bg-surface-dark-subtle items-center justify-center mr-4">
            <Icon size={18} color="#71717A" />
        </View>
        <Text className="flex-1 text-body-lg font-sans-medium text-zinc-900 dark:text-white">
            {label}
        </Text>
        {showChevron && <ChevronRight size={20} color="#A1A1AA" />}
    </TouchableOpacity>
);

export default function UserProfileScreen() {
    const { user, logout } = useAuthStore();
    const router = useRouter();
    const activeScheme = useThemeStore(state => state.activeScheme);
    const isDark = activeScheme === 'dark';

    const { data: profile, isLoading: isProfileLoading } = useUserProfile();
    const { data: reputation, isLoading: isReputationLoading } = useUserReputation();

    const handleLogout = () => {
        Alert.alert('Çıkış Yap', 'Hesabından çıkmak istediğine emin misin?', [
            { text: 'Vazgeç', style: 'cancel' },
            {
                text: 'Çıkış Yap',
                style: 'destructive',
                onPress: async () => {
                    await logout();
                }
            }
        ]);
    };

    if (!user) {
        return (
            <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark items-center justify-center p-8">
                <Text className="text-body-lg font-sans-medium text-zinc-500">Lütfen giriş yapın.</Text>
            </SafeAreaView>
        );
    }

    if (isProfileLoading || isReputationLoading) {
        return (
            <SafeAreaView className="flex-1 bg-surface-light dark:bg-surface-dark items-center justify-center">
                <ActivityIndicator size="large" color="#0A66C2" />
            </SafeAreaView>
        );
    }

    const accuracy = reputation?.accuracyPercentage || 0;

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
                    Profilim
                </Text>
                <View className="w-11 h-11" />
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <View className="px-5 pt-6 pb-6">
                    <ProfileHeader
                        user={{
                            email: user.email,
                            name: profile?.name,
                            avatarUrl: profile?.avatarUrl || undefined
                        }}
                        level={reputation?.level || 'Yeni Üye'}
                        onLogout={handleLogout}
                        onSettingsPress={() => router.push('/settings' as any)}
                    />
                </View>

                {/* Level Progress */}
                <View className="mx-5 mb-6">
                    <ReputationCard
                        level={reputation?.level || 'Yeni Üye'}
                        accuracyPercentage={accuracy}
                    />
                </View>

                {/* Stats Grid */}
                <View className="mx-5 mb-8">
                    <StatsOverview
                        totalVotes={reputation?.totalVotes || 0}
                        accurateVotes={reputation?.accurateVotes || 0}
                    />
                </View>

                {/* Badges Section */}
                <View className="mb-8">
                    <Text className="px-6 text-body-lg font-sans-black tracking-tight text-zinc-900 dark:text-white mb-4">
                        Rozet Koleksiyonu
                    </Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
                    >
                        <View className="bg-surface-light-elevated dark:bg-surface-dark-elevated p-5 rounded-3xl border border-primary w-40 items-center shadow-sm shadow-zinc-200/50 dark:shadow-none">
                            <View className="bg-primary-50 dark:bg-primary-900/30 p-4 rounded-full mb-4">
                                <Award size={28} color="#0A66C2" />
                            </View>
                            <Text className="font-sans-bold text-zinc-900 dark:text-white text-center text-body-md mb-1">İlk Adım</Text>
                            <Text className="text-body-xs text-zinc-500 text-center font-sans tracking-wide">Hesap oluşturuldu</Text>
                        </View>

                        <View className="bg-surface-light-subtle dark:bg-surface-dark-subtle p-5 rounded-3xl border border-dashed border-border-light dark:border-border-dark w-40 items-center opacity-60">
                            <View className="bg-border-light dark:bg-border-dark p-4 rounded-full mb-4">
                                <Shield size={28} color="#A1A1AA" />
                            </View>
                            <Text className="font-sans-bold text-zinc-500 text-center text-body-md mb-1">Doğruluk Bekçisi</Text>
                            <Text className="text-body-xs text-zinc-500 text-center font-sans tracking-wide">50 doğru oy ver</Text>
                        </View>
                    </ScrollView>
                </View>

                {/* Settings Group */}
                <View className="mx-5 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-3xl border border-border-light dark:border-border-dark overflow-hidden shadow-sm shadow-zinc-200/50 dark:shadow-none mb-4">
                    <SettingsItem
                        icon={User}
                        label="Profili Düzenle"
                        onPress={() => router.push('/profile/edit')}
                        isFirst={true}
                    />
                    <SettingsItem
                        icon={BookOpen}
                        label="Hakkında"
                        onPress={() => Alert.alert('Bilgi', 'D4ily v1.0.0 (Beta)')}
                        isLast={true}
                    />
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}
