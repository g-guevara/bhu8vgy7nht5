// app/index.tsx
import React, { useState, useEffect } from "react";
import { 
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  View
} from "react-native";
import LoginForm from "./screens/LoginForm";
import SignupForm from "./screens/SignupForm";
import { User } from "./components/Login/User";
import TabNavigator from "./navigation/TabNavigator";
import { styles } from "./styles/IndexStyles";
import { getToken, removeToken } from "./lib/authUtils";
import { ApiService } from "./services/api";

// URL de tu API (reemplazar con la URL de Vercel cuando esté desplegado)
const API_URL = "https://7ujm8uhb.vercel.app";

export default function Index() {
  const [isLogin, setIsLogin] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificar si hay una sesión activa al iniciar la app
  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const token = await getToken();
      if (token) {
        // Verificar si el token es válido
        const response = await ApiService.fetch('/verify-token');
        if (response.valid && response.user) {
          setUser({
            _id: response.user.userID,
            userID: response.user.userID,
            name: response.user.name,
            email: response.user.email,
            language: response.user.language || 'es',
            trialPeriodDays: response.user.trialPeriodDays || 5
          });
        } else {
          // Token inválido, limpiar
          await removeToken();
        }
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      await removeToken();
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await removeToken();
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Mostrar pantalla de carga mientras se verifica la autenticación
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#7d7d7d" />
        </View>
      </SafeAreaView>
    );
  }

  // Si el usuario está logueado, mostramos el tab navigator
  if (user) {
    return <TabNavigator user={user} onLogout={handleLogout} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {isLogin ? (
            <LoginForm 
              onLogin={setUser}
              onSwitchToSignup={() => setIsLogin(false)}
              apiUrl={API_URL}
            />
          ) : (
            <SignupForm 
              onSwitchToLogin={() => setIsLogin(true)}
              apiUrl={API_URL}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}