import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Mail, Lock, User, Check } from 'lucide-react-native';
import { useAuthStore } from '../src/store/useAuthStore';
import { authService } from '../src/api/services/authService';
import { signInWithGoogle, signInWithApple, getIdToken, firebaseUserToAppUser } from '../src/utils/firebaseAuth';

export default function AuthScreen() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [loading, setLoading] = useState(false);

    const login = useAuthStore(state => state.login);
    const router = useRouter();

    const handleSubmit = async () => {
        if (!email || !password || (!isLogin && !name)) {
            Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
            return;
        }

        if (!isLogin) {
            if (password !== confirmPassword) {
                Alert.alert('Hata', 'Şifreler eşleşmiyor.');
                return;
            }
            if (!termsAccepted) {
                Alert.alert('Hata', 'Devam etmek için kullanım koşullarını kabul etmelisiniz.');
                return;
            }
        }

        setLoading(true);
        try {
            if (isLogin) {
                const data = await authService.login(email, password);
                await login(data.user, data.token);
                router.back();
            } else {
                // Register flow - call API first
                const data = await authService.register(email, password, name);
                // Store user data and token
                await login(data.user, data.customToken);
                // Navigate to Verify Page
                router.push({ pathname: '/auth/verify', params: { email } });
            }
        } catch (error: any) {
            Alert.alert('Hata', error.message || 'Bir sorun oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = async (provider: 'google' | 'apple') => {
        setLoading(true);
        try {
            let firebaseUser;
            if (provider === 'google') {
                firebaseUser = await signInWithGoogle();
            } else if (provider === 'apple') {
                firebaseUser = await signInWithApple();
            }
            
            if (firebaseUser) {
                // Get Firebase ID token
                const token = await getIdToken();
                
                // Convert Firebase user to app user format
                const appUser = firebaseUserToAppUser(firebaseUser);
                
                // Store user data and token in Zustand store
                await login(appUser, token || '');
                
                // Navigate back
                router.back();
            }
        } catch (error: any) {
            Alert.alert('Hata', error.message || 'Social login başarısız');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-white dark:bg-black">
            {/* Header */}
            <View className="px-6 pt-12 pb-4 flex-row items-center">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 items-center justify-center mr-4"
                >
                    <ChevronLeft size={24} color="#71717a" />
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-8" keyboardShouldPersistTaps="handled">
                <Text className="text-4xl font-black text-zinc-900 dark:text-white mb-2 tracking-tighter">
                    {isLogin ? 'Tekrar\nHoş Geldin' : 'Hesap\nOluştur'}
                </Text>
                <Text className="text-zinc-500 mb-8 text-base font-medium">
                    {isLogin ? 'Devam etmek için giriş yap.' : 'Haber deneyimini kişiselleştirmek için katıl.'}
                </Text>

                {/* Social Login Buttons */}
                <View className="gap-4 mb-8">
                    <TouchableOpacity
                        onPress={() => handleSocialLogin('google')}
                        className="flex-row items-center justify-center bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 p-4 rounded-2xl active:bg-zinc-50"
                    >
                        <Image
                            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/300/300221.png' }}
                            style={{ width: 24, height: 24, marginRight: 12 }}
                        />
                        <Text className="text-zinc-700 dark:text-white font-bold text-base">Google ile Devam Et</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => handleSocialLogin('apple')}
                        className="flex-row items-center justify-center bg-black dark:bg-zinc-800 p-4 rounded-2xl active:opacity-90"
                    >
                        <Image
                            source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/1667px-Apple_logo_black.svg.png' }}
                            style={{ width: 24, height: 24, marginRight: 12, tintColor: 'white' }}
                        />
                        <Text className="text-white font-bold text-base">Apple ile Devam Et</Text>
                    </TouchableOpacity>
                </View>

                <View className="flex-row items-center gap-4 mb-8">
                    <View className="h-[1px] bg-zinc-200 dark:bg-zinc-800 flex-1" />
                    <Text className="text-zinc-400 font-medium">veya e-posta ile</Text>
                    <View className="h-[1px] bg-zinc-200 dark:bg-zinc-800 flex-1" />
                </View>

                {/* Email Form */}
                <View className="gap-5">
                    {!isLogin && (
                        <View>
                            <Text className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase mb-2 ml-1">İsim Soyisim</Text>
                            <View className="flex-row items-center bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3.5 focus:border-[#006FFF] focus:bg-white dark:focus:bg-black transition-all">
                                <User size={20} color="#a1a1aa" className="mr-3" />
                                <TextInput
                                    className="flex-1 text-zinc-900 dark:text-white font-medium text-base h-full"
                                    placeholder="Adın Soyadın"
                                    placeholderTextColor="#a1a1aa"
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>
                        </View>
                    )}

                    <View>
                        <Text className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase mb-2 ml-1">E-posta</Text>
                        <View className="flex-row items-center bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3.5 focus:border-[#006FFF] focus:bg-white dark:focus:bg-black transition-all">
                            <Mail size={20} color="#a1a1aa" className="mr-3" />
                            <TextInput
                                className="flex-1 text-zinc-900 dark:text-white font-medium text-base h-full"
                                placeholder="ornek@email.com"
                                placeholderTextColor="#a1a1aa"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    </View>

                    <View>
                        <Text className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase mb-2 ml-1">Şifre</Text>
                        <View className="flex-row items-center bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3.5 focus:border-[#006FFF] focus:bg-white dark:focus:bg-black transition-all">
                            <Lock size={20} color="#a1a1aa" className="mr-3" />
                            <TextInput
                                className="flex-1 text-zinc-900 dark:text-white font-medium text-base h-full"
                                placeholder="••••••••"
                                placeholderTextColor="#a1a1aa"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>
                    </View>

                    {!isLogin && (
                        <View className="gap-5">
                            <View>
                                <Text className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase mb-2 ml-1">Şifre Tekrar</Text>
                                <View className="flex-row items-center bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3.5 focus:border-[#006FFF] focus:bg-white dark:focus:bg-black transition-all">
                                    <Lock size={20} color="#a1a1aa" className="mr-3" />
                                    <TextInput
                                        className="flex-1 text-zinc-900 dark:text-white font-medium text-base h-full"
                                        placeholder="••••••••"
                                        placeholderTextColor="#a1a1aa"
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        secureTextEntry
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                className="flex-row items-center mt-2 px-1"
                                onPress={() => setTermsAccepted(!termsAccepted)}
                            >
                                <View className={`w-5 h-5 rounded border items-center justify-center mr-3 ${termsAccepted ? 'bg-[#006FFF] border-[#006FFF]' : 'border-zinc-300 dark:border-zinc-600'}`}>
                                    {termsAccepted && <Check size={14} color="white" />}
                                </View>
                                <Text className="flex-1 text-xs text-zinc-500 font-medium">
                                    <Text className="text-[#006FFF] font-bold">Kullanım Koşulları</Text>&apos;nı ve <Text className="text-[#006FFF] font-bold">Gizlilik Politikası</Text>&apos;nı okudum, kabul ediyorum.
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {isLogin && (
                        <TouchableOpacity
                            className="self-end mt-2 py-1 px-2 active:opacity-50"
                            onPress={() => router.push('/auth/forgot-password')}
                        >
                            <Text className="text-[#006FFF] font-bold text-sm">Şifremi unuttum?</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        className={`p-4 rounded-2xl items-center mt-6 shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all ${(!isLogin && !termsAccepted) ? 'bg-zinc-300 dark:bg-zinc-800' : 'bg-[#006FFF]'}`}
                        onPress={handleSubmit}
                        disabled={loading || (!isLogin && !termsAccepted)}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white font-bold text-lg tracking-wide">
                                {isLogin ? 'Giriş Yap' : 'Devam Et'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Footer Switcher */}
                <View className="flex-row justify-center mt-10 mb-10">
                    <Text className="text-zinc-500 font-medium">
                        {isLogin ? 'Hesabın yok mu? ' : 'Zaten hesabın var mı? '}
                    </Text>
                    <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                        <Text className="text-[#006FFF] font-bold">
                            {isLogin ? 'Şimdi Kayıt Ol' : 'Giriş Yap'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView >
        </View >
    );
}
