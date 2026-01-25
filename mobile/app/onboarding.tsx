import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Image, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
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

    const handleNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            handleFinish();
        }
    };

    const handleFinish = () => {
        // Here we would normally set a flag in storage that onboarding is done
        router.replace('/(tabs)');
    };

    const renderItem = ({ item }: { item: typeof SLIDES[0] }) => {
        return (
            <View style={{ width, height }} className="items-center justify-center p-8">
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
            <View className="absolute bottom-12 left-0 right-0 px-8 flex-row items-center justify-between">
                {/* Dots */}
                <View className="flex-row gap-2">
                    {SLIDES.map((_, index) => (
                        <View
                            key={index}
                            className={`h-2 rounded-full transition-all duration-300 ${index === currentIndex ? 'w-8 bg-zinc-900 dark:bg-white' : 'w-2 bg-zinc-300 dark:bg-zinc-800'
                                }`}
                        />
                    ))}
                </View>

                {/* Button */}
                <TouchableOpacity
                    onPress={handleNext}
                    className="bg-zinc-900 dark:bg-white w-14 h-14 rounded-full items-center justify-center shadow-lg active:scale-95 transition-transform"
                >
                    {currentIndex === SLIDES.length - 1 ? (
                        <Check size={24} color={Platform.OS === 'ios' ? '#000' : '#fff'} className="text-white dark:text-black" />
                    ) : (
                        <ArrowRight size={24} color={Platform.OS === 'ios' ? '#fff' : '#000'} className="text-white dark:text-black" />
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

// Helper for icon color fix if lucide props behave oddly on native directly
import { Platform } from 'react-native';
