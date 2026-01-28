import React from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import * as WebBrowser from 'expo-web-browser';
import { Article } from '../../types';

interface FeaturedCarouselProps {
    articles: Article[];
}

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.8;
const SPACING = 16;

export const FeaturedCarousel = React.memo(function FeaturedCarousel({ articles }: FeaturedCarouselProps) {
    if (!articles?.length) return null;

    const renderItem = ({ item }: { item: Article }) => {
        const primarySource = item.sources?.find(s => s.isPrimary) || item.sources?.[0];
        const sourceName = primarySource?.sourceName || 'Kaynak';
        const sourceLogo = primarySource?.sourceLogoUrl;

        const handlePress = async () => {
            const url = item.sources?.[0]?.sourceUrl;
            if (url) {
                try {
                    await WebBrowser.openBrowserAsync(url);
                } catch {
                    // Fallback or silent fail
                }
            }
        };

        return (
            <TouchableOpacity
                onPress={handlePress}
                className="bg-white dark:bg-zinc-900 rounded-[20px] shadow-sm border border-zinc-100 dark:border-zinc-800 overflow-hidden mr-4"
                style={{ width: ITEM_WIDTH }}
                activeOpacity={0.9}
            >
                <Image
                    source={{ uri: item.imageUrl || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=2070&auto=format&fit=crop' }}
                    style={{ width: '100%', height: 180 }}
                    contentFit="cover"
                    transition={200}
                />
                <View className="p-4 flex-1 justify-between">
                    <Text
                        className="text-[17px] font-bold text-zinc-900 dark:text-white leading-[24px] mb-2"
                        numberOfLines={3}
                    >
                        {item.translatedTitle}
                    </Text>
                    <View className="flex-row items-center gap-2">
                        {sourceLogo ? (
                            <Image
                                source={{ uri: sourceLogo }}
                                style={{ width: 24, height: 24, borderRadius: 12 }}
                                contentFit="contain"
                            />
                        ) : (
                            <View className="w-6 h-6 rounded-full bg-yellow-400 items-center justify-center">
                                <Text className="text-[10px] font-bold text-black">{sourceName.charAt(0)}</Text>
                            </View>
                        )}
                        <Text className="text-[13px] font-bold text-zinc-700 dark:text-zinc-300">
                            {sourceName}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View className="mb-2">
            <View className="px-4 mb-3">
                <Text className="text-[17px] font-bold text-zinc-500 dark:text-zinc-400">
                    Öne Çıkanlar
                </Text>
            </View>
            <FlashList
                data={articles}
                renderItem={renderItem}
                estimatedItemSize={ITEM_WIDTH}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                snapToInterval={ITEM_WIDTH + SPACING}
                decelerationRate="fast"
            />
        </View>
    );
});

FeaturedCarousel.displayName = 'FeaturedCarousel';
