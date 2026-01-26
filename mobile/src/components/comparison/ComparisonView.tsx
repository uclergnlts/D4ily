import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Scale, ArrowLeftRight, TrendingUp, ChevronRight, Zap, Search } from 'lucide-react-native';

const ComparisonCard = ({ topic, source1, source2, diffScore }: any) => (
    <TouchableOpacity className="bg-white dark:bg-zinc-900 w-72 rounded-2xl p-4 mr-4 border border-zinc-100 dark:border-zinc-800 shadow-sm">
        <View className="flex-row items-center justify-between mb-3">
            <View className="bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-md">
                <Text className="text-[10px] font-bold text-amber-700 dark:text-amber-500">GÜNDEM</Text>
            </View>
            <Text className="text-xs font-bold text-zinc-400">{diffScore}% Fark</Text>
        </View>
        <Text className="text-lg font-bold text-zinc-900 dark:text-white mb-4 leading-6" numberOfLines={2}>
            {topic}
        </Text>
        <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
                <View className="w-6 h-6 bg-red-100 rounded-full mr-2 items-center justify-center"><Text className="text-[10px] font-bold">CN</Text></View>
                <Text className="text-xs text-zinc-500 font-medium">{source1}</Text>
            </View>
            <ArrowLeftRight size={14} color="#a1a1aa" />
            <View className="flex-row items-center">
                <Text className="text-xs text-zinc-500 font-medium mr-2">{source2}</Text>
                <View className="w-6 h-6 bg-blue-100 rounded-full items-center justify-center"><Text className="text-[10px] font-bold">FX</Text></View>
            </View>
        </View>
    </TouchableOpacity>
);

const ToolCard = ({ icon: Icon, title, desc, color }: any) => (
    <TouchableOpacity className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 mb-3 flex-row items-center active:bg-zinc-50 dark:active:bg-zinc-800">
        <View className={`w-12 h-12 rounded-full items-center justify-center bg-opacity-10 mr-4`} style={{ backgroundColor: `${color}20` }}>
            <Icon size={24} color={color} />
        </View>
        <View className="flex-1">
            <Text className="text-base font-bold text-zinc-900 dark:text-white mb-1">{title}</Text>
            <Text className="text-xs text-zinc-500 leading-4">{desc}</Text>
        </View>
        <ChevronRight size={20} color="#d4d4d8" />
    </TouchableOpacity>
);

// Mock Data for Charts
const MEDIA_LANDSCAPE = [
    { id: 1, name: 'Fox', score: -8, y: 20, color: '#ef4444', size: 40 },
    { id: 2, name: 'CNN', score: -6, y: 60, color: '#ef4444', size: 30 },
    { id: 3, name: 'BBC', score: -2, y: 40, color: '#8b5cf6', size: 35 },
    { id: 4, name: 'Reuters', score: 0, y: 50, color: '#a1a1aa', size: 25 },
    { id: 5, name: 'Sabah', score: 6, y: 30, color: '#3b82f6', size: 35 },
    { id: 6, name: 'A Haber', score: 9, y: 70, color: '#3b82f6', size: 40 },
];

