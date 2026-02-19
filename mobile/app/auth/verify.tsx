import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Mail } from 'lucide-react-native';
import { authService } from '../../src/api/services/authService';

export default function VerifyEmailScreen() {
    const router = useRouter();
    const { email } = useLocalSearchParams();
    const [code, setCode] = useState(['', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const inputs = useRef<(TextInput | null)[]>([]);

    const handleInput = (text: string, index: number) => {
        const newCode = [...code];
        newCode[index] = text;
        setCode(newCode);

        if (text && index < 4) {
            inputs.current[index + 1]?.focus();
        }

        if (newCode.every(c => c !== '')) {
            Keyboard.dismiss();
        }
    };

    const handleVerify = async () => {
        const oobCode = code.join('');
        if (oobCode.length !== 5) {
            Alert.alert('Hata', 'Lütfen 5 haneli doğrulama kodunu girin.');
            return;
        }

        setLoading(true);
        try {
            await authService.verifyEmailCode(oobCode);
            // Navigate to next step: Source Selection
            router.push('/onboarding/sources');
        } catch (error: any) {
            Alert.alert('Hata', error.message || 'Doğrulama başarısız');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-black p-6">
            <TouchableOpacity
                onPress={() => router.back()}
                className="mb-8 w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 items-center justify-center shadow-sm"
            >
                <ChevronLeft size={24} color="#71717a" />
            </TouchableOpacity>

            <View className="flex-1 items-center pt-6">
                <View className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full items-center justify-center mb-6 ring-4 ring-blue-50 dark:ring-blue-900/10">
                    <Mail size={32} color="#006FFF" />
                </View>

                <Text
                    className="text-3xl text-zinc-900 dark:text-white text-center mb-3 font-bold"
                >
                    E-postanı Doğrula
                </Text>

                <Text
                    className="text-zinc-500 text-center mb-10 px-4 leading-relaxed text-[15px]"
                >
                    <Text className="font-bold text-zinc-900 dark:text-white">{email}</Text> adresine gönderdiğimiz 5 haneli doğrulama kodunu gir.
                </Text>

                <View className="flex-row gap-3 mb-10">
                    {code.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={(ref) => { inputs.current[index] = ref; }}
                            className="w-14 h-16 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-center text-2xl font-bold text-zinc-900 dark:text-white focus:border-blue-500 focus:bg-white dark:focus:bg-black"
                            maxLength={1}
                            keyboardType="number-pad"
                            value={digit}
                            onChangeText={(text) => handleInput(text, index)}
                            selectTextOnFocus
                        />
                    ))}
                </View>

                <TouchableOpacity
                    className="bg-[#006FFF] w-full py-4 rounded-2xl items-center shadow-lg shadow-blue-500/30 active:scale-[0.98]"
                    onPress={handleVerify}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white text-lg font-bold">Doğrula ve Devam Et</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity className="mt-8" onPress={() => Alert.alert('Kod Gönderildi', 'Yeni bir kod gönderildi.')}>
                    <Text className="text-zinc-400 font-medium">
                        Kod gelmedi mi? <Text className="text-[#006FFF] font-bold">Tekrar Gönder</Text>
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
