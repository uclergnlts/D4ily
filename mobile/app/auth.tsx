import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/useAuthStore';
import { authService } from '../src/api/services/authService';

export default function AuthScreen() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    const login = useAuthStore(state => state.login);
    const router = useRouter();

    const handleSubmit = async () => {
        if (!email || !password || (!isLogin && !name)) {
            Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
            return;
        }

        setLoading(true);
        try {
            if (isLogin) {
                const data = await authService.login(email, password);
                await login(data.user, data.token);
            } else {
                const data = await authService.register(email, password, name);
                await login(data.user, data.token);
            }
            router.back(); // Close modal
        } catch (error: any) {
            Alert.alert('Hata', error.message || 'Bir sorun oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-white dark:bg-zinc-900 p-6 pt-12">
            <Text className="text-3xl font-black text-primary text-center mb-8 tracking-tighter">
                D4ILY
            </Text>

            {/* Toggle */}
            <View className="flex-row bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl mb-6">
                <TouchableOpacity
                    className={`flex-1 py-2 rounded-lg items-center ${isLogin ? 'bg-white dark:bg-zinc-700 shadow-sm' : ''}`}
                    onPress={() => setIsLogin(true)}
                >
                    <Text className={`font-medium ${isLogin ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`}>Giriş Yap</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className={`flex-1 py-2 rounded-lg items-center ${!isLogin ? 'bg-white dark:bg-zinc-700 shadow-sm' : ''}`}
                    onPress={() => setIsLogin(false)}
                >
                    <Text className={`font-medium ${!isLogin ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`}>Kayıt Ol</Text>
                </TouchableOpacity>
            </View>

            {/* Form */}
            <View className="gap-4">
                {!isLogin && (
                    <View>
                        <Text className="text-zinc-500 mb-1 ml-1 text-sm">İsim</Text>
                        <TextInput
                            className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                            placeholder="Adın Soyadın"
                            placeholderTextColor="#a1a1aa"
                            value={name}
                            onChangeText={setName}
                        />
                    </View>
                )}

                <View>
                    <Text className="text-zinc-500 mb-1 ml-1 text-sm">E-posta</Text>
                    <TextInput
                        className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                        placeholder="ornek@email.com"
                        placeholderTextColor="#a1a1aa"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                </View>

                <View>
                    <Text className="text-zinc-500 mb-1 ml-1 text-sm">Şifre</Text>
                    <TextInput
                        className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                        placeholder="••••••"
                        placeholderTextColor="#a1a1aa"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                <TouchableOpacity
                    className="bg-primary p-4 rounded-xl items-center mt-4 active:opacity-90"
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-bold text-lg">
                            {isLogin ? 'Giriş Yap' : 'Hesap Oluştur'}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}
