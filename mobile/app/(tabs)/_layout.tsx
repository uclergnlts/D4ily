/* eslint-disable react/display-name */
import { Tabs } from 'expo-router';
import React from 'react';
import { Home, Search, BookOpen, User, Scale } from 'lucide-react-native';
import { useColorScheme } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#006FFF',
        tabBarInactiveTintColor: isDark ? '#71717a' : '#a1a1aa',
        tabBarStyle: {
          backgroundColor: isDark ? '#000000' : '#ffffff',
          borderTopColor: isDark ? '#27272a' : '#e4e4e7',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Akış',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Keşfet',
          tabBarIcon: ({ color }) => <Search size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="digest"
        options={{
          title: 'Bülten',
          tabBarIcon: ({ color }) => <BookOpen size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Kıyasla',
          tabBarIcon: ({ color }) => <Scale size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
