import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mic, ExternalLink, Headphones, Radio, PlayCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';

// Spotify Links
const FEATURED_PODCAST = {
    id: '1zytVKv9PQmGuKGhWLEzfU',
    title: 'Gündem Özel',
    host: 'Oksijen',
    url: 'https://open.spotify.com/show/1zytVKv9PQmGuKGhWLEzfU?si=MBqabxj9QreCHYYCTtdw9g',
    description: 'Türkiye ve dünya gündemine dair en çarpıcı analizler.',
    image: 'https://i.scdn.co/image/ab6765630000ba8a9b7e7e6e7e6e7e6e7e6e7e6e' // Placeholder or generic
};

const RECOMMENDED_PODCASTS = [
    {
        id: 'aposto630',
        title: 'Aposto 6:30',
        host: 'Aposto!',
        url: 'https://open.spotify.com/show/7dT1Dk4jQ9e9e9e9e9e9e9', // Generic link structure
        category: 'Günlük Bülten',
        color: '#f59e0b'
    },
    {
        id: 'fatihaltayli',
        title: 'Fatih Altaylı Yorumluyor',
        host: 'Fatih Altaylı',
        url: 'https://open.spotify.com/show/0zX1Dk4jQ9e9e9e9e9e9e9',
        category: 'Yorum',
        color: '#ef4444'
    },
    {
        id: 'medyascope',
        title: 'Medyascope Açık Oturum',
        host: 'Medyascope',
        url: 'https://open.spotify.com/show/2yZ1Dk4jQ9e9e9e9e9e9e9',
        category: 'Politika',
        color: '#3b82f6'
    },
    {
        id: 'nevsinmengu',
        title: 'Nevşin Mengü ile Bugün',
        host: 'Nevşin Mengü',
        url: 'https://open.spotify.com/show/4nB1Dk4jQ9e9e9e9e9e9e9',
        category: 'Gündem',
        color: '#8b5cf6'
    }
];

export default function PodcastScreen() {
    const router = useRouter();

    const openSpotify = async (url: string) => {
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                await Linking.openURL(url); // Fallback to browser
            }
        } catch (error) {
            console.error("Link açılamadı:", error);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-black" edges={['top']}>
            {/* Header */}
            <View className="px-6 py-4">
                <Text className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                    Podcastler
                </Text>
                <Text className="text-zinc-500 mt-1">Gündemi Spotify&apos;da dinle.</Text>
            </View>

            <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>

                {/* Featured Section */}
                <Text className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 ml-1">Editörün Seçimi</Text>
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => openSpotify(FEATURED_PODCAST.url)}
                    className="bg-green-600 rounded-3xl p-6 mb-8 shadow-lg shadow-green-900/20 overflow-hidden relative min-h-[220px] justify-between"
                >
                    {/* Background Pattern */}
                    <View className="absolute -right-10 -top-10 opacity-20 transform rotate-12">
                        <Radio size={180} color="white" />
                    </View>

                    <View>
                        <View className="bg-black/20 self-start px-3 py-1 rounded-full mb-4 backdrop-blur-md">
                            <Text className="text-white text-[10px] font-bold tracking-widest">ÖNE ÇIKAN</Text>
                        </View>
                        <Text className="text-white text-3xl font-black leading-8 mb-2 w-3/4">
                            {FEATURED_PODCAST.title}
                        </Text>
                        <Text className="text-green-100 font-medium text-lg">{FEATURED_PODCAST.host}</Text>
                    </View>

                    <View className="flex-row items-center bg-white/10 self-start px-4 py-2 rounded-full mt-4 backdrop-blur-sm">
                        <PlayCircle size={20} color="white" fill="white" className="mr-2" />
                        <Text className="text-white font-bold ml-1">Spotify&apos;da Dinle</Text>
                    </View>
                </TouchableOpacity>

                {/* List */}
                <Text className="text-lg font-bold text-zinc-900 dark:text-white mb-4 ml-1">Önerilen Yayınlar</Text>

                {RECOMMENDED_PODCASTS.map((podcast) => (
                    <TouchableOpacity
                        key={podcast.id}
                        className="flex-row items-center p-4 mb-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 active:bg-zinc-50 dark:active:bg-zinc-800/50"
                        onPress={() => openSpotify(podcast.url)}
                    >
                        <View
                            className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                            style={{ backgroundColor: `${podcast.color}20` }}
                        >
                            <Headphones size={24} color={podcast.color} />
                        </View>

                        <View className="flex-1">
                            <View className="flex-row items-center mb-1">
                                <View className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded mr-2">
                                    <Text className="text-[9px] font-bold text-zinc-500 uppercase">{podcast.category}</Text>
                                </View>
                            </View>
                            <Text className="font-bold text-zinc-900 dark:text-white text-base leading-5 mb-0.5">
                                {podcast.title}
                            </Text>
                            <Text className="text-xs text-zinc-500">{podcast.host}</Text>
                        </View>

                        <ExternalLink size={20} color="#d4d4d8" />
                    </TouchableOpacity>
                ))}

                {/* Info Text */}
                <Text className="text-center text-zinc-400 text-xs mt-6 px-10 leading-4">
                    Bu podcastler harici bağlantılardır ve Spotify uygulamasında açılır.
                </Text>

            </ScrollView>
        </SafeAreaView>
    );
}
