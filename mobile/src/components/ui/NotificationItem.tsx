import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Bell, Newspaper, MessageCircle, TrendingUp } from 'lucide-react-native';

interface NotificationItemProps {
    type: 'breaking' | 'comment' | 'reputation';
    title: string;
    message: string;
    time: string;
    isRead: boolean;
    onPress: () => void;
}

export const NotificationItem = React.memo(({ type, title, message, time, isRead, onPress }: NotificationItemProps) => {
    const getIcon = () => {
        switch (type) {
            case 'breaking': return <Newspaper size={20} color="#006FFF" />;
            case 'comment': return <MessageCircle size={20} color="#10b981" />;
            case 'reputation': return <TrendingUp size={20} color="#f59e0b" />;
            default: return <Bell size={20} color="#71717a" />;
        }
    };

    const getBgColor = () => {
        switch (type) {
            case 'breaking': return 'bg-blue-50 dark:bg-blue-900/20';
            case 'comment': return 'bg-green-50 dark:bg-green-900/20';
            case 'reputation': return 'bg-amber-50 dark:bg-amber-900/20';
            default: return 'bg-zinc-100 dark:bg-zinc-800';
        }
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            className={`flex-row p-4 border-b border-zinc-100 dark:border-zinc-800 ${isRead ? 'bg-white dark:bg-zinc-900' : 'bg-blue-50/30 dark:bg-blue-900/5'}`}
        >
            <View className={`w-10 h-10 rounded-full items-center justify-center mr-4 ${getBgColor()}`}>
                {getIcon()}
            </View>

            <View className="flex-1">
                <View className="flex-row justify-between mb-1">
                    <Text className={`text-sm font-bold ${isRead ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-900 dark:text-white'}`}>
                        {title}
                    </Text>
                    <Text className="text-xs text-zinc-400">{time}</Text>
                </View>
                <Text className="text-xs text-zinc-500 dark:text-zinc-400 leading-4" numberOfLines={2}>
                    {message}
                </Text>
            </View>

            {!isRead && (
                <View className="w-2 h-2 bg-primary rounded-full mt-2 ml-2" />
            )}
        </TouchableOpacity>
    );
});
