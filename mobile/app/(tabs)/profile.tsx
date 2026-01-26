import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Activity, Award, ChevronRight, History, ShieldCheck, TrendingUp, BookOpen } from 'lucide-react-native';

// const { width } = Dimensions.get('window'); // Kept for future use

export default function AnalysisScreen() {
    // const [selectedTab, setSelectedTab] = useState<'overview' | 'stats'>('overview'); // Commented out - not used yet

    // Mock User Data for Analysis
    const userStats = {
        readingLevel: 'Meraklı Okur',
        reputationScore: 785,
        articlesRead: 142,
        topicsCount: 12,
        biasScore: 0.1, // Near 0 is balanced
        politicalLean: 'Merkez', // Center
        favoriteTopic: 'Ekonomi',
        readTime: '12sa 30dk'
    };

    return (
        <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-black" edges={['top']}>
            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Header */}
                <View className="px-6 py-6 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 rounded-b-[32px] shadow-sm z-10">
                    <Text className="text-zinc-500 dark:text-zinc-400 font-medium mb-1">Haftalık Analiz</Text>
                    <Text className="text-3xl font-black text-zinc-900 dark:text-white">
                        Okuma Profilin
                    </Text>

                    {/* Identity Card */}
                    <View className="mt-6 bg-zinc-50 dark:bg-zinc-800/50 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-700 flex-row items-center justify-between">
                        <View>
                            <Text className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1">
                                OKUMA KİMLİĞİN
                            </Text>
                            <Text className="text-2xl font-bold text-[#006FFF]">
                                {userStats.readingLevel}
                            </Text>
                        </View>
                        <View className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-full items-center justify-center">
                            <BookOpen size={24} color="#006FFF" />
                        </View>
                    </View>

                    {/* Key Metrics Row */}
                    <View className="flex-row mt-4 gap-3">
                        <View className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-700">
                            <View className="flex-row items-center gap-2 mb-2">
                                <ShieldCheck size={16} color="#10b981" />
                                <Text className="text-zinc-500 text-xs font-bold">GÜVEN SKORU</Text>
                            </View>
                            <Text className="text-2xl font-black text-zinc-900 dark:text-white">{userStats.reputationScore}</Text>
                            <Text className="text-emerald-500 text-xs font-medium mt-1">Yüksek Güvenilirlik</Text>
                        </View>
                        <View className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-700">
                            <View className="flex-row items-center gap-2 mb-2">
                                <Activity size={16} color="#f59e0b" />
                                <Text className="text-zinc-500 text-xs font-bold">OKUMA</Text>
                            </View>
                            <Text className="text-2xl font-black text-zinc-900 dark:text-white">{userStats.articlesRead}</Text>
                            <Text className="text-zinc-400 text-xs font-medium mt-1">Makale bu ay</Text>
                        </View>
                    </View>
                </View>

                {/* Main Content Area */}
                <View className="p-6">
                    {/* Perspective Balance */}
                    <Text className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Perspektif Dengesi</Text>
                    <View className="bg-white dark:bg-zinc-900 p-5 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800 mb-6">
                        <View className="flex-row justify-between mb-2">
                            <Text className="text-zinc-500 text-xs">SOL GÖRÜŞ</Text>
                            <Text className="text-zinc-900 dark:text-white font-bold text-sm">MERKEZ</Text>
                            <Text className="text-zinc-500 text-xs">SAĞ GÖRÜŞ</Text>
                        </View>
                        {/* Bar */}
                        <View className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden relative">
                            {/* Center Marker */}
                            <View className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-zinc-300 dark:bg-zinc-600 -ml-[1px] z-10" />
                            {/* Bias Indicator */}
                            <View
                                className="absolute top-0 bottom-0 bg-[#006FFF] rounded-full opacity-80"
                                style={{
                                    left: '45%',
                                    width: '10%' // Center loaded
                                }}
                            />
                        </View>
                        <Text className="text-center text-zinc-400 text-xs mt-3">
                            Okumaların dengeli bir seyir izliyor. Farklı kaynaklardan besleniyorsun.
                        </Text>
                    </View>

                    {/* Source Analysis & Voting */}
                    <Text className="text-lg font-bold text-zinc-900 dark:text-white mb-4 mt-2">Kaynak Güvenilirliği</Text>
                    <View className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-100 dark:border-zinc-800 shadow-sm mb-6">
                        <Text className="text-zinc-500 text-xs mb-4">
                            Okuduğun kaynakların topluluk güven skorları ve senin değerlendirmelerin.
                        </Text>

                        {[
                            { name: 'NTV', score: 92, lean: 'Merkez', voted: true },
                            { name: 'Sözcü', score: 78, lean: 'Sol Eğilimli', voted: false },
                            { name: 'A Haber', score: 45, lean: 'Sağ Eğilimli', voted: false },
                            { name: 'Webrazzi', score: 88, lean: 'Teknoloji', voted: true }
                        ].map((source, idx) => (
                            <View key={idx} className="flex-row items-center justify-between mb-4 last:mb-0">
                                <View className="flex-1">
                                    <View className="flex-row items-center gap-2 mb-1">
                                        <Text className="text-base font-bold text-zinc-900 dark:text-white">{source.name}</Text>
                                        <View className={`px-2 py-0.5 rounded text-[10px] ${source.lean === 'Merkez' ? 'bg-gray-100 text-gray-600' :
                                            source.lean.includes('Sol') ? 'bg-red-100 text-red-600' :
                                                source.lean.includes('Sağ') ? 'bg-blue-100 text-blue-600' :
                                                    'bg-purple-100 text-purple-600'
                                            }`}>
                                            <Text className="text-[10px] font-bold opacity-70">{source.lean}</Text>
                                        </View>
                                    </View>
                                    <View className="flex-row items-center gap-2">
                                        <View className="h-1.5 flex-1 bg-zinc-100 rounded-full overflow-hidden max-w-[100px]">
                                            <View
                                                className={`h-full rounded-full ${source.score > 80 ? 'bg-green-500' : source.score > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                style={{ width: `${source.score}%` }}
                                            />
                                        </View>
                                        <Text className="text-xs text-zinc-400 font-medium">%{source.score} Güven</Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    className={`px-3 py-1.5 rounded-full border ${source.voted ? 'bg-zinc-900 border-zinc-900 dark:bg-white dark:border-white' : 'bg-transparent border-zinc-200 dark:border-zinc-700'}`}
                                >
                                    <Text className={`text-xs font-bold ${source.voted ? 'text-white dark:text-zinc-900' : 'text-zinc-600 dark:text-zinc-400'}`}>
                                        {source.voted ? 'O yollandı' : 'Oy Ver'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>

                    {/* Weekly Keywords Cloud */}
                    <Text className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Haftanın Kelimeleri</Text>
                    <View className="flex-row flex-wrap gap-2 mb-8">
                        {[
                            { text: 'Enflasyon', size: 'text-2xl', color: 'text-zinc-900 dark:text-white', weight: 'font-black' },
                            { text: 'Seçim', size: 'text-xl', color: 'text-zinc-700 dark:text-zinc-300', weight: 'font-bold' },
                            { text: 'Yapay Zeka', size: 'text-lg', color: 'text-blue-600', weight: 'font-bold' },
                            { text: 'Bitcoin', size: 'text-base', color: 'text-zinc-600 dark:text-zinc-400', weight: 'font-medium' },
                            { text: 'Merkez Bankası', size: 'text-lg', color: 'text-zinc-800 dark:text-zinc-200', weight: 'font-bold' },
                            { text: 'Futbol', size: 'text-sm', color: 'text-zinc-500', weight: 'font-normal' },
                            { text: 'İklim Krizi', size: 'text-base', color: 'text-green-600', weight: 'font-medium' },
                            { text: 'Teknoloji', size: 'text-sm', color: 'text-zinc-500', weight: 'font-normal' },
                            { text: 'Zam', size: 'text-xl', color: 'text-red-500', weight: 'font-bold' },
                        ].map((item, idx) => (
                            <View key={idx} className="bg-zinc-100 dark:bg-zinc-800/50 px-3 py-2 rounded-xl">
                                <Text className={`${item.size} ${item.color} ${item.weight}`}>{item.text}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Topic Distribution */}
                    <Text className="text-lg font-bold text-zinc-900 dark:text-white mb-4">İlgi Alanları Dağılımın</Text>
                    <View className="flex-row gap-3 mb-8">
                        {/* Custom Pie Chart-ish visualization */}
                        <View className="flex-1 bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                            {[
                                { label: 'Ekonomi', percent: 45, color: 'bg-blue-500' },
                                { label: 'Siyaset', percent: 30, color: 'bg-red-500' },
                                { label: 'Teknoloji', percent: 15, color: 'bg-purple-500' },
                                { label: 'Spor', percent: 10, color: 'bg-green-500' },
                            ].map((topic, i) => (
                                <View key={i} className="mb-3 last:mb-0">
                                    <View className="flex-row justify-between mb-1">
                                        <Text className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{topic.label}</Text>
                                        <Text className="text-xs text-zinc-500">%{topic.percent}</Text>
                                    </View>
                                    <View className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                        <View className={`h-full rounded-full ${topic.color}`} style={{ width: `${topic.percent}%` }} />
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* Emotional Tone Card */}
                        <View className="flex-1 bg-indigo-50 dark:bg-indigo-900/10 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-900/30 justify-between">
                            <View>
                                <Text className="text-indigo-900 dark:text-indigo-300 font-bold text-lg mb-1">Ruh Hali</Text>
                                <Text className="text-indigo-600 dark:text-indigo-400 text-xs leading-relaxed">
                                    Okuduğun haberler genellikle <Text className="font-bold">gergin</Text> ve <Text className="font-bold">ciddi</Text> tonlu.
                                </Text>
                            </View>

                            <View className="mt-4">
                                <View className="flex-row items-end gap-1 mb-1">
                                    <Text className="text-3xl font-black text-indigo-600 dark:text-indigo-400">%65</Text>
                                    <Text className="text-xs text-indigo-400 mb-1.5 font-bold">NEGATİF</Text>
                                </View>
                                <View className="h-1.5 w-full bg-indigo-200 dark:bg-indigo-800 rounded-full overflow-hidden">
                                    <View className="h-full bg-indigo-500 w-[65%]" />
                                </View>
                                <Text className="text-[10px] text-indigo-400 mt-2">
                                    Dengelemek için, biraz teknoloji veya sanat haberlerine göz atabilirsin.
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Quick Allow Buttons */}
                    <Text className="text-lg font-bold text-zinc-900 dark:text-white mb-4">İşlemler</Text>

                    <View className="gap-3">
                        <TouchableOpacity className="flex-row items-center bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 active:scale-[0.99]">
                            <View className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full items-center justify-center mr-4">
                                <TrendingUp size={20} color="#9333ea" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-base font-bold text-zinc-900 dark:text-white">Detaylı Rapor</Text>
                                <Text className="text-zinc-500 text-xs">Kategori bazlı analizlerini gör</Text>
                            </View>
                            <ChevronRight size={20} color="#d4d4d8" />
                        </TouchableOpacity>

                        <TouchableOpacity className="flex-row items-center bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 active:scale-[0.99]">
                            <View className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full items-center justify-center mr-4">
                                <History size={20} color="#ea580c" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-base font-bold text-zinc-900 dark:text-white">Okuma Geçmişi</Text>
                                <Text className="text-zinc-500 text-xs">Son okuduğun 142 makale</Text>
                            </View>
                            <ChevronRight size={20} color="#d4d4d8" />
                        </TouchableOpacity>

                        <TouchableOpacity className="flex-row items-center bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 active:scale-[0.99]">
                            <View className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full items-center justify-center mr-4">
                                <Award size={20} color="#ca8a04" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-base font-bold text-zinc-900 dark:text-white">Rozetlerim</Text>
                                <Text className="text-zinc-500 text-xs">Kazanılan 4 rozet</Text>
                            </View>
                            <ChevronRight size={20} color="#d4d4d8" />
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
