 
import { Tabs } from 'expo-router';
import React from 'react';
import { Search, LineChart, Newspaper, Scale } from 'lucide-react-native';
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
          borderTopColor: isDark ? '#27272a' : '#f4f4f5',
          height: 90, // Increased from 60
          paddingTop: 10,
          paddingBottom: 30, // Increased to lift up from bottom edge
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Özetler',
          tabBarIcon: ({ color }) => <Newspaper size={24} color={color} strokeWidth={2.5} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Ara',
          tabBarIcon: ({ color }) => <Search size={24} color={color} strokeWidth={2.5} />,
        }}
      />
      <Tabs.Screen
        name="compare"
        options={{
          title: 'Karşılaştır',
          tabBarIcon: ({ color }) => <Scale size={24} color={color} strokeWidth={2.5} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Analiz',
          tabBarIcon: ({ color }) => <LineChart size={24} color={color} strokeWidth={2.5} />,
        }}
      />
    </Tabs>
  );
}
