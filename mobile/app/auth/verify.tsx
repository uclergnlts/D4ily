import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, Keyboard, NativeSyntheticEvent, TextInputKeyPressEventData } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { safeBack } from '../../src/utils/navigation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Mail } from 'lucide-react-native';
import { authService } from '../../src/api/services/authService';

export default function VerifyEmailScreen() {
    const router = useRouter();
    const { email } = useLocalSearchParams();
    const [code, setCode] = useState(['', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const inputs = useRef<(TextInput | null)[]>([]);

    const handleInput = useCallback((text: string, index: number) => {
        const newCode = [...code];
        newCode[index] = text;
        setCode(newCode);

        if (text && index < 4) {
            inputs.current[index + 1]?.focus();
        }

        if (newCode.every(c => c !== '')) {
            Keyboard.dismiss();
        }
    }, [code]);

    const handleKeyPress = useCallback((e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
            const newCode = [...code];
            newCode[index - 1] = '';
            setCode(newCode);
            inputs.current[index - 1]?.focus();
        }
    }, [code]);

    const handleVerify = async () => {
        const oobCode = code.join('');
        if (oobCode.length !== 5) {
            Alert.alert('Hata', 'Lutfen 5 haneli dogrulama kodunu girin.');
            return;
        }

        setLoading(true);
        try {
            await authService.verifyEmailCode(oobCode);
            Alert.alert('Basarili', 'E-posta adresiniz dogrulandi!', [
                { text: 'Tamam', onPress: () => router.replace('/(tabs)') }
            ]);
        } catch (error: any) {
            Alert.alert('Hata', error.message || 'Dogrulama basarisiz');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResending(true);
        try {
            setCode(['', '', '', '', '']);
            inputs.current[0]?.focus();
            Alert.alert('Gonderildi', 'Yeni dogrulama kodu e-posta adresinize gonderildi.');
        } catch (error: any) {
            Alert.alert('Hata', error.message || 'Kod gonderilemedi');
        } finally {
            setResending(false);
        }
    };

    const allFilled = code.every(c => c);

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-black p-6">
            <TouchableOpacity
                onPress={() => safeBack(router)}
                className="mb-8 w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 items-center justify-center shadow-sm"
            >
                <ChevronLeft size={24} color="#71717a" />
            </TouchableOpacity>

            <View className="flex-1 items-center pt-6">
                <View className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full items-center justify-center mb-6">
                    <Mail size={32} color="#006FFF" />
                </View>

                <Text className="text-3xl text-zinc-900 dark:text-white text-center mb-3 font-bold">
                    E-postani Dogrula
                </Text>

                <Text className="text-zinc-500 text-center mb-10 px-4 leading-relaxed text-[15px]">
                    <Text className="font-bold text-zinc-900 dark:text-white">{email}</Text> adresine gonderdigimiz 5 haneli dogrulama kodunu gir.
                </Text>

                <View className="flex-row gap-3 mb-10">
                    {code.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={(ref) => { inputs.current[index] = ref; }}
                            className={`w-14 h-16 bg-zinc-50 dark:bg-zinc-900/50 border rounded-2xl text-center text-2xl font-bold text-zinc-900 dark:text-white ${digit ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-zinc-200 dark:border-zinc-800'}`}
                            maxLength={1}
                            keyboardType="number-pad"
                            value={digit}
                            onChangeText={(text) => handleInput(text, index)}
                            onKeyPress={(e) => handleKeyPress(e, index)}
                            selectTextOnFocus
                        />
                    ))}
                </View>

                <TouchableOpacity
                    className={`w-full py-4 rounded-2xl items-center shadow-lg shadow-blue-500/30 active:scale-[0.98] ${allFilled ? 'bg-[#006FFF]' : 'bg-zinc-200 dark:bg-zinc-800'}`}
                    onPress={handleVerify}
                    disabled={loading || !allFilled}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className={`text-lg font-bold ${allFilled ? 'text-white' : 'text-zinc-400'}`}>
                            Dogrula ve Devam Et
                        </Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity className="mt-8" onPress={handleResend} disabled={resending}>
                    {resending ? (
                        <ActivityIndicator size="small" color="#006FFF" />
                    ) : (
                        <Text className="text-zinc-400 font-medium">
                            Kod gelmedi mi? <Text className="text-[#006FFF] font-bold">Tekrar Gonder</Text>
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
