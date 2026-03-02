import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Dimensions, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, FadeOut } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        title: 'Günlük Özetler',
        description: 'Yapay zeka ile hazırlanan günlük haber özetleri sayesinde gündemin nabzını tut. Her sabah ve akşam seni bilgilendirelim.',
        icon: '📰',
        color: '#006FFF'
    },
    {
        id: '2',
        title: '8 Ülke, Tek Uygulama',
        description: 'Türkiye, ABD, İngiltere, Almanya, Fransa, İspanya, İtalya ve Rusya haberlerini ve tweetlerini tek ekrandan takip et.',
        icon: '🌍',
        color: '#a855f7'
    },
    {
        id: '3',
        title: 'Farklı Bakış Açıları',
        description: 'Her haberi farklı kaynakların gözünden gör. Dengeli ve bağımsız habercilik için tasarlandı.',
        icon: '⚖️',
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

    const completeOnboarding = async () => {
        await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    };

    const handleNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            completeOnboarding().then(() => router.replace('/(tabs)'));
        }
    };

    const handleGuest = () => {
        completeOnboarding().then(() => router.replace('/(tabs)'));
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
                        {currentIndex === SLIDES.length - 1 ? 'Başlayalım' : 'Devam Et'}
                    </Text>
                </TouchableOpacity>

                {currentIndex < SLIDES.length - 1 && (
                    <TouchableOpacity onPress={handleGuest} className="py-2 items-center">
                        <Text className="text-zinc-400 font-medium text-sm">Atla</Text>
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
}
