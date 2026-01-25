import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Dimensions, LayoutChangeEvent } from 'react-native';
import { ArticleCard } from '../article/ArticleCard';
import { Article } from '../../types';
import { FlashList, ListRenderItemInfo } from '@shopify/flash-list';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

interface BalancedFeedScreenProps {
    proGovArticles: Article[];
    mixedArticles: Article[];
    antiGovArticles: Article[];
    isLoading: boolean;
    onRefresh: () => void;
}

const TABS = [
    { id: 'antiGov', label: 'Muhalif', color: 'text-indigo-600', activeColor: '#4f46e5' },
    { id: 'mixed', label: 'Dengeli', color: 'text-zinc-600', activeColor: '#52525b' },
    { id: 'proGov', label: 'İktidar', color: 'text-amber-600', activeColor: '#d97706' },
] as const;

export const BalancedFeedScreen = React.memo(({ proGovArticles, mixedArticles, antiGovArticles, isLoading, onRefresh }: BalancedFeedScreenProps) => {
    const [activeTab, setActiveTab] = useState<'antiGov' | 'mixed' | 'proGov'>('mixed');
    const [containerWidth, setContainerWidth] = useState(0);

    // Animation values
    const indicatorPosition = useSharedValue(0);

    useEffect(() => {
        // Calculate position based on active tab index (0, 1, 2)
        const tabIndex = TABS.findIndex(t => t.id === activeTab);
        const tabWidth = (containerWidth - 8) / 3; // 8 is total horizontal padding (p-1 = 4px * 2 sides)

        if (containerWidth > 0) {
            indicatorPosition.value = withSpring(tabIndex * tabWidth, {
                damping: 20,
                stiffness: 150,
            });
        }
    }, [activeTab, containerWidth]);

    const indicatorStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: indicatorPosition.value }],
            width: (containerWidth - 8) / 3,
        };
    });

    const getActiveData = () => {
        switch (activeTab) {
            case 'antiGov': return antiGovArticles;
            case 'mixed': return mixedArticles;
            case 'proGov': return proGovArticles;
            default: return [];
        }
    };

    const activeData = getActiveData();

    const handleLayout = (e: LayoutChangeEvent) => {
        setContainerWidth(e.nativeEvent.layout.width);
    };

    if (isLoading && !activeData.length) {
        return (
            <View className="flex-1 items-center justify-center py-20">
                <ActivityIndicator color="#006FFF" size="large" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-zinc-50 dark:bg-black">
            {/* Custom Animated Tab Bar */}
            <View
                className="mx-4 my-3 bg-zinc-100 dark:bg-zinc-900/50 rounded-xl p-1 relative border border-zinc-200/50 dark:border-zinc-800"
                onLayout={handleLayout}
            >
                {/* Animated Indicator */}
                {containerWidth > 0 && (
                    <Animated.View
                        className="absolute top-1 left-1 bottom-1 bg-white dark:bg-zinc-800 rounded-lg shadow-sm"
                        style={indicatorStyle}
                    />
                )}

                {/* Tab Buttons */}
                <View className="flex-row">
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <TouchableOpacity
                                key={tab.id}
                                onPress={() => setActiveTab(tab.id as any)}
                                className="flex-1 py-2.5 items-center justify-center z-10"
                                activeOpacity={0.7}
                            >
                                <Text className={`text-xs font-bold leading-none ${isActive
                                    ? tab.color
                                    : 'text-zinc-400 dark:text-zinc-500'
                                    }`}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Info Banner */}
            <View className="px-6 mb-4">
                <Text className="text-[11px] text-center text-zinc-400 font-medium tracking-wide">
                    {activeTab === 'antiGov' && 'Hükümet politikalarına eleştirel yaklaşan kaynakların akışı.'}
                    {activeTab === 'mixed' && 'Merkezde duran veya farklı görüşleri harmanlayan dengeli akış.'}
                    {activeTab === 'proGov' && 'Hükümet politikalarını destekleyen kaynakların akışı.'}
                </Text>
            </View>

            <View className="flex-1 min-h-[2px]">
                {/* @ts-ignore: FlashList types issue with estimatedItemSize */}
                <FlashList<Article>
                    data={activeData}
                    renderItem={({ item }: ListRenderItemInfo<Article>) => <ArticleCard article={item} />}
                    estimatedItemSize={280}
                    contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 0 }}
                    refreshing={isLoading}
                    onRefresh={onRefresh}
                    ListEmptyComponent={
                        <View className="items-center justify-center py-20 px-4">
                            <Text className="text-zinc-400 text-center font-medium">Bu kategoride henüz haber bulunamadı.</Text>
                        </View>
                    }
                />
            </View>
        </View>
    );
});
