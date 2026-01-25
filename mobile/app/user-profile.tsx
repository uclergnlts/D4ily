/* eslint-disable react/display-name */
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, Award, Shield, BookOpen, ChevronLeft, User } from 'lucide-react-native';

import { useAuthStore } from '../src/store/useAuthStore';
import { useUserProfile, useUserReputation } from '../src/hooks/useUser';
import { ReputationCard } from '../src/components/profile/ReputationCard';
import { StatsOverview } from '../src/components/profile/StatsOverview';
import { ProfileHeader } from '../src/components/profile/ProfileHeader';

const SettingsItem = ({ icon: Icon, label, onPress, showChevron = true }: any) => (
    <TouchableOpacity
        className="flex-row items-center p-4 bg-white dark:bg-zinc-900 active:bg-zinc-50 dark:active:bg-zinc-800/50"
        onPress={onPress}
    >
        <View className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center mr-3">
            <Icon size={18} color="#71717a" />
        </View>
        <Text className="flex-1 text-base font-medium text-zinc-900 dark:text-white">
            {label}
        </Text>
        {showChevron && <ChevronRight size={18} color="#d4d4d8" />}
    </TouchableOpacity>
);

export default function UserProfileScreen() {
    const { user, logout } = useAuthStore();
    const router = useRouter();

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
                    // router.replace('/'); // Optional
                }
            }
        ]);
    };

    if (!user) {
        return (
            // Should ideally redirect or show generic
            <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-black items-center justify-center p-8">
                <Text>Lütfen giriş yapın.</Text>
            </SafeAreaView>
        );
    }

    if (isProfileLoading || isReputationLoading) {
        return (
            <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-black items-center justify-center">
                <ActivityIndicator size="large" color="#006FFF" />
            </SafeAreaView>
        );
    }

    const accuracy = reputation?.accuracyPercentage || 0;

    return (
        <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-black" edges={['top']}>
            <View className="px-4 py-2 flex-row items-center border-b border-zinc-100 dark:border-zinc-800">
                <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                    <ChevronLeft size={24} color="#18181b" />
                </TouchableOpacity>
                <Text className="text-lg font-bold ml-2">Profilim</Text>
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>

                {/* Header */}
                <View className="px-6 pt-4 pb-6">
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
                    <Text className="px-6 text-lg font-bold text-zinc-900 dark:text-white mb-4">
                        Rozet Koleksiyonu
                    </Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 20 }}
                        className="gap-3"
                    >
                        <View className="bg-white dark:bg-zinc-900/50 p-4 rounded-2xl border-2 border-primary w-36 items-center shadow-sm">
                            <View className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-full mb-3">
                                <Award size={28} color="#006FFF" />
                            </View>
                            <Text className="font-bold text-zinc-900 dark:text-white text-center text-sm mb-1">İlk Adım</Text>
                            <Text className="text-[10px] text-zinc-400 text-center font-medium">Hesap oluşturuldu</Text>
                        </View>

                        <View className="bg-zinc-100 dark:bg-zinc-900/50 p-4 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 w-36 items-center opacity-60">
                            <View className="bg-zinc-200 dark:bg-zinc-800 p-3 rounded-full mb-3">
                                <Shield size={28} color="#a1a1aa" />
                            </View>
                            <Text className="font-bold text-zinc-500 text-center text-sm mb-1">Doğruluk Bekçisi</Text>
                            <Text className="text-[10px] text-zinc-500 text-center font-medium">50 doğru oy ver</Text>
                        </View>
                    </ScrollView>
                </View>

                {/* Settings Group */}
                <View className="mx-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden shadow-sm">
                    <SettingsItem
                        icon={User}
                        label="Profili Düzenle"
                        onPress={() => router.push('/profile/edit')}
                    />
                    <SettingsItem
                        icon={BookOpen}
                        label="Hakkında"
                        onPress={() => Alert.alert('Bilgi', 'D4ily v1.0.0 (Beta)')}
                    />
                    {/* Add more settings items here */}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}
