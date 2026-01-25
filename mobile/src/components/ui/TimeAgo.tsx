import React from 'react';
import { Text } from 'react-native';

interface TimeAgoProps {
    date: string | Date;
    className?: string;
    style?: any;
}

export function TimeAgo({ date, className, style }: TimeAgoProps) {
    const getTimeAgo = (dateInput: string | Date) => {
        const now = new Date();
        const past = new Date(dateInput);
        const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Az önce';

        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes} dk önce`;

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours} sa önce`;

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays} gün önce`;

        // Fallback to full date
        return past.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    };

    return (
        <Text className={`text-xs text-zinc-400 ${className}`} style={style}>
            {getTimeAgo(date)}
        </Text>
    );
}