const MediaLandscapeChart = () => {
    return (
        <View className="bg-white dark:bg-zinc-900 rounded-3xl p-6 mb-6 border border-zinc-100 dark:border-zinc-800 shadow-sm mx-6">
            <View className="flex-row items-center justify-between mb-6">
                <View>
                    <Text className="text-lg font-bold text-zinc-900 dark:text-white">Medya Manzarası</Text>
                    <Text className="text-xs text-zinc-400">Kaynakların politik duruş analizi</Text>
                </View>
                <TouchableOpacity>
                    <Scale size={20} color="#006FFF" />
                </TouchableOpacity>
            </View>

            <View className="h-40 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl relative overflow-hidden border border-zinc-100 dark:border-zinc-800">
                {/* Grid Lines */}
                <View className="absolute inset-0 flex-row">
                    <View className="flex-1 border-r border-dashed border-zinc-200 dark:border-zinc-700 opacity-50" />
                    <View className="flex-1 border-r border-zinc-300 dark:border-zinc-600 w-[1px] opacity-80" />
                    <View className="flex-1 border-r border-dashed border-zinc-200 dark:border-zinc-700 opacity-50" />
                    <View className="flex-1" />
                </View>

                {/* Axis Labels */}
                <View className="absolute bottom-2 w-full flex-row justify-between px-4">
                    <Text className="text-[9px] font-bold text-zinc-400">SOL</Text>
                    <Text className="text-[9px] font-bold text-zinc-400">MERKEZ</Text>
                    <Text className="text-[9px] font-bold text-zinc-400">SAĞ</Text>
                </View>

                {/* Bubbles */}
                {MEDIA_LANDSCAPE.map((item) => (
                    <View
                        key={item.id}
                        className="absolute items-center justify-center rounded-full shadow-sm border-2 border-white dark:border-zinc-800"
                        style={{
                            left: `${50 + (item.score * 5)}%`, // Map -10..10 to 0..100%
                            top: `${item.y}%`,
                            width: item.size,
                            height: item.size,
                            backgroundColor: item.color,
                            transform: [{ translateX: -item.size / 2 }, { translateY: -item.size / 2 }]
                        }}
                    >
                        <Text className="text-[8px] font-bold text-white text-center">{item.name}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

const MonthlyStats = () => (
    <View className="mx-6 mb-8 flex-row gap-4">
        <View className="flex-1 bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 items-center">
            <Text className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mb-1">127</Text>
            <Text className="text-xs font-semibold text-indigo-400 text-center">Okunan Haber</Text>
        </View>
        <View className="flex-1 bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 items-center">
            <Text className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mb-1">%85</Text>
            <Text className="text-xs font-semibold text-emerald-400 text-center">Denge Skoru</Text>
        </View>
    </View>
);

export const ComparisonView = () => {
    return (
        <ScrollView className="flex-1 bg-zinc-50 dark:bg-black" contentContainerStyle={{ paddingBottom: 100 }}>
            {/* Header */}
            <View className="p-6 pb-2">
                <Text className="text-3xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight">
                    Analiz & Kıyas
                </Text>
                <Text className="text-zinc-500 text-base leading-6">
                    Medya manipülasyonunu keşfet ve gerçekleri gör.
                </Text>
            </View>

            {/* Mock Chart */}
            <MediaLandscapeChart />

            {/* Quick Stats */}
            <MonthlyStats />

            {/* Trending Carousel */}
            <View className="mb-8">
                <View className="px-6 flex-row items-center justify-between mb-4">
                    <Text className="text-lg font-bold text-zinc-900 dark:text-white">Popüler Karşılaştırmalar</Text>
                    <TouchableOpacity>
                        <Text className="text-primary font-bold text-sm">Tümü</Text>
                    </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24 }}>
                    <ComparisonCard
                        topic="Ekonomi Politikaları ve Enflasyon Raporu"
                        source1="CNN Türk"
                        source2="Fox Haber"
                        diffScore={85}
                    />
                    <ComparisonCard
                        topic="Eğitim Reform Tasarısı Tartışmaları"
                        source1="Sabah"
                        source2="Cumhuriyet"
                        diffScore={92}
                    />
                    <ComparisonCard
                        topic="Sokak Hayvanları Yasası"
                        source1="HaberGlobal"
                        source2="Sözcü"
                        diffScore={78}
                    />
                </ScrollView>
            </View>

            {/* Tools Section */}
            <View className="px-6">
                <Text className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Analiz Araçları</Text>
                <ToolCard
                    icon={Scale}
                    title="Duruş Analizi"
                    desc="Bir haberin sağ, sol veya merkez medyada nasıl işlendiğini gör."
                    color="#a855f7"
                />
                <ToolCard
                    icon={TrendingUp}
                    title="Manipülasyon Dedektörü"
                    desc="Metindeki duygusal yükü ve yönlendirici dili yapay zeka ile tara."
                    color="#f59e0b"
                />
                <ToolCard
                    icon={Zap}
                    title="Anlık Doğrulama"
                    desc="İddiaları güvenilir kaynaklarla çapraz kontrol et."
                    color="#006FFF"
                />
            </View>

            {/* Footer Banner */}
            <View className="mx-6 mt-6 bg-zinc-900 dark:bg-zinc-800 p-6 rounded-3xl overflow-hidden relative">
                <View className="absolute top-0 right-0 p-6 opacity-30">
                    <Search size={100} color="white" />
                </View>
                <Text className="text-white font-bold text-xl mb-2 w-2/3">Kendi Analizini Yap</Text>
                <Text className="text-zinc-400 text-sm mb-4 w-2/3">Merak ettiğin bir haberi veya linki yapıştır, gerçek yüzünü ortaya çıkaralım.</Text>
                <TouchableOpacity className="bg-white py-3 px-6 rounded-xl self-start">
                    <Text className="text-black font-bold">Analiz Başlat</Text>
                </TouchableOpacity>
            </View>

        </ScrollView>
    );
};
