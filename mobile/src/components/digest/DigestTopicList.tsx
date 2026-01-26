import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowRight } from 'lucide-react-native';

interface Topic {
    title: string;
    description: string;
    articleId?: string;
}

interface DigestTopicListProps {
    topics: Topic[];
    onTopicPress: (articleId: string) => void;
    className?: string;
}

export const DigestTopicList = React.memo(({ topics, onTopicPress, className }: DigestTopicListProps) => {
    if (!topics || topics.length === 0) return null;

    return (
        <View className={className}>
            <Text className="text-lg font-bold text-zinc-900 dark:text-white mb-4 px-6">
                Günün Başlıkları
            </Text>

            <View className="px-4 gap-4">
                {topics.map((topic, index) => (
                    <TouchableOpacity
                        key={index}
                        className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex-row items-center active:opacity-60"
                        disabled={!topic.articleId}
                        onPress={() => topic.articleId && onTopicPress(topic.articleId)}
                    >
                        <View className="w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-full items-center justify-center mr-4">
                            <Text className="font-bold text-zinc-500">{index + 1}</Text>
                        </View>
                        <View className="flex-1">
                            <Text className="font-bold text-zinc-900 dark:text-white mb-1">
                                {topic.title}
                            </Text>
                            <Text className="text-sm text-zinc-500 leading-5" numberOfLines={2}>
                                {topic.description}
                            </Text>
                        </View>
                        {topic.articleId && (
                            <ArrowRight size={16} color="#006FFF" className="ml-2" />
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
});

DigestTopicList.displayName = 'DigestTopicList';
