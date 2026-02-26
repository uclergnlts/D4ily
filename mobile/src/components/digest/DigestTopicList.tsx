import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { feedService } from '../../api/services/feedService';
import { useAppStore } from '../../store/useAppStore';

interface Topic {
    title: string;
    description: string;
    articleId?: string;
    whyImportant?: string;
    uncertaintyLevel?: 'Kesin' | 'Muhtemel' | 'Gelisiyor';
    counterNarrative?: string;
    importanceScore?: number;
    importanceTier?: 'yuksek' | 'orta' | 'dusuk';
}

interface DigestTopicListProps {
    topics: Topic[];
    onTopicPress: (articleId: string) => void;
    className?: string;
}

function getImportanceMeta(tier?: Topic['importanceTier']) {
    if (tier === 'yuksek') {
        return {
            label: 'Yüksek önem',
            badgeClass: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50',
        };
    }

    if (tier === 'dusuk') {
        return {
            label: 'Nispeten düşük',
            badgeClass: 'bg-surface-light-subtle dark:bg-surface-dark-subtle text-zinc-600 dark:text-zinc-400 border border-border-light dark:border-border-dark',
        };
    }

    return {
        label: 'Orta önem',
        badgeClass: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50',
    };
}

export const DigestTopicList = React.memo(function DigestTopicList({ topics, onTopicPress, className }: DigestTopicListProps) {
    const queryClient = useQueryClient();
    const selectedCountry = useAppStore(s => s.selectedCountry);

    // Prefetch articles linked from topics — so they open instantly
    useEffect(() => {
        if (!topics) return;
        topics.forEach(topic => {
            if (topic.articleId) {
                queryClient.prefetchQuery({
                    queryKey: ['article', selectedCountry, topic.articleId],
                    queryFn: () => feedService.getArticle(selectedCountry, topic.articleId!),
                    staleTime: 1000 * 60 * 30,
                });
            }
        });
    }, [topics, selectedCountry]);

    if (!topics || topics.length === 0) return null;

    return (
        <View className={className}>
            <Text className="text-body-lg font-sans-black tracking-tight text-zinc-900 dark:text-white mb-5 px-5">
                Günün Başlıkları
            </Text>

            <View className="px-5 gap-4">
                {topics.map((topic, index) => {
                    const meta = getImportanceMeta(topic.importanceTier);

                    return (
                        <TouchableOpacity
                            key={index}
                            className="bg-surface-light-elevated dark:bg-surface-dark-elevated p-5 rounded-3xl border border-border-light dark:border-border-dark shadow-sm shadow-zinc-200/50 dark:shadow-none flex-row items-start mb-2 active:scale-[0.98] transition-transform"
                            disabled={!topic.articleId}
                            onPress={() => topic.articleId && onTopicPress(topic.articleId)}
                            activeOpacity={0.8}
                        >
                            <View className="w-10 h-10 bg-primary-50 dark:bg-primary-900/30 rounded-full items-center justify-center mr-4 mt-1 shrink-0">
                                <Text className="font-sans-black text-primary-700 dark:text-primary-300 text-body-lg">{index + 1}</Text>
                            </View>
                            <View className="flex-1">
                                <Text className="text-body-lg font-sans-bold text-zinc-900 dark:text-white mb-2 leading-[24px]">
                                    {topic.title}
                                </Text>
                                <Text className="text-body-sm font-sans text-zinc-600 dark:text-zinc-400 leading-[22px] mb-3" numberOfLines={3}>
                                    {topic.description}
                                </Text>

                                {topic.whyImportant ? (
                                    <View className="bg-surface-light-subtle dark:bg-surface-dark-subtle p-3 rounded-2xl mb-3">
                                        <Text className="text-body-xs font-sans-bold text-zinc-900 dark:text-zinc-200 mb-1">Neden önemi var?</Text>
                                        <Text className="text-body-xs font-sans text-zinc-600 dark:text-zinc-400 leading-[18px]" numberOfLines={3}>
                                            {topic.whyImportant}
                                        </Text>
                                    </View>
                                ) : null}

                                <View className="flex-row flex-wrap items-center gap-2 mt-2">
                                    <View className={`px-2.5 py-1 rounded-full ${meta.badgeClass}`}>
                                        <Text className="text-[11px] font-sans-bold">
                                            {meta.label}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {topic.articleId && (
                                <View className="ml-3 mt-2 w-8 h-8 rounded-full bg-surface-light-subtle dark:bg-surface-dark-subtle items-center justify-center">
                                    <ArrowRight size={16} color="#0A66C2" />
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
});

DigestTopicList.displayName = 'DigestTopicList';
