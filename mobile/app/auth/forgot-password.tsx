import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Mail, ArrowRight, CheckCircle } from 'lucide-react-native';
import { authService } from '../../src/api/services/authService';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSend = async () => {
        if (!email) {
            Alert.alert('Hata', 'Lütfen e-posta adresinizi girin.');
            return;
        }

        setLoading(true);
        try {
            await authService.resetPassword(email);
            setSent(true);
        } catch (error: any) {
            Alert.alert('Hata', error.message || 'Şifre sıfırlama başarısız');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-black p-6">
            <TouchableOpacity
                onPress={() => router.back()}
                className="w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 items-center justify-center mb-8 shadow-sm"
            >
                <ChevronLeft size={24} color="#71717a" />
            </TouchableOpacity>

            <View className="flex-1 px-2">
                <View className="mb-10">
                    <Text
                        className="text-[34px] text-zinc-900 dark:text-white mb-4 font-black leading-[40px] tracking-tight"
                    >
                        Şifreni mi{'\n'}Unuttun?
                    </Text>
                    <Text
                        className="text-zinc-500 font-medium text-lg leading-7"
                    >
                        Endişelenme, e-posta adresini gir, sana sıfırlama bağlantısı gönderelim.
                    </Text>
                </View>

                {sent ? (
                    <View className="bg-green-50 dark:bg-green-900/10 p-6 rounded-3xl items-center border border-green-100 dark:border-green-900/30">
                        <View className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full items-center justify-center mb-4">
                            <CheckCircle size={32} color="#10b981" />
                        </View>
                        <Text className="text-xl font-bold text-zinc-900 dark:text-white mb-2 text-center">
                            Kontrol Et!
                        </Text>
                        <Text className="text-zinc-500 text-center mb-6">
                            <Text className="font-bold text-zinc-900 dark:text-white">{email}</Text> adresine talimatları gönderdik.
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            className="bg-zinc-900 dark:bg-white px-8 py-3 rounded-xl"
                        >
                            <Text className="font-bold text-white dark:text-zinc-900">Giriş Yap</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View className="gap-6">
                        <View>
                            <Text className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase mb-2 ml-1 tracking-wider">E-posta Adresin</Text>
                            <View className="flex-row items-center bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-4 focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-900 transition-all">
                                <Mail size={20} color="#a1a1aa" className="mr-3" />
                                <TextInput
                                    className="flex-1 text-zinc-900 dark:text-white font-medium text-[16px] h-full"
                                    placeholder="ornek@email.com"
                                    placeholderTextColor="#a1a1aa"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            className="bg-[#006FFF] p-5 rounded-2xl flex-row items-center justify-center shadow-lg shadow-blue-500/30 active:scale-[0.98]"
                            onPress={handleSend}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Text className="text-white text-lg mr-2 font-bold">Bağlantı Gönder</Text>
                                    <ArrowRight size={20} color="white" />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}
