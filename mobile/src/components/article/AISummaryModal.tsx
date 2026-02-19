import React from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    useColorScheme,
} from 'react-native';
import { X, Sparkles, AlertTriangle, CheckCircle } from 'lucide-react-native';
import { EmotionalAnalysisCard } from './EmotionalAnalysisCard';
import { PoliticalToneGauge } from './PoliticalToneGauge';

export interface AISummaryData {
    articleId: string;
    title: string;
    summary: string;
    keyPoints: string[];
    context: string;
    analysis: {
        politicalTone: number;
        politicalConfidence: number;
        governmentMentioned: boolean;
        emotionalTone: {
            anger: number;
            fear: number;
            joy: number;
            sadness: number;
            surprise: number;
        };
        emotionalIntensity: number;
        dominantEmotion: string;
        dominantEmotionLabel: string;
        intensityLabel: string;
        loadedLanguageScore: number;
        sensationalismScore: number;
        sensationalismLabel: string;
    };
}

interface AISummaryModalProps {
    visible: boolean;
    onClose: () => void;
    data: AISummaryData | null;
    isLoading: boolean;
    error: string | null;
}

export function AISummaryModal({ visible, onClose, data, isLoading, error }: AISummaryModalProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const getSensationalismColor = (score: number) => {
        if (score < 0.3) return '#22c55e'; // green
        if (score < 0.6) return '#f59e0b'; // yellow
        return '#ef4444'; // red
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-zinc-50 dark:bg-black">
                {/* Header */}
                <View className="flex-row items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <View className="flex-row items-center gap-2">
                        <Sparkles size={20} color="#006FFF" />
                        <Text className="text-lg font-bold text-zinc-900 dark:text-white">
                            AI Özet
                        </Text>
                    </View>
                    <TouchableOpacity onPress={onClose} className="p-2 -mr-2">
                        <X size={24} color={isDark ? '#fff' : '#000'} />
                    </TouchableOpacity>
                </View>

                {/* Content */}
                {isLoading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#006FFF" />
                        <Text className="text-zinc-500 dark:text-zinc-400 mt-4">
                            AI özeti oluşturuluyor...
                        </Text>
                    </View>
                ) : error ? (
                    <View className="flex-1 items-center justify-center px-6">
                        <AlertTriangle size={48} color="#ef4444" />
                        <Text className="text-lg font-semibold text-zinc-900 dark:text-white mt-4 text-center">
                            Özet Oluşturulamadı
                        </Text>
                        <Text className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 text-center">
                            {error}
                        </Text>
                        <TouchableOpacity
                            onPress={onClose}
                            className="mt-6 bg-zinc-200 dark:bg-zinc-800 px-6 py-3 rounded-lg"
                        >
                            <Text className="text-zinc-900 dark:text-white font-semibold">Kapat</Text>
                        </TouchableOpacity>
                    </View>
                ) : data ? (
                    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                        {/* Title */}
                        <Text className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
                            {data.title}
                        </Text>

                        {/* Summary */}
                        <View className="bg-white dark:bg-zinc-900 rounded-xl p-4 mb-4 border border-zinc-100 dark:border-zinc-800">
                            <Text className="text-[15px] leading-6 text-zinc-700 dark:text-zinc-300">
                                {data.summary}
                            </Text>
                        </View>

                        {/* Key Points */}
                        {data.keyPoints && data.keyPoints.length > 0 && (
                            <View className="mb-4">
                                <Text className="text-[15px] font-bold text-zinc-900 dark:text-white mb-2">
                                    Ana Noktalar
                                </Text>
                                <View className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800">
                                    {data.keyPoints.map((point, index) => (
                                        <View key={index} className="flex-row items-start gap-2 mb-2">
                                            <CheckCircle size={16} color="#22c55e" style={{ marginTop: 2 }} />
                                            <Text className="flex-1 text-[14px] text-zinc-700 dark:text-zinc-300">
                                                {point}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Context */}
                        {data.context && (
                            <View className="mb-4">
                                <Text className="text-[15px] font-bold text-zinc-900 dark:text-white mb-2">
                                    Bağlam
                                </Text>
                                <View className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                                    <Text className="text-[14px] text-zinc-700 dark:text-zinc-300">
                                        {data.context}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Sensationalism Warning */}
                        {data.analysis.sensationalismScore > 0.5 && (
                            <View className="mb-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                                <View className="flex-row items-center gap-2 mb-2">
                                    <AlertTriangle size={18} color="#f59e0b" />
                                    <Text className="text-[15px] font-bold text-amber-700 dark:text-amber-400">
                                        Sansasyonel İçerik
                                    </Text>
                                </View>
                                <Text className="text-[13px] text-amber-600 dark:text-amber-400">
                                    Bu haber yüksek sansasyonellik puanına sahip. Bilgileri farklı kaynaklardan doğrulamanızı öneririz.
                                </Text>
                            </View>
                        )}

                        {/* Political Analysis */}
                        <View className="mb-4">
                            <Text className="text-[15px] font-bold text-zinc-900 dark:text-white mb-2">
                                Siyasi Analiz
                            </Text>
                            <PoliticalToneGauge
                                politicalTone={data.analysis.politicalTone}
                                politicalConfidence={data.analysis.politicalConfidence}
                                governmentMentioned={data.analysis.governmentMentioned}
                            />
                        </View>

                        {/* Emotional Analysis */}
                        <View className="mb-4">
                            <Text className="text-[15px] font-bold text-zinc-900 dark:text-white mb-2">
                                Duygu Analizi
                            </Text>
                            <EmotionalAnalysisCard
                                emotionalTone={data.analysis.emotionalTone}
                                emotionalIntensity={data.analysis.emotionalIntensity}
                            />
                        </View>

                        {/* Content Quality Indicators */}
                        <View className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800">
                            <Text className="text-[14px] font-bold text-zinc-900 dark:text-white mb-3">
                                İçerik Kalitesi
                            </Text>
                            <View className="flex-row items-center justify-between mb-2">
                                <Text className="text-[13px] text-zinc-600 dark:text-zinc-400">
                                    Sansasyonellik
                                </Text>
                                <View className="flex-row items-center gap-2">
                                    <View
                                        style={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: 4,
                                            backgroundColor: getSensationalismColor(data.analysis.sensationalismScore),
                                        }}
                                    />
                                    <Text className="text-[13px] font-medium text-zinc-900 dark:text-white">
                                        {data.analysis.sensationalismLabel}
                                    </Text>
                                </View>
                            </View>
                            <View className="flex-row items-center justify-between mb-2">
                                <Text className="text-[13px] text-zinc-600 dark:text-zinc-400">
                                    Duygusal Yoğunluk
                                </Text>
                                <Text className="text-[13px] font-medium text-zinc-900 dark:text-white">
                                    {data.analysis.intensityLabel}
                                </Text>
                            </View>
                            <View className="flex-row items-center justify-between">
                                <Text className="text-[13px] text-zinc-600 dark:text-zinc-400">
                                    Baskın Duygu
                                </Text>
                                <Text className="text-[13px] font-medium text-zinc-900 dark:text-white">
                                    {data.analysis.dominantEmotionLabel}
                                </Text>
                            </View>
                        </View>
                    </ScrollView>
                ) : null}
            </View>
        </Modal>
    );
}
