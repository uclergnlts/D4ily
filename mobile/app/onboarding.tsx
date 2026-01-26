import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Dimensions, FlatList, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, FadeOut } from 'react-native-reanimated';
import { ArrowRight, Check } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        title: 'Gerçeklere Ulaş',
        description: 'Yapay zeka analizleriyle haberlerin arka planını, duygusal tonunu ve manipülasyon riskini keşfet.',
        icon: '🔍',
        color: '#006FFF'
    },
    {
        id: '2',
        title: 'Dengeli Bakış',
        description: 'Sadece tek bir tarafı değil, tüm perspektifleri gör. Sağ, sol ve merkez kaynakları karşılaştır.',
        icon: '⚖️',
        color: '#a855f7'
    },
    {
        id: '3',
        title: 'Topluluğa Katıl',
        description: 'Haberleri tartış, oyla ve güvenilir bilgi ekosisteminin bir parçası ol.',
        icon: '🌍',
        color: '#10b981'
    }
];

export default function OnboardingScreen() {
    const router = useRouter();
    const flatListRef = useRef<FlatList>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showSplash, setShowSplash] = useState(true);

    useEffect(() => {
        // Simulate Splash Screen
        const timer = setTimeout(() => {
            setShowSplash(false);
        }, 2500);
        return () => clearTimeout(timer);
    }, []);

    const handleNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            // "Hemen Başla" -> Go to Auth
            router.push('/auth');
        }
    };

    const handleGuest = () => {
        // "Guest Mode" -> Skip to Feed
        router.replace('/(tabs)');
    };

    const renderItem = ({ item }: { item: typeof SLIDES[0] }) => {
        return (
            <View style={{ width }} className="items-center justify-center p-8 pt-20">
                <Animated.View
                    entering={FadeInUp.delay(200).duration(1000)}
                    className="w-48 h-48 bg-zinc-100 dark:bg-zinc-800 rounded-full items-center justify-center mb-12 shadow-xl"
                    style={{ shadowColor: item.color, shadowOpacity: 0.3, shadowRadius: 20 }}
                >
                    <Text style={{ fontSize: 80 }}>{item.icon}</Text>
                </Animated.View>

                <Animated.Text
                    entering={FadeInDown.delay(400).duration(800)}
                    className="text-4xl font-black text-center text-zinc-900 dark:text-white mb-4 tracking-tighter"
                >
                    {item.title}
                </Animated.Text>

                <Animated.Text
                    entering={FadeInDown.delay(600).duration(800)}
                    className="text-lg text-center text-zinc-500 font-medium leading-7 px-4"
                >
                    {item.description}
                </Animated.Text>
            </View>
        );
    };

    if (showSplash) {
        return (
            <View className="flex-1 bg-white dark:bg-black items-center justify-center">
                <Animated.View exiting={FadeOut.duration(500)} className="items-center">
                    <Text className="text-6xl font-black text-[#006FFF] tracking-tighter mb-4">D4ILY</Text>
                    <Text className="text-zinc-400 font-medium tracking-widest uppercase text-xs">Yapay Zeka Destekli Haber</Text>
                </Animated.View>
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-black">
            <FlatList
                ref={flatListRef}
                data={SLIDES}
                renderItem={renderItem}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / width);
                    setCurrentIndex(index);
                }}
                scrollEventThrottle={16}
            />

            {/* Pagination & Controls */}
            <View className="px-8 pb-12 pt-4">
                {/* Dots */}
                <View className="flex-row gap-2 justify-center mb-10">
                    {SLIDES.map((_, index) => (
                        <View
                            key={index}
                            className={`h-2 rounded-full transition-all duration-300 ${index === currentIndex ? 'w-8 bg-zinc-900 dark:bg-white' : 'w-2 bg-zinc-300 dark:bg-zinc-800'
                                }`}
                        />
                    ))}
                </View>

                {/* Primary Button */}
                <TouchableOpacity
                    onPress={handleNext}
                    className="bg-[#006FFF] w-full py-4 rounded-2xl items-center justify-center shadow-lg shadow-blue-500/30 mb-4 active:scale-[0.98]"
                >
                    <Text className="text-white font-bold text-lg">
                        {currentIndex === SLIDES.length - 1 ? 'Hemen Başla' : 'Devam Et'}
                    </Text>
                </TouchableOpacity>

                {/* Guest Link - Only show on last slide or always? Let's show always for convenience */}
                <TouchableOpacity onPress={handleGuest} className="py-2 items-center">
                    <Text className="text-zinc-400 font-medium text-sm">Giriş yapmadan devam et</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
