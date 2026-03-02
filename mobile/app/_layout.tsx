import React, { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_900Black,
} from '@expo-google-fonts/dm-sans';
import {
  Syne_700Bold,
  Syne_800ExtraBold,
} from '@expo-google-fonts/syne';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/api/queryClient';
import { useAuthStore } from '../src/store/useAuthStore';
import { useThemeStore } from '../src/store/useThemeStore';
import { SideMenu } from '../src/components/navigation/SideMenu';
import { initNotifications, registerPushToken, setupNotificationListeners } from '../src/config/notifications';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const activeScheme = useThemeStore(state => state.activeScheme);
  const checkAuth = useAuthStore(state => state.checkAuth);
  const user = useAuthStore(state => state.user);
  const token = useAuthStore(state => state.token);
  const router = useRouter();
  const segments = useSegments();

  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_900Black,
    Syne_700Bold,
    Syne_800ExtraBold,
  });

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Check if user has seen onboarding — re-read when navigating away from onboarding
  useEffect(() => {
    AsyncStorage.getItem('hasSeenOnboarding').then((value) => {
      setHasSeenOnboarding(value === 'true');
    });
  }, [segments]);

  // Redirect to onboarding on first launch
  useEffect(() => {
    if (hasSeenOnboarding === null) return; // still loading
    if (!fontsLoaded && !fontError) return; // fonts not ready

    if (!hasSeenOnboarding && segments[0] !== 'onboarding') {
      router.replace('/onboarding');
    }
  }, [hasSeenOnboarding, fontsLoaded, fontError]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Initialize push notifications when user is authenticated
  useEffect(() => {
    if (!user || !token) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      const pushToken = await initNotifications();
      if (pushToken) {
        await registerPushToken(pushToken, user.id, token);
      }
      cleanup = setupNotificationListeners();
    })();

    return () => cleanup?.();
  }, [user, token]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={activeScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: activeScheme === 'dark' ? '#000' : '#fff' }
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none' }} />
            <Stack.Screen name="auth" options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }} />
            <Stack.Screen name="vote-source" options={{ presentation: 'modal', headerTitle: 'Duruş Oyla', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="user-profile" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <Stack.Screen name="podcast" options={{ headerShown: false }} />
            <Stack.Screen name="help" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
          </Stack>
          <SideMenu />
          <StatusBar style="auto" />
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
