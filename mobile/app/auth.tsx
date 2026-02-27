import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { safeBack } from '../src/utils/navigation';
import { ChevronLeft, Mail, Lock, User, Check, Eye, EyeOff } from 'lucide-react-native';
import { useAuthStore } from '../src/store/useAuthStore';
import { authService } from '../src/api/services/authService';
import { signInWithGoogle, signInWithApple, getIdToken, firebaseUserToAppUser } from '../src/utils/firebaseAuth';
import Animated, { FadeInDown, FadeOutUp, Layout } from 'react-native-reanimated';

export default function AuthScreen() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const login = useAuthStore(state => state.login);
    const router = useRouter();

    // Email validation
    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // Password strength calculation
    const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
        let strength = 0;
        if (password.length >= 8) strength += 1;
        if (password.length >= 12) strength += 1;
        if (/[A-Z]/.test(password)) strength += 1;
        if (/[a-z]/.test(password)) strength += 1;
        if (/[0-9]/.test(password)) strength += 1;
        if (/[^A-Za-z0-9]/.test(password)) strength += 1;

        if (strength <= 2) return { strength, label: 'Zayıf', color: '#ef4444' };
        if (strength <= 4) return { strength, label: 'Orta', color: '#f59e0b' };
        return { strength, label: 'Güçlü', color: '#22c55e' };
    };

    const handleEmailChange = (text: string) => {
        setEmail(text);
        if (text && !validateEmail(text)) {
            setEmailError('Geçerli bir e-posta adresi girin');
        } else {
            setEmailError('');
        }
    };

    const handlePasswordChange = (text: string) => {
        setPassword(text);
        if (!isLogin && text.length < 8) {
            setPasswordError('Şifre en az 8 karakter olmalı');
        } else {
            setPasswordError('');
        }
    };

    const handleSubmit = async () => {
        if (!email || !password || (!isLogin && !name)) {
            Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
            return;
        }

        if (!validateEmail(email)) {
            Alert.alert('Hata', 'Geçerli bir e-posta adresi girin.');
            return;
        }

        if (!isLogin) {
            if (password.length < 8) {
                Alert.alert('Hata', 'Şifre en az 8 karakter olmalıdır.');
                return;
            }
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
                safeBack(router);
            } else {
                const data = await authService.register(email, password, name);
                await login(data.user, data.customToken);
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
                const token = await getIdToken();
                const appUser = firebaseUserToAppUser(firebaseUser);
                await login(appUser, token || '');
                safeBack(router);
            }
        } catch (error: any) {
            Alert.alert('Hata', error.message || 'Social login başarısız');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-white dark:bg-black">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                {/* Header Actions */}
                <View className="px-6 pt-12 pb-4 flex-row items-center justify-between z-10">
                    <TouchableOpacity
                        onPress={() => safeBack(router)}
                        className="w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 items-center justify-center shadow-sm"
                    >
                        <ChevronLeft size={24} color="#71717a" />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    className="flex-1 px-8"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40 }}
                >
                    <Animated.View
                        entering={FadeInDown.duration(600).springify()}
                        className="mb-8 mt-4"
                    >
                        <Text
                            className="text-[40px] text-zinc-900 dark:text-white mb-3 font-black leading-[44px] tracking-tighter"
                        >
                            {isLogin ? 'Tekrar\nHoş Geldin' : 'Aramıza\nKatıl'}
                        </Text>
                        <Text
                            className="text-zinc-500 dark:text-zinc-400 text-[17px] leading-6 font-medium"
                        >
                            {isLogin
                                ? 'Kaldığın yerden devam etmek için giriş yap.'
                                : 'Dünyayı yakalamak için hemen hesabını oluştur.'}
                        </Text>
                    </Animated.View>

                    {/* Social Login */}
                    <Animated.View
                        entering={FadeInDown.delay(100).duration(600).springify()}
                        className="flex-row gap-4 mb-8"
                    >
                        <TouchableOpacity
                            onPress={() => handleSocialLogin('google')}
                            className="flex-1 flex-row items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm active:scale-[0.98] transition-all"
                        >
                            <Image
                                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/300/300221.png' }}
                                style={{ width: 22, height: 22, marginRight: 10 }}
                            />
                            <Text className="text-zinc-700 dark:text-white font-bold">Google</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => handleSocialLogin('apple')}
                            className="flex-1 flex-row items-center justify-center bg-black dark:bg-zinc-800 border border-black dark:border-zinc-700 p-4 rounded-2xl shadow-sm active:scale-[0.98] transition-all"
                        >
                            <Image
                                source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/1667px-Apple_logo_black.svg.png' }}
                                style={{ width: 22, height: 22, marginRight: 10, tintColor: 'white' }}
                            />
                            <Text className="text-white font-bold">Apple</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    <Animated.View
                        entering={FadeInDown.delay(200).duration(600).springify()}
                        className="flex-row items-center gap-4 mb-8"
                    >
                        <View className="h-[1px] bg-zinc-100 dark:bg-zinc-800 flex-1" />
                        <Text className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">veya e-posta ile</Text>
                        <View className="h-[1px] bg-zinc-100 dark:bg-zinc-800 flex-1" />
                    </Animated.View>

                    {/* Form Fields */}
                    <Animated.View
                        layout={Layout.springify()}
                        className="gap-5"
                    >
                        {!isLogin && (
                            <Animated.View entering={FadeInDown} exiting={FadeOutUp}>
                                <Text className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase mb-2 ml-1 tracking-wider">İsim Soyisim</Text>
                                <View className="flex-row items-center bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-4 focus:border-blue-500 focus:bg-white dark:focus:bg-black transition-all">
                                    <User size={20} color="#a1a1aa" className="mr-3" />
                                    <TextInput
                                        className="flex-1 text-zinc-900 dark:text-white font-medium text-[15px]"
                                        placeholder="Adın Soyadın"
                                        placeholderTextColor="#a1a1aa"
                                        value={name}
                                        onChangeText={setName}
                                    />
                                </View>
                            </Animated.View>
                        )}

                        <View>
                            <Text className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase mb-2 ml-1 tracking-wider">E-posta</Text>
                            <View className={`flex-row items-center bg-zinc-50 dark:bg-zinc-900/50 border rounded-2xl px-4 py-4 transition-all ${emailError ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-zinc-200 dark:border-zinc-800 focus:border-blue-500 focus:bg-white dark:focus:bg-black'}`}>
                                <Mail size={20} color={emailError ? '#ef4444' : '#a1a1aa'} className="mr-3" />
                                <TextInput
                                    className="flex-1 text-zinc-900 dark:text-white font-medium text-[15px]"
                                    placeholder="ornek@email.com"
                                    placeholderTextColor="#a1a1aa"
                                    value={email}
                                    onChangeText={handleEmailChange}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>
                            {emailError ? (
                                <Text className="text-red-500 text-xs mt-1 ml-1">{emailError}</Text>
                            ) : null}
                        </View>

                        <View>
                            <Text className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase mb-2 ml-1 tracking-wider">Şifre</Text>
                            <View className={`flex-row items-center bg-zinc-50 dark:bg-zinc-900/50 border rounded-2xl px-4 py-4 transition-all ${passwordError ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-zinc-200 dark:border-zinc-800 focus:border-blue-500 focus:bg-white dark:focus:bg-black'}`}>
                                <Lock size={20} color={passwordError ? '#ef4444' : '#a1a1aa'} className="mr-3" />
                                <TextInput
                                    className="flex-1 text-zinc-900 dark:text-white font-medium text-[15px]"
                                    placeholder="••••••••"
                                    placeholderTextColor="#a1a1aa"
                                    value={password}
                                    onChangeText={handlePasswordChange}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    {showPassword ? (
                                        <EyeOff size={20} color="#a1a1aa" />
                                    ) : (
                                        <Eye size={20} color="#a1a1aa" />
                                    )}
                                </TouchableOpacity>
                            </View>
                            {/* Password Strength Indicator */}
                            {!isLogin && password.length > 0 && (
                                <View className="mt-2">
                                    <View className="flex-row items-center justify-between mb-1">
                                        <Text className="text-xs text-zinc-500">Şifre Gücü:</Text>
                                        <Text className="text-xs font-bold" style={{ color: getPasswordStrength(password).color }}>
                                            {getPasswordStrength(password).label}
                                        </Text>
                                    </View>
                                    <View className="h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                        <View
                                            className="h-full rounded-full transition-all duration-300"
                                            style={{
                                                width: `${(getPasswordStrength(password).strength / 6) * 100}%`,
                                                backgroundColor: getPasswordStrength(password).color
                                            }}
                                        />
                                    </View>
                                </View>
                            )}
                            {passwordError ? (
                                <Text className="text-red-500 text-xs mt-1 ml-1">{passwordError}</Text>
                            ) : null}
                        </View>

                        {!isLogin && (
                            <Animated.View entering={FadeInDown} exiting={FadeOutUp} className="gap-5">
                                <View>
                                    <Text className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase mb-2 ml-1 tracking-wider">Şifre Tekrar</Text>
                                    <View className="flex-row items-center bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-4 focus:border-blue-500 focus:bg-white dark:focus:bg-black transition-all">
                                        <Lock size={20} color="#a1a1aa" className="mr-3" />
                                        <TextInput
                                            className="flex-1 text-zinc-900 dark:text-white font-medium text-[15px]"
                                            placeholder="••••••••"
                                            placeholderTextColor="#a1a1aa"
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                            secureTextEntry={!showPassword}
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity
                                    className="flex-row items-start mt-2 px-1"
                                    onPress={() => setTermsAccepted(!termsAccepted)}
                                    activeOpacity={0.7}
                                >
                                    <View className={`w-5 h-5 rounded border items-center justify-center mr-3 mt-0.5 ${termsAccepted ? 'bg-blue-600 border-blue-600' : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-black'}`}>
                                        {termsAccepted && <Check size={14} color="white" strokeWidth={3} />}
                                    </View>
                                    <Text className="flex-1 text-[13px] text-zinc-500 font-medium leading-[20px]">
                                        <Text className="text-blue-600 dark:text-blue-400 font-bold">Kullanım Koşulları</Text>'nı ve <Text className="text-blue-600 dark:text-blue-400 font-bold">Gizlilik Politikası</Text>'nı okudum, kabul ediyorum.
                                    </Text>
                                </TouchableOpacity>
                            </Animated.View>
                        )}

                        {isLogin && (
                            <TouchableOpacity
                                className="self-end py-2 px-1"
                                onPress={() => router.push('/auth/forgot-password')}
                            >
                                <Text className="text-blue-600 dark:text-blue-400 font-bold text-[14px]">Şifremi unuttum?</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            className={`p-4 rounded-2xl items-center mt-4 shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all h-[56px] justify-center ${(!isLogin && !termsAccepted) ? 'bg-zinc-200 dark:bg-zinc-800' : 'bg-[#006FFF]'}`}
                            onPress={handleSubmit}
                            disabled={loading || (!isLogin && !termsAccepted)}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <ActivityIndicator color={(!isLogin && !termsAccepted) ? "#a1a1aa" : "white"} />
                            ) : (
                                <Text
                                    className={`font-bold text-[17px] tracking-wide ${(!isLogin && !termsAccepted) ? 'text-zinc-400 dark:text-zinc-500' : 'text-white'}`}
                                >
                                    {isLogin ? 'Giriş Yap' : 'Hesap Oluştur'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Toggle Mode */}
                    <View className="flex-row justify-center mt-10 mb-8 items-center gap-1">
                        <Text className="text-zinc-500 font-medium text-[15px]">
                            {isLogin ? 'Hesabın yok mu?' : 'Zaten hesabın var mı?'}
                        </Text>
                        <TouchableOpacity onPress={() => setIsLogin(!isLogin)} className="py-2">
                            <Text className="text-[#006FFF] font-bold text-[15px]">
                                {isLogin ? 'Hemen Kayıt Ol' : 'Giriş Yap'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

