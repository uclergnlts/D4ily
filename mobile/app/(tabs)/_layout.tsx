import { Tabs } from 'expo-router';
import React from 'react';
import { Search, LineChart, Newspaper, Scale, Map } from 'lucide-react-native';
import { useThemeStore } from '../../src/store/useThemeStore';
import { Platform } from 'react-native';

const TAB_HEIGHT = Platform.OS === 'ios' ? 90 : 75;
const TAB_PADDING_BOTTOM = Platform.OS === 'ios' ? 30 : 15;

const tabBarLabelStyle = {
  fontSize: 11,
  fontFamily: 'DMSans_700Bold',
  marginTop: 4,
} as const;

export default function TabLayout() {
  const activeScheme = useThemeStore(state => state.activeScheme);
  const isDark = activeScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
        tabBarActiveTintColor: '#0A66C2',
        tabBarInactiveTintColor: isDark ? '#A1A1AA' : '#71717A',
        tabBarStyle: {
          backgroundColor: isDark ? '#18181B' : '#FFFFFF',
          borderTopColor: isDark ? '#27272A' : '#F4F4F5',
          borderTopWidth: 1,
          height: TAB_HEIGHT,
          paddingTop: 12,
          paddingBottom: TAB_PADDING_BOTTOM,
          position: 'absolute',
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Özetler',
          tabBarIcon: ({ color, focused }) => <Newspaper size={focused ? 26 : 24} color={color} strokeWidth={focused ? 2.5 : 2} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Haberler',
          tabBarIcon: ({ color, focused }) => <Search size={focused ? 26 : 24} color={color} strokeWidth={focused ? 2.5 : 2} />,
        }}
      />
      <Tabs.Screen
        name="compare"
        options={{
          title: 'Karşılaştır',
          tabBarIcon: ({ color, focused }) => <Scale size={focused ? 26 : 24} color={color} strokeWidth={focused ? 2.5 : 2} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Harita',
          href: null,
          tabBarIcon: ({ color, focused }) => <Map size={focused ? 26 : 24} color={color} strokeWidth={focused ? 2.5 : 2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Analiz',
          tabBarIcon: ({ color, focused }) => <LineChart size={focused ? 26 : 24} color={color} strokeWidth={focused ? 2.5 : 2} />,
        }}
      />
    </Tabs>
  );
}
