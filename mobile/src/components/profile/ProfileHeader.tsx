import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { LogOut, Settings } from 'lucide-react-native';

interface ProfileHeaderProps {
    user: {
        email: string;
        name?: string;
        avatarUrl?: string;
    };
    level: string;
    onLogout: () => void;
    onSettingsPress?: () => void;
    className?: string;
}

export const ProfileHeader = React.memo(function ProfileHeader({ user, level, onLogout, onSettingsPress, className }: ProfileHeaderProps) {
    return (
        <View className={`flex-row items-start justify-between ${className}`}>
            <View className="flex-row items-center flex-1">
                {/* Avatar */}
                <View className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full items-center justify-center border-4 border-white dark:border-zinc-900 shadow-sm relative">
                    {user.avatarUrl ? (
                        <Image
                            source={{ uri: user.avatarUrl }}
                            style={{ width: '100%', height: '100%', borderRadius: 9999 }}
                            contentFit="cover"
                        />
                    ) : (
                        <Text className="text-3xl font-black text-primary">
                            {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                        </Text>
                    )}

                    {/* Level Badge Overlay */}
                    <View className="absolute -bottom-2 bg-amber-500 px-2 py-0.5 rounded-full border-2 border-white dark:border-black">
                        <Text className="text-[10px] font-bold text-white uppercase tracking-wider">
                            {level}
                        </Text>
                    </View>
                </View>

                {/* User Info */}
                <View className="ml-5 flex-1 justify-center">
                    <Text className="text-2xl font-black text-zinc-900 dark:text-white leading-tight mb-1">
                        {user.name || 'Kullanıcı'}
                    </Text>
                    <Text className="text-sm text-zinc-500 font-medium">{user.email}</Text>
                </View>
            </View>

            {/* Actions */}
            <View className="flex-row gap-2">
                {onSettingsPress && (
                    <TouchableOpacity
                        onPress={onSettingsPress}
                        className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full items-center justify-center active:bg-zinc-200 dark:active:bg-zinc-700"
                    >
                        <Settings size={20} color="#71717a" />
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    onPress={onLogout}
                    className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-full items-center justify-center active:bg-red-100 dark:active:bg-red-900/40"
                >
                    <LogOut size={20} color="#ef4444" />
                </TouchableOpacity>
            </View>
        </View>
    );
});

ProfileHeader.displayName = 'ProfileHeader';
