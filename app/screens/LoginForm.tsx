// app/screens/LoginForm.tsx - Updated with security features
import React, { useState, useEffect } from "react";
import { 
  Text, 
  View, 
  TextInput,
  TouchableOpacity, 
  ActivityIndicator,
  Platform,
  Image,
  Alert,
} from "react-native";
import { useToast } from '../utils/ToastContext';
import { User } from "../components/Login/User";
import { styles } from "../styles/LoginFormStyles";
import { ApiService } from "../services/api";
import { saveUser } from "../lib/authUtils";
import { SecurityUtils } from "../utils/securityUtils";
import { getUserFriendlyError } from "../utils/securityConfig";
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

interface LoginFormProps {
  onLogin: (user: User) => void;
  onSwitchToSignup: () => void;
  apiUrl: string;
}

export default function LoginForm({ onLogin, onSwitchToSignup, apiUrl }: LoginFormProps) {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Estados de seguridad
  const [isDeviceBlocked, setIsDeviceBlocked] = useState(false);
  const [loginBlockStatus, setLoginBlockStatus] = useState({
    isBlocked: false,
    minutesRemaining: 0,
    attemptsCount: 0
  });
  
  const { showToast } = useToast();

  // Configuración de Google OAuth
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: '421431845569-3gi5bflt29es9fo1ovrpc9tprmd6tj3s.apps.googleusercontent.com',
  });

  // Verificar estado de seguridad al montar el componente
  useEffect(() => {
    checkSecurityStatus();
  }, []);

  // Manejar respuesta de Google
  useEffect(() => {
    handleGoogleResponse();
  }, [response]);

  // Timer para actualizar el estado de bloqueo de login cada minuto
  useEffect(() => {
    if (loginBlockStatus.isBlocked && loginBlockStatus.minutesRemaining > 0) {
      const interval = setInterval(() => {
        checkLoginBlockStatus();
      }, 60000); // Cada minuto
      
      return () => clearInterval(interval);
    }
  }, [loginBlockStatus.isBlocked]);

  const checkSecurityStatus = async () => {
    try {
      // Verificar si el dispositivo está bloqueado
      const deviceBlocked = await SecurityUtils.isDeviceBlocked();
      setIsDeviceBlocked(deviceBlocked);
      
      // Verificar estado de intentos de login
      if (!deviceBlocked) {
        await checkLoginBlockStatus();
      }
    } catch (error) {
      console.error('Error checking security status:', error);
    }
  };

  const checkLoginBlockStatus = async () => {
    try {
      const blockStatus = await SecurityUtils.getLoginBlockStatus();
      setLoginBlockStatus(blockStatus);
    } catch (error) {
      console.error('Error checking login block status:', error);
    }
  };

  const handleGoogleResponse = async () => {
    if (response?.type === 'success') {
      // Verificar bloqueos antes de proceder
      if (isDeviceBlocked) {
        showToast('Device blocked for security reasons', 'error');
        return;
      }

      if (loginBlockStatus.isBlocked) {
        showToast(`Attempts exceeded. Wait ${loginBlockStatus.minutesRemaining} minutes`, 'error');
        return;
      }

      setGoogleLoading(true);
      let decodedToken: any = null; // Definir fuera del try para que esté disponible en catch
      
      try {
        const { params } = response;
        const { id_token } = params;
        
        // Decode the ID token to get user info
        decodedToken = JSON.parse(atob(id_token.split('.')[1]));
        
        // Send Google token to your backend
        const loginResponse = await ApiService.googleLogin({
          idToken: id_token,
          accessToken: '',
          email: decodedToken.email,
          name: decodedToken.name,
          googleId: decodedToken.sub
        });
        
        if (loginResponse.user) {
          // Limpiar intentos de login después del éxito
          await SecurityUtils.clearLoginAttempts();
          
          // Save user data in SecureStore
          await saveUser(loginResponse.user);
          onLogin(loginResponse.user);
          showToast('Successful Google access', 'success');
        }
      } catch (error: any) {
        console.error("Google login error: ", error);
        
        // Registrar intento fallido si es un error de credenciales
        if (decodedToken?.email) {
          await SecurityUtils.recordFailedLoginAttempt(decodedToken.email);
          await checkLoginBlockStatus();
        }
        
        const friendlyError = getUserFriendlyError(error);
        showToast(friendlyError, 'error');
      } finally {
        setGoogleLoading(false);
      }
    }
  };

  const handleLogin = async () => {
    // Validaciones básicas
    if (!loginEmail || !loginPassword) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    // Verificar si el dispositivo está bloqueado
    if (isDeviceBlocked) {
      showToast('Device blocked for security reasons', 'error');
      return;
    }

    // Verificar si los intentos de login están bloqueados
    if (loginBlockStatus.isBlocked) {
      const timeText = loginBlockStatus.minutesRemaining === 1 
        ? '1 minute' 
        : `${loginBlockStatus.minutesRemaining} minutes`;
      showToast(`Too many failed attempts. Try again in ${timeText}`, 'error');
      return;
    }

    setLoading(true);
    try {
      console.log('[Login] Attempting login with email:', loginEmail);
      
      const response = await ApiService.login(loginEmail, loginPassword);
      
      if (!response.user) {
        throw new Error('Invalid login response');
      }
      
      if (!response.user.userID && !response.user._id) {
        throw new Error('User does not have valid ID');
      }
      
      // Login exitoso - limpiar intentos fallidos
      await SecurityUtils.clearLoginAttempts();
      
      // Save user data in SecureStore
      await saveUser(response.user);
      onLogin(response.user);
      showToast('Welcome!', 'success');
      
    } catch (error: any) {
      console.error("[Login] Error:", error);
      
      // Registrar intento fallido
      await SecurityUtils.recordFailedLoginAttempt(loginEmail);
      
      // Actualizar estado de bloqueo
      await checkLoginBlockStatus();
      
      // Mostrar mensaje amigable
      const friendlyError = getUserFriendlyError(error);
      showToast(friendlyError, 'error');
      
    } finally {
      setLoading(false);
    }
  };

  const getRemainingAttemptsText = () => {
    if (!loginBlockStatus.isBlocked) {
      const remaining = 3 - loginBlockStatus.attemptsCount;
      if (loginBlockStatus.attemptsCount > 0 && remaining > 0) {
        return `${remaining} attempt${remaining !== 1 ? 's' : ''} remaining`;
      }
    }
    return null;
  };

  const getBlockedTimeText = () => {
    if (loginBlockStatus.isBlocked && loginBlockStatus.minutesRemaining > 0) {
      const minutes = loginBlockStatus.minutesRemaining;
      return `Try again in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    return null;
  };

  // Si el dispositivo está bloqueado, no mostrar el formulario
  if (isDeviceBlocked) {
    return null; // El componente padre debería manejar esto
  }

  return (
    <View style={styles.formContainer}>
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../assets/images/icon.png')}
          style={styles.logo}
        />
      </View>
      <Text style={styles.title}>Sign In</Text>
      
      {/* Mostrar advertencia de intentos restantes */}
      {getRemainingAttemptsText() && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            ⚠️ {getRemainingAttemptsText()}
          </Text>
        </View>
      )}
      
      {/* Mostrar tiempo de bloqueo */}
      {getBlockedTimeText() && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            🔒 {getBlockedTimeText()}
          </Text>
        </View>
      )}
      
      <TextInput
        style={[
          styles.input,
          loginBlockStatus.isBlocked && styles.inputDisabled
        ]}
        placeholder="Email"
        value={loginEmail}
        onChangeText={setLoginEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!loginBlockStatus.isBlocked}
      />
      
      {/* Container para contraseña con botón de mostrar/ocultar */}
      <View style={styles.passwordContainer}>
        <TextInput
          style={[
            styles.passwordInput,
            loginBlockStatus.isBlocked && styles.inputDisabled
          ]}
          placeholder="Password"
          value={loginPassword}
          onChangeText={setLoginPassword}
          secureTextEntry={!showPassword}
          editable={!loginBlockStatus.isBlocked}
        />
        <TouchableOpacity 
          style={styles.showPasswordButton}
          onPress={() => setShowPassword(!showPassword)}
          disabled={loginBlockStatus.isBlocked}
        >
          <Text style={[
            styles.showPasswordText,
            loginBlockStatus.isBlocked && styles.showPasswordTextDisabled
          ]}>
            {showPassword ? 'Hide' : 'Show'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity 
        style={[
          styles.button, 
          (loading || loginBlockStatus.isBlocked) && styles.buttonDisabled
        ]} 
        onPress={handleLogin}
        disabled={loading || loginBlockStatus.isBlocked}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign In</Text>
        )}
      </TouchableOpacity>

      {/* Google Sign-In Button */}


      <TouchableOpacity 
        style={styles.forgotPasswordButton} 
        onPress={() => {
          Alert.alert(
            'Recover Password',
            'Feature coming soon',
            [{ text: 'OK' }]
          );
        }}
        disabled={loginBlockStatus.isBlocked}
      >
        <Text style={[
          styles.forgotPasswordText,
          loginBlockStatus.isBlocked && styles.forgotPasswordTextDisabled
        ]}>
          Forgot your password?
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.switchButton} 
        onPress={onSwitchToSignup}
        disabled={loginBlockStatus.isBlocked}
      >
        <Text style={[
          styles.switchButtonText,
          loginBlockStatus.isBlocked && styles.switchButtonTextDisabled
        ]}>
          Don't have an account? Sign up
        </Text>
      </TouchableOpacity>
    </View>
  );
}