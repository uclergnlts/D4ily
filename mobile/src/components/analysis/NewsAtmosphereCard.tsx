import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Activity, Flame, Newspaper, MessageSquareWarning, Megaphone } from 'lucide-react-native';
import type { CIIData } from '../../hooks/useCII';


interface MetricBarProps {
    label: string;
    value: number; // 0-1
    icon: React.ElementType;
    color: string;
    delay: number;
    description: string;
}

function MetricBar({ label, value, icon: Icon, color, delay, description }: MetricBarProps) {
    const width = useSharedValue(0);
    const pct = Math.round(value * 100);

    useEffect(() => {
        width.value = withDelay(delay, withTiming(Math.min(100, Math.max(0, pct)), { duration: 800 }));
    }, [pct, delay, width]);

    const animatedStyle = useAnimatedStyle(() => ({
        width: `${width.value}%`,
    }));

    const getBarColor = (v: number) => {
        if (v < 0.3) return '#10b981'; // green
        if (v < 0.6) return '#f59e0b'; // amber
        return '#ef4444'; // red
    };

    const barColor = color || getBarColor(value);

    return (
        <View className="mb-4">
            <View className="flex-row items-center justify-between mb-1">
                <View className="flex-row items-center gap-2">
                    <Icon size={14} color={barColor} />
                    <Text
                        className="text-[13px] text-zinc-800 dark:text-zinc-200"
                        style={{ fontFamily: 'DMSans_600SemiBold' }}
                    >
                        {label}
                    </Text>
                </View>
                <Text
                    className="text-[12px] text-zinc-500"
                    style={{ fontFamily: 'DMSans_700Bold', color: barColor }}
                >
                    %{pct}
                </Text>
            </View>
            <View className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <Animated.View
                    className="h-full rounded-full"
                    style={[animatedStyle, { backgroundColor: barColor }]}
                />
            </View>
            <Text
                className="text-[10px] text-zinc-400 mt-0.5"
                style={{ fontFamily: 'DMSans_400Regular' }}
            >
                {description}
            </Text>
        </View>
    );
}

function ScoreRing({ score, level }: { score: number; level: string }) {
    const color = level === 'low' ? '#10b981' : level === 'medium' ? '#f59e0b' : '#ef4444';
    const bgColor = level === 'low' ? 'rgba(16,185,129,0.1)' : level === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)';
    const label = level === 'low' ? 'Sakin' : level === 'medium' ? 'Hareketli' : 'Gergin';

    return (
        <View className="items-center">
            <View
                className="w-20 h-20 rounded-full items-center justify-center border-[3px]"
                style={{ borderColor: color, backgroundColor: bgColor }}
            >
                <Text
                    className="text-2xl"
                    style={{ fontFamily: 'DMSans_700Bold', color }}
                >
                    {score}
                </Text>
            </View>
            <Text
                className="text-[12px] mt-1.5"
                style={{ fontFamily: 'DMSans_600SemiBold', color }}
            >
                {label}
            </Text>
            <Text
                className="text-[10px] text-zinc-400"
                style={{ fontFamily: 'DMSans_400Regular' }}
            >
                100 üzerinden
            </Text>
        </View>
    );
}

interface NewsAtmosphereCardProps {
    data: CIIData;
    className?: string;
}

export function NewsAtmosphereCard({ data, className }: NewsAtmosphereCardProps) {
    const { breakdown, anomaly } = data;

    return (
        <View className={`bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4 ${className || ''}`}>
            {/* Header with score ring */}
            <View className="flex-row items-center justify-between mb-5">
                <View className="flex-1 mr-4">
                    <Text
                        className="text-base text-zinc-900 dark:text-white mb-1"
                        style={{ fontFamily: 'DMSans_700Bold' }}
                    >
                        Haber Atmosferi
                    </Text>
                    <Text
                        className="text-[12px] text-zinc-500 leading-4"
                        style={{ fontFamily: 'DMSans_400Regular' }}
                    >
                        Son 24 saatteki {data.articleCount24h} haberin duygu analizi
                    </Text>
                    {anomaly && anomaly.level !== 'NORMAL' && (
                        <View className="flex-row items-center gap-1 mt-2 px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded-lg self-start">
                            <Activity size={12} color="#ef4444" />
                            <Text
                                className="text-[11px] text-red-600 dark:text-red-400"
                                style={{ fontFamily: 'DMSans_600SemiBold' }}
                            >
                                {anomaly.level === 'ELEVATED' ? 'Normalin üstü' :
                                    anomaly.level === 'HIGH' ? 'Yüksek aktivite' : 'Kritik seviye'}
                                {' '}({anomaly.zScore.toFixed(1)}x)
                            </Text>
                        </View>
                    )}
                </View>
                <ScoreRing score={data.score} level={data.level} />
            </View>

            {/* Metric bars */}
            <MetricBar
                label="Olumsuz Duygu"
                value={breakdown.negativeSentimentRatio}
                icon={Flame}
                color={breakdown.negativeSentimentRatio < 0.3 ? '#10b981' : breakdown.negativeSentimentRatio < 0.6 ? '#f59e0b' : '#ef4444'}
                delay={0}
                description="Haberlerdeki olumsuz duygu oranı"
            />
            <MetricBar
                label="Duygusal Yoğunluk"
                value={breakdown.avgEmotionalIntensity}
                icon={Activity}
                color={breakdown.avgEmotionalIntensity < 0.3 ? '#10b981' : breakdown.avgEmotionalIntensity < 0.6 ? '#f59e0b' : '#ef4444'}
                delay={100}
                description="Haberlerin ortalama duygusal şiddeti"
            />
            <MetricBar
                label="Haber Hızı"
                value={breakdown.newsVelocityScore}
                icon={Newspaper}
                color={breakdown.newsVelocityScore < 0.3 ? '#10b981' : breakdown.newsVelocityScore < 0.6 ? '#f59e0b' : '#ef4444'}
                delay={200}
                description="Haber akış hızı anomalisi"
            />
            <MetricBar
                label="Yönlendirici Dil"
                value={breakdown.avgLoadedLanguage}
                icon={MessageSquareWarning}
                color={breakdown.avgLoadedLanguage < 0.3 ? '#10b981' : breakdown.avgLoadedLanguage < 0.6 ? '#f59e0b' : '#ef4444'}
                delay={300}
                description="Taraflı veya yüklü ifade kullanımı"
            />
            <MetricBar
                label="Sansasyonellik"
                value={breakdown.avgSensationalism}
                icon={Megaphone}
                color={breakdown.avgSensationalism < 0.3 ? '#10b981' : breakdown.avgSensationalism < 0.6 ? '#f59e0b' : '#ef4444'}
                delay={400}
                description="Abartılı veya sansasyonel içerik oranı"
            />
        </View>
    );
}
