import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Camera, Check } from 'lucide-react-native';
import { useAuthStore } from '../../src/store/useAuthStore';

export default function EditProfileScreen() {
    const router = useRouter();
    const { user } = useAuthStore();

    // Mock Form State
    const [name, setName] = useState('Umut Çlağır'); // Default or fetch from store
    const [bio, setBio] = useState('Teknoloji meraklısı ve haber takibi sever.');
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = () => {
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            Alert.alert('Başarılı', 'Profil bilgileriniz güncellendi.');
            router.back();
        }, 1200);
    };

    return (
        <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-black" edges={['top']}>
            {/* Header */}
            <View className="px-4 py-3 flex-row items-center justify-between bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
                <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-full">
                    <ChevronLeft size={24} color="#18181b" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-zinc-900 dark:text-white">Profili Düzenle</Text>
                <TouchableOpacity onPress={handleSave} disabled={isLoading}>
                    {isLoading ? (
                        <ActivityIndicator size="small" color="#006FFF" />
                    ) : (
                        <Text className="text-primary font-bold text-base">Kaydet</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">

                    {/* Avatar Section */}
                    <View className="items-center py-8">
                        <View className="relative">
                            <Image
                                source={{ uri: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&auto=format&fit=crop&q=60' }} // Mock Avatar
                                style={{ width: 100, height: 100, borderRadius: 50 }}
                                className="bg-zinc-200"
                            />
                            <TouchableOpacity className="absolute bottom-0 right-0 bg-primary p-2 rounded-full border-2 border-white dark:border-black">
                                <Camera size={16} color="white" />
                            </TouchableOpacity>
                        </View>
                        <Text className="mt-3 text-primary font-bold text-sm">Fotoğrafı Değiştir</Text>
                    </View>

                    {/* Form Fields */}
                    <View className="px-6 gap-6">
                        <View>
                            <Text className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-1">Ad Soyad</Text>
                            <TextInput
                                value={name}
                                onChangeText={setName}
                                className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-medium text-base"
                            />
                        </View>

                        <View>
                            <Text className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-1">Biyografi</Text>
                            <TextInput
                                value={bio}
                                onChangeText={setBio}
                                multiline
                                numberOfLines={3}
                                className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-medium text-base min-h-[100px]"
                                textAlignVertical="top"
                            />
                            <Text className="text-right text-xs text-zinc-400 mt-2">{bio.length}/150</Text>
                        </View>

                        <View>
                            <Text className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-1">E-posta</Text>
                            <View className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 opacity-60">
                                <Text className="text-zinc-500 dark:text-zinc-400">{user?.email || 'user@example.com'}</Text>
                            </View>
                            <Text className="text-xs text-zinc-400 mt-2 ml-1">E-posta adresi değiştirilemez.</Text>
                        </View>
                    </View>

                </KeyboardAvoidingView>
            </ScrollView>
        </SafeAreaView>
    );
}
