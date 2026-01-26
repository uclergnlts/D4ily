import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

export default function HistoryScreen() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-zinc-50 dark:bg-black">
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView className="flex-1">
                <View className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()} className="mr-4">
                        <ChevronLeft size={24} color="#006FFF" />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-zinc-900 dark:text-white">Reading History</Text>
                </View>
                <View className="flex-1 items-center justify-center p-4">
                    <Text className="text-lg text-zinc-900 dark:text-white mb-2">Your History</Text>
                    <Text className="text-sm text-zinc-500 text-center">Articles you&apos;ve read will appear here.</Text>
                </View>
            </SafeAreaView>
        </View>
    );
}
