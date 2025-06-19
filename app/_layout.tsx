// app/_layout.tsx
import { Stack } from "expo-router";
import { ToastProvider } from './utils/ToastContext';
import { AuthProvider } from './utils/authContext';
import { OnboardingProvider } from './utils/OnboardingContext';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';

export default function RootLayout() {
  useEffect(() => {
    // Configurar la barra de navegación de Android
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync('#f8f8f8');
      NavigationBar.setButtonStyleAsync('dark'); // Botones oscuros para fondo claro
    }
  }, []);

  return (
    <OnboardingProvider>
      <AuthProvider>
        <ToastProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              // Para expo-router también puedes usar esto:
              navigationBarColor: '#fefeff', // Esto funciona en algunos casos
            }}
          />
        </ToastProvider>
      </AuthProvider>
    </OnboardingProvider>
  );
}