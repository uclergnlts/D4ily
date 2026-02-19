import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, Heart, Coffee, Globe, Users, RefreshCw, Check } from 'lucide-react-native';
import { usePremium } from '../src/hooks/usePremium';
import { PurchasesPackage } from 'react-native-purchases';

const TIER_META: Record<string, { emoji: string; label: string; description: string }> = {
    '$rc_monthly': { emoji: '☕', label: 'Bir Kahve', description: 'Aylık küçük bir destek' },
    '$rc_three_month': { emoji: '💪', label: 'Güçlü Destek', description: '3 aylık katkı' },
    '$rc_annual': { emoji: '🚀', label: 'Büyük Destek', description: 'Yıllık bağış ile en büyük katkı' },
};

function getTierMeta(identifier: string) {
    return TIER_META[identifier] || { emoji: '❤️', label: 'Destek', description: 'D4ily\'e katkıda bulun' };
}

export default function SupportScreen() {
    const router = useRouter();
    const {
        isPremium,
        packages,
        isLoading,
        error,
        purchasePackage,
        restorePurchases,
    } = usePremium();

    const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
    const [purchasing, setPurchasing] = useState(false);

    const handleSubscribe = async () => {
        if (!selectedPackage) {
            Alert.alert('Paket Seç', 'Lütfen bir destek paketi seçin.');
            return;
        }

        setPurchasing(true);
        try {
            const result = await purchasePackage(selectedPackage);
            if (result.success) {
                Alert.alert('Teşekkürler!', 'Desteğin için çok teşekkür ederiz! ❤️');
            } else if (!result.cancelled) {
                Alert.alert('Hata', result.error || 'İşlem başarısız oldu.');
            }
        } catch (err: any) {
            Alert.alert('Hata', err.message || 'Bir hata oluştu');
        } finally {
            setPurchasing(false);
        }
    };

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
                <ActivityIndicator size="large" color="#ef4444" />
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
                        <Heart size={24} color="#ef4444" />
                        <Text
                            className="text-xl text-zinc-900 dark:text-white ml-2"
                            style={{ fontFamily: 'DMSans_700Bold' }}
                        >
                            Destek Ol
                        </Text>
                    </View>
                    <TouchableOpacity onPress={handleRestore} className="p-2">
                        <RefreshCw size={20} color="#006FFF" />
                    </TouchableOpacity>
                </View>

                <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 60 }}>
                    {/* Hero / Message */}
                    <View className="mx-4 mt-6 p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800">
                        <View className="items-center mb-5">
                            <View className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/20 items-center justify-center mb-4">
                                <Heart size={40} color="#ef4444" fill="#ef4444" />
                            </View>
                            <Text
                                className="text-2xl text-zinc-900 dark:text-white text-center mb-2"
                                style={{ fontFamily: 'DMSans_700Bold' }}
                            >
                                D4ily'e Destek Ol
                            </Text>
                        </View>

                        <Text
                            className="text-[15px] text-zinc-600 dark:text-zinc-300 leading-7 text-center"
                            style={{ fontFamily: 'DMSans_400Regular' }}
                        >
                            Merhaba değerli haber sever arkadaşım.{'\n\n'}
                            D4ily'i her kesimden insanın sınırsız ve filtresiz bir şekilde her kesimden habere rahatlıkla ulaşabilmesi için yaptım ve sizin gibi haber severler sayesinde D4ily hak ettiği değeri görüyor.{'\n\n'}
                            Fakat her bir kullanıcı için belli başlı maliyetler söz konusu ve kullanıcı sayısı arttıkça maliyetler de artıyor.{'\n\n'}
                            D4ily'nin ücretsiz ve reklamsız kalabilmesi için bağışlara ihtiyacı var. Bağışlar sayesinde D4ily topluma ait ücretsiz bir uygulama olmayı hedefliyor.{'\n\n'}
                            Bu hedeflere beraber ulaşalım mı?
                        </Text>
                    </View>

                    {/* Already Supporting */}
                    {isPremium && (
                        <View className="mx-4 mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800 flex-row items-center">
                            <Check size={20} color="#10b981" />
                            <Text
                                className="text-[14px] text-green-700 dark:text-green-400 ml-3 flex-1"
                                style={{ fontFamily: 'DMSans_600SemiBold' }}
                            >
                                Destekçimizsin! Katkıların için teşekkürler ❤️
                            </Text>
                        </View>
                    )}

                    {/* Subscription Packages */}
                    <View className="mx-4 mt-6">
                        <Text
                            className="text-lg text-zinc-900 dark:text-white mb-3"
                            style={{ fontFamily: 'DMSans_700Bold' }}
                        >
                            Destek Paketi Seç
                        </Text>

                        {error && (
                            <View className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                                <Text
                                    className="text-red-600 dark:text-red-400 text-center text-[13px]"
                                    style={{ fontFamily: 'DMSans_400Regular' }}
                                >
                                    {error}
                                </Text>
                            </View>
                        )}

                        {packages.length === 0 ? (
                            <View className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                <Text
                                    className="text-zinc-400 text-center text-[13px]"
                                    style={{ fontFamily: 'DMSans_400Regular' }}
                                >
                                    Paketler yükleniyor...
                                </Text>
                            </View>
                        ) : (
                            <View className="gap-3">
                                {packages.map((pkg) => {
                                    const meta = getTierMeta(pkg.identifier);
                                    const isSelected = selectedPackage?.identifier === pkg.identifier;

                                    return (
                                        <TouchableOpacity
                                            key={pkg.identifier}
                                            onPress={() => setSelectedPackage(pkg)}
                                            className={`p-5 rounded-2xl border-2 ${
                                                isSelected
                                                    ? 'border-red-400 bg-red-50 dark:bg-red-900/10'
                                                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                                            }`}
                                            activeOpacity={0.7}
                                        >
                                            <View className="flex-row items-center justify-between">
                                                <View className="flex-row items-center flex-1">
                                                    <Text className="text-2xl mr-3">{meta.emoji}</Text>
                                                    <View className="flex-1">
                                                        <Text
                                                            className={`text-[16px] ${
                                                                isSelected ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-white'
                                                            }`}
                                                            style={{ fontFamily: 'DMSans_700Bold' }}
                                                        >
                                                            {meta.label}
                                                        </Text>
                                                        <Text
                                                            className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5"
                                                            style={{ fontFamily: 'DMSans_400Regular' }}
                                                        >
                                                            {meta.description}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <Text
                                                    className={`text-xl ${
                                                        isSelected ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-white'
                                                    }`}
                                                    style={{ fontFamily: 'DMSans_700Bold' }}
                                                >
                                                    {pkg.product.priceString}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </View>

                    {/* Subscribe Button */}
                    <View className="mx-4 mt-6">
                        <TouchableOpacity
                            onPress={handleSubscribe}
                            disabled={!selectedPackage || purchasing || packages.length === 0}
                            className={`w-full py-4 rounded-2xl flex-row items-center justify-center ${
                                selectedPackage && packages.length > 0
                                    ? 'bg-[#ef4444]'
                                    : 'bg-zinc-200 dark:bg-zinc-800'
                            }`}
                            activeOpacity={0.8}
                            style={{ opacity: !selectedPackage || purchasing ? 0.6 : 1 }}
                        >
                            {purchasing ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Heart size={20} color="#fff" fill="#fff" />
                                    <Text
                                        className="text-white text-lg ml-2"
                                        style={{ fontFamily: 'DMSans_700Bold' }}
                                    >
                                        Destekle
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleRestore} className="mt-3 py-2">
                            <Text
                                className="text-[#006FFF] text-center text-[13px]"
                                style={{ fontFamily: 'DMSans_500Medium' }}
                            >
                                Satın Almayı Geri Yükle
                            </Text>
                        </TouchableOpacity>

                        <Text
                            className="text-[11px] text-zinc-400 text-center mt-2"
                            style={{ fontFamily: 'DMSans_400Regular' }}
                        >
                            Her katkı D4ily'nin geleceğine yatırımdır.
                        </Text>
                    </View>

                    {/* Values */}
                    <View className="mx-4 mt-6 mb-4 gap-3">
                        <View className="flex-row items-center bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                            <View className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-full items-center justify-center mr-4">
                                <Globe size={20} color="#006FFF" />
                            </View>
                            <View className="flex-1">
                                <Text
                                    className="text-[14px] text-zinc-900 dark:text-white"
                                    style={{ fontFamily: 'DMSans_600SemiBold' }}
                                >
                                    Ücretsiz & Reklamsız
                                </Text>
                                <Text
                                    className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5"
                                    style={{ fontFamily: 'DMSans_400Regular' }}
                                >
                                    Herkes için erişilebilir, reklamsız haber deneyimi
                                </Text>
                            </View>
                        </View>

                        <View className="flex-row items-center bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                            <View className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-full items-center justify-center mr-4">
                                <Users size={20} color="#10b981" />
                            </View>
                            <View className="flex-1">
                                <Text
                                    className="text-[14px] text-zinc-900 dark:text-white"
                                    style={{ fontFamily: 'DMSans_600SemiBold' }}
                                >
                                    Topluma Ait
                                </Text>
                                <Text
                                    className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5"
                                    style={{ fontFamily: 'DMSans_400Regular' }}
                                >
                                    Bağışlarla ayakta duran, bağımsız bir platform
                                </Text>
                            </View>
                        </View>

                        <View className="flex-row items-center bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                            <View className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-full items-center justify-center mr-4">
                                <Coffee size={20} color="#8b5cf6" />
                            </View>
                            <View className="flex-1">
                                <Text
                                    className="text-[14px] text-zinc-900 dark:text-white"
                                    style={{ fontFamily: 'DMSans_600SemiBold' }}
                                >
                                    Filtresiz Haberler
                                </Text>
                                <Text
                                    className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5"
                                    style={{ fontFamily: 'DMSans_400Regular' }}
                                >
                                    Sansürsüz, tarafsız haber özetleri
                                </Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
