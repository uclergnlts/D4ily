import React from 'react';
import { View, Text, TouchableOpacity, Dimensions, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';
import { X, User, Settings, HelpCircle, Mic, LogOut, ChevronRight, Scale, Bookmark, History, Crown } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';
import { useFeedStore } from '../../store/useFeedStore';
import { CountrySelector } from './CountrySelector';

const { width, height } = Dimensions.get('window');
const MENU_WIDTH = width * 0.75;

export const SideMenu = () => {
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const { isSideMenuOpen, toggleSideMenu } = useAppStore();
    const { isBalanced, toggleBalanced } = useFeedStore();

    // Derived state for animation visibility
    const translateX = useSharedValue(-MENU_WIDTH);
    const opacity = useSharedValue(0);

    // Watch for state changes
    React.useEffect(() => {
        if (isSideMenuOpen) {
            translateX.value = withTiming(0, { duration: 300 });
            opacity.value = withTiming(1, { duration: 300 });
        } else {
            translateX.value = withTiming(-MENU_WIDTH, { duration: 300 });
            opacity.value = withTiming(0, { duration: 300 });
        }
    }, [isSideMenuOpen, translateX, opacity]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    const handleNavigation = (path: string) => {
        toggleSideMenu();
        setTimeout(() => {
            if (path === 'logout') {
                // Logout logic usually handled separately
            } else {
                router.push(path as any);
            }
        }, 300);
    };

    const menuItems = [
        { icon: Crown, label: 'Premium\'a Yükselt', path: '/premium', color: '#eab308' }, // Gold color
        { icon: Bookmark, label: 'Kaydedilenler', path: '/saved' },
        { icon: History, label: 'Okuma Geçmişi', path: '/history' },
        { icon: Mic, label: 'Podcastler', path: '/podcast' },
        { icon: Settings, label: 'Ayarlar', path: '/settings' },
        { icon: HelpCircle, label: 'Yardım & Destek', path: '/help' },
    ];

    const containerPointerEvents = isSideMenuOpen ? 'box-none' : 'none';

    return (
        <View
            className="absolute top-0 left-0 bottom-0 w-full z-50 pointer-events-none"
            style={{ height: height + 100 }}
            pointerEvents={containerPointerEvents}
        >
            {/* Backdrop */}
            <Animated.View
                className="absolute inset-0 bg-black/60"
                style={backdropStyle}
                pointerEvents={isSideMenuOpen ? 'auto' : 'none'}
            >
                <TouchableOpacity className="flex-1" onPress={toggleSideMenu} activeOpacity={1} />
            </Animated.View>

            {/* Menu Panel */}
            <Animated.View
                className="absolute top-0 left-0 bottom-0 bg-white dark:bg-zinc-900 shadow-2xl z-50 h-full border-r border-zinc-100 dark:border-zinc-800"
                style={[{ width: MENU_WIDTH }, animatedStyle]}
                pointerEvents="auto"
            >
                <SafeAreaViewWrapper>
                    {/* Header */}
                    {/* User Profile Header */}
                    <View className="px-6 pt-2 pb-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900">
                        {user ? (
                            <View className="flex-row items-center gap-4">
                                <View className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900 justify-center items-center border-2 border-white dark:border-zinc-800 shadow-sm">
                                    <Text className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                        {user.name?.charAt(0) || 'U'}
                                    </Text>
                                </View>
                                <View className="flex-1">
                                    <Text className="text-lg font-bold text-zinc-900 dark:text-white leading-6">
                                        {user.name || 'Kullanıcı'}
                                    </Text>
                                    <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {user.email}
                                    </Text>
                                    <View className="mt-2 flex-row items-center">
                                        <View className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-md">
                                            <Text className="text-[10px] font-bold text-yellow-700 dark:text-yellow-500">
                                                PREMIUM
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        ) : (
                            <TouchableOpacity onPress={() => router.push('/auth')} className="flex-row items-center gap-4">
                                <View className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800 justify-center items-center">
                                    <User size={24} color="#a1a1aa" />
                                </View>
                                <View>
                                    <Text className="text-lg font-bold text-zinc-900 dark:text-white">
                                        Giriş Yap
                                    </Text>
                                    <Text className="text-xs text-zinc-500">
                                        Özelleştirilmiş deneyim için
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            onPress={toggleSideMenu}
                            className="absolute top-0 right-4 p-2"
                        >
                            <X size={20} color="#a1a1aa" />
                        </TouchableOpacity>
                    </View>



                    {/* Country Selector in Menu */}
                    <View className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                        <Text className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Ülke / Bölge</Text>
                        <CountrySelector />
                    </View>

                    {/* Mode Switcher in Menu */}
                    <View className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                        <Text className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Akış Modu</Text>
                        <View className="flex-row items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                            <View className="flex-row items-center gap-3">
                                <View className={`w-8 h-8 rounded-full items-center justify-center ${isBalanced ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
                                    <Scale size={16} color={isBalanced ? '#6366f1' : '#71717a'} />
                                </View>
                                <View>
                                    <Text className="font-bold text-zinc-900 dark:text-white">
                                        {isBalanced ? 'Dengeli Mod' : 'Normal Mod'}
                                    </Text>
                                    <Text className="text-[11px] text-zinc-500">
                                        {isBalanced ? 'Tüm perspektifler' : 'Standart akış'}
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={isBalanced}
                                onValueChange={toggleBalanced}
                                trackColor={{ false: '#e4e4e7', true: '#6366f1' }}
                                thumbColor={'#ffffff'}
                            />
                        </View>
                    </View>

                    {/* Navigation Items */}
                    {/* Content Scroll */}
                    <View className="flex-1">
                        {/* Navigation Items */}
                        <View className="p-4">
                            <Text className="px-4 mb-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">Menü</Text>
                            {menuItems.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => handleNavigation(item.path)}
                                    className={`flex-row items-center p-4 mb-1 rounded-2xl active:bg-zinc-50 dark:active:bg-zinc-800 ${item.label.includes('Premium') ? 'bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30' : ''}`}
                                >
                                    <View className={`w-9 h-9 rounded-full items-center justify-center mr-4 ${item.label.includes('Premium') ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-zinc-50 dark:bg-zinc-800/50'}`}>
                                        <item.icon size={20} color={item.color || "#52525b"} />
                                    </View>
                                    <Text className={`flex-1 text-[15px] font-semibold ${item.label.includes('Premium') ? 'text-yellow-700 dark:text-yellow-500' : 'text-zinc-700 dark:text-zinc-200'}`}>
                                        {item.label}
                                    </Text>
                                    <ChevronRight size={16} color={item.label.includes('Premium') ? '#eab308' : '#e4e4e7'} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Footer remains same, just ensuring correct close for View */}
                    {user && (
                        <View className="p-6 border-t border-zinc-100 dark:border-zinc-800">
                            <TouchableOpacity
                                onPress={() => {
                                    toggleSideMenu();
                                    logout();
                                }}
                                className="flex-row items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl"
                            >
                                <LogOut size={20} color="#ef4444" className="mr-3" />
                                <Text className="text-red-500 font-bold">Çıkış Yap</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </SafeAreaViewWrapper>
            </Animated.View>
        </View>
    );
};

// Helper to handle safe area inside absolute view
const SafeAreaViewWrapper = ({ children }: { children: React.ReactNode }) => {
    return <View className="flex-1 pt-12">{children}</View>
}
