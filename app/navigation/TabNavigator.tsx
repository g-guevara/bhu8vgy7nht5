// app/navigation/TabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, Platform } from 'react-native';
import { User } from '../components/Login/User';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import TestScreen from '../screens/TestScreen';
import ReactionsScreen from '../screens/ReactionsScreen';
import WishlistScreen from '../screens/WishlistScreen';

// Define types
type TabParamList = {
  Home: undefined;
  Test: undefined;
  Reactions: undefined;
  Wishlist: undefined;
};

type TabBarIconProps = {
  focused: boolean;
  color: string;
  size: number;
};

interface TabNavigatorProps {
  user: User;
  onLogout: () => void;
}

const Tab = createBottomTabNavigator<TabParamList>();

// Custom Tab Label Component
const TabLabel = ({ label, focused }: { label: string; focused: boolean }) => (
  <Text style={{
    fontSize: 12,
    color: focused ? '#000' : '#888', // Cambiado de '#4285F4' a '#000'
    marginTop: -5,
  }}>
    {label}
  </Text>
);

export default function TabNavigator({ user, onLogout }: TabNavigatorProps) {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 90 : 60,
          paddingBottom: Platform.OS === 'ios' ? 30 : 5,
          paddingTop: Platform.OS === 'ios' ? 5 : 5,
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
        },
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#888',
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Home"
        options={{
          tabBarIcon: ({ focused, color, size }: TabBarIconProps) => (
            <MaterialCommunityIcons
              name="home-variant"
              size={size}
              color={focused ? '#000' : '#888'}
            />
          ),
          tabBarLabel: ({ focused }: { focused: boolean }) => (
            <TabLabel label="Home" focused={focused} />
          ),
        }}
      >
        {() => <HomeScreen user={user} onLogout={onLogout} />}
      </Tab.Screen>


      <Tab.Screen
        name="Wishlist"
        component={WishlistScreen}
        options={{
          tabBarIcon: ({ focused, color, size }: TabBarIconProps) => (
            <MaterialCommunityIcons
              name="bookmark"
              size={size}
              color={focused ? '#000' : '#888'}
            />
          ),
          tabBarLabel: ({ focused }: { focused: boolean }) => (
            <TabLabel label="Wishlist" focused={focused} />
          ),
        }}
      />


      <Tab.Screen
        name="Test"
        component={TestScreen}
        options={{
          tabBarIcon: ({ focused, color, size }: TabBarIconProps) => (
            <MaterialIcons
              name="assignment"
              size={size}
              color={focused ? '#000' : '#888'}
            />
          ),
          tabBarLabel: ({ focused }: { focused: boolean }) => (
            <TabLabel label="Test" focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name="Reactions"
        component={ReactionsScreen}
        options={{
          tabBarIcon: ({ focused, color, size }: TabBarIconProps) => (
            <MaterialCommunityIcons
              name="folder"
              size={size}
              color={focused ? '#000' : '#888'}
            />
          ),
          tabBarLabel: ({ focused }: { focused: boolean }) => (
            <TabLabel label="Reactions" focused={focused} />
          ),
        }}
      />


    </Tab.Navigator>
  );
}