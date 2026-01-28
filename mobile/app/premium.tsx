import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, Check, Crown, Zap, Shield, Star, RefreshCw } from 'lucide-react-native';
import { usePremium } from '../src/hooks/usePremium';
import { PurchasesPackage } from 'react-native-purchases';

export default function PremiumScreen() {
    const router = useRouter();
    const {
        isPremium,
        subscription,
        packages,
        isLoading,
        error,
        purchasePackage,
        restorePurchases,
        checkSubscriptionStatus,
    } = usePremium();

    const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
    const [purchasing, setPurchasing] = useState(false);

    // Handle purchase
    const handleSubscribe = async () => {
        if (!selectedPackage) {
            Alert.alert('Hata', 'Lütfen bir plan seçin.');
            return;
        }

        setPurchasing(true);
        try {
            const result = await purchasePackage(selectedPackage);

            if (result.success) {
                Alert.alert('Başarılı', 'Premium aboneliğiniz aktif!');
            } else if (result.cancelled) {
                // User cancelled, no alert needed
            } else {
                Alert.alert('Hata', result.error || 'Satın alma başarısız');
            }
        } catch (err: any) {
            Alert.alert('Hata', err.message || 'Bir hata oluştu');
        } finally {
            setPurchasing(false);
        }
    };

    // Handle restore purchases
    const handleRestore = async () => {
        try {
            const result = await restorePurchases();

            if (result.success) {
                Alert.alert('Başarılı', 'Satın almalarınız geri yüklendi!');
            } else {
                Alert.alert('Hata', result.error || 'Geri yükleme başarısız');
            }
        } catch (err: any) {
            Alert.alert('Hata', err.message || 'Bir hata oluştu');
        }
    };

    if (isLoading) {
        return (
            <View className="flex-1 bg-zinc-50 dark:bg-black items-center justify-center">
                <ActivityIndicator size="large" color="#006FFF" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-zinc-50 dark:bg-black">
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView className="flex-1">
                {/* Header */}
                <View className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex-row items-center bg-white dark:bg-zinc-900">
                    <TouchableOpacity onPress={() => router.back()} className="mr-4">
                        <ChevronLeft size={24} color="#006FFF" />
                    </TouchableOpacity>
                    <View className="flex-1 items-center flex-row">
                        <Crown size={24} color="#f59e0b" className="mr-2" />
                        <Text className="text-xl font-bold text-zinc-900 dark:text-white">Premium</Text>
                    </View>
                    <TouchableOpacity
                        onPress={handleRestore}
                        className="p-2"
                    >
                        <RefreshCw size={20} color="#006FFF" />
                    </TouchableOpacity>
                </View>

                <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
                    {isPremium ? (
                        /* Active Premium State */
                        <View className="p-6">
                            <View className="bg-gradient-to-br from-yellow-400 to-orange-500 p-6 rounded-3xl mb-6">
                                <View className="items-center mb-4">
                                    <Crown size={48} color="white" />
                                </View>
                                <Text className="text-white text-2xl font-black text-center mb-2">
                                    Premium Aktif!
                                </Text>
                                <Text className="text-white/90 text-center">
                                    Tüm premium özelliklere erişiminiz var.
                                </Text>
                                {subscription && (
                                    <View className="mt-4 pt-4 border-t border-white/20">
                                        <Text className="text-white/80 text-center text-sm">
                                            Plan: {subscription.planId === 'yearly' ? 'Yıllık' : 'Aylık'}
                                        </Text>
                                        {subscription.currentPeriodEnd && (
                                            <Text className="text-white/80 text-center text-sm">
                                                Bitiş: {subscription.currentPeriodEnd.toLocaleDateString('tr-TR')}
                                            </Text>
                                        )}
                                    </View>
                                )}
                            </View>

                            <View className="space-y-4">
                                <View className="flex-row items-center bg-white dark:bg-zinc-900 p-4 rounded-2xl">
                                    <View className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-full items-center justify-center mr-4">
                                        <Check size={20} color="#10b981" />
                                    </View>
                                    <Text className="text-zinc-900 dark:text-white font-medium">Reklamsız deneyim</Text>
                                </View>
                                <View className="flex-row items-center bg-white dark:bg-zinc-900 p-4 rounded-2xl">
                                    <View className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-full items-center justify-center mr-4">
                                        <Check size={20} color="#10b981" />
                                    </View>
                                    <Text className="text-zinc-900 dark:text-white font-medium">Sınırsız detaylı analiz</Text>
                                </View>
                                <View className="flex-row items-center bg-white dark:bg-zinc-900 p-4 rounded-2xl">
                                    <View className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-full items-center justify-center mr-4">
                                        <Check size={20} color="#10b981" />
                                    </View>
                                    <Text className="text-zinc-900 dark:text-white font-medium">Kişiselleştirilmiş günlük bülten</Text>
                                </View>
                                <View className="flex-row items-center bg-white dark:bg-zinc-900 p-4 rounded-2xl">
                                    <View className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-full items-center justify-center mr-4">
                                        <Check size={20} color="#10b981" />
                                    </View>
                                    <Text className="text-zinc-900 dark:text-white font-medium">Öncelikli destek</Text>
                                </View>
                            </View>

                            {subscription?.cancelAtPeriodEnd && (
                                <View className="mt-6 p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-2xl">
                                    <Text className="text-yellow-800 dark:text-yellow-200 text-center">
                                        Aboneliğiniz dönem sonunda iptal edilecek.
                                    </Text>
                                </View>
                            )}
                        </View>
                    ) : (
                        /* Plans Selection */
                        <View className="p-6">
                            <Text className="text-2xl font-black text-zinc-900 dark:text-white mb-2">
                                                                Premium&apos;a Geç
                            </Text>
                            <Text className="text-zinc-500 mb-6">
                                Daha iyi bir haber deneyimi için premium özellikleri açın.
                            </Text>

                            {error && (
                                <View className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 rounded-2xl">
                                    <Text className="text-red-800 dark:text-red-200 text-center">{error}</Text>
                                </View>
                            )}

                            <View className="space-y-4 mb-8">
                                {packages.length === 0 ? (
                                    <View className="p-6 bg-zinc-100 dark:bg-zinc-900 rounded-2xl">
                                        <Text className="text-zinc-500 text-center">
                                            Paketler yükleniyor...
                                        </Text>
                                    </View>
                                ) : (
                                    packages.map((pkg) => (
                                        <TouchableOpacity
                                            key={pkg.identifier}
                                            onPress={() => setSelectedPackage(pkg)}
                                            className={`p-5 rounded-2xl border-2 ${
                                                selectedPackage?.identifier === pkg.identifier
                                                    ? 'border-[#006FFF] bg-blue-50 dark:bg-blue-900/10'
                                                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                                            }`}
                                        >
                                            <View className="flex-row justify-between items-start mb-3">
                                                <View>
                                                    <Text className={`text-lg font-bold ${
                                                        selectedPackage?.identifier === pkg.identifier ? 'text-[#006FFF]' : 'text-zinc-900 dark:text-white'
                                                    }`}>
                                                        {pkg.product.title}
                                                    </Text>
                                                    <Text className="text-zinc-500 text-sm">
                                                        {pkg.product.description}
                                                    </Text>
                                                </View>
                                                <View className="text-right">
                                                    <Text className={`text-2xl font-black ${
                                                        selectedPackage?.identifier === pkg.identifier ? 'text-[#006FFF]' : 'text-zinc-900 dark:text-white'
                                                    }`}>
                                                        {pkg.product.priceString}
                                                    </Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    ))
                                )}
                            </View>

                            <TouchableOpacity
                                onPress={handleSubscribe}
                                disabled={!selectedPackage || purchasing || packages.length === 0}
                                className={`w-full py-4 rounded-2xl flex-row items-center justify-center shadow-lg active:scale-[0.98] ${
                                    selectedPackage && packages.length > 0 ? 'bg-[#006FFF] shadow-blue-500/30' : 'bg-zinc-200 dark:bg-zinc-800'
                                }`}
                            >
                                {purchasing ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <>
                                        <Crown size={20} color="white" className="mr-2" />
                                        <Text className="text-white font-bold text-lg">                                Premium&apos;a Geç</Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleRestore}
                                className="mt-4 py-3"
                            >
                                <Text className="text-[#006FFF] text-center font-medium">
                                    Satın Almayı Geri Yükle
                                </Text>
                            </TouchableOpacity>

                            {/* Features Preview */}
                            <View className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                                <Text className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
                                    Premium Özellikleri
                                </Text>
                                <View className="grid grid-cols-2 gap-4">
                                    <View className="flex-row items-start">
                                        <Zap size={20} color="#f59e0b" className="mr-3 mt-1" />
                                        <View>
                                            <Text className="text-zinc-900 dark:text-white font-medium">Reklamsız</Text>
                                            <Text className="text-zinc-500 text-xs">Tamamen reklamsız deneyim</Text>
                                        </View>
                                    </View>
                                    <View className="flex-row items-start">
                                        <Shield size={20} color="#10b981" className="mr-3 mt-1" />
                                        <View>
                                            <Text className="text-zinc-900 dark:text-white font-medium">Detaylı Analiz</Text>
                                            <Text className="text-zinc-500 text-xs">Sınırsız içerik analizi</Text>
                                        </View>
                                    </View>
                                    <View className="flex-row items-start">
                                        <Star size={20} color="#8b5cf6" className="mr-3 mt-1" />
                                        <View>
                                            <Text className="text-zinc-900 dark:text-white font-medium">Kişisel Bülten</Text>
                                            <Text className="text-zinc-500 text-xs">Özel günlük özetler</Text>
                                        </View>
                                    </View>
                                    <View className="flex-row items-start">
                                        <Crown size={20} color="#f59e0b" className="mr-3 mt-1" />
                                        <View>
                                            <Text className="text-zinc-900 dark:text-white font-medium">Öncelikli Destek</Text>
                                            <Text className="text-zinc-500 text-xs">Öncelikli müşteri hizmetleri</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
