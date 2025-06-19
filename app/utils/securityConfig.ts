// app/utils/securityConfig.ts
export const SECURITY_CONFIG = {
  // 🎛️ FEATURE FLAGS - Cambiar estos valores para activar/desactivar funcionalidades
  ENABLE_ACCOUNT_LIMIT: 1,        // 1 = ACTIVADO | 0 = DESACTIVADO - Límite de 10 cuentas por dispositivo
  ENABLE_LOGIN_ATTEMPTS_LIMIT: 0, // 1 = ACTIVADO | 0 = DESACTIVADO - Límite de 3 intentos de login
  
  // ⚙️ CONFIGURACIÓN DE LÍMITES (solo aplican si están activados arriba)
  MAX_ACCOUNTS_PER_DEVICE: 5,          // Máximo número de cuentas por dispositivo
  MAX_LOGIN_ATTEMPTS: 5,                // Máximo número de intentos fallidos
  LOGIN_BLOCK_DURATION_MINUTES: 45,     // Minutos de bloqueo después de exceder intentos
  
  // 🔑 CLAVES DE ALMACENAMIENTO (no cambiar)
  STORAGE_KEYS: {
    ACCOUNTS_CREATED: 'device_accounts_created',
    LOGIN_ATTEMPTS: 'login_attempts_data',
    IS_DEVICE_BLOCKED: 'device_blocked'
  }
};

// 🔄 HELPER FUNCTIONS para convertir 1/0 a boolean
const isFeatureEnabled = (flag: number): boolean => flag === 1;

// 📤 EXPORTS con conversión automática
export const FEATURES = {
  ACCOUNT_LIMIT_ENABLED: isFeatureEnabled(SECURITY_CONFIG.ENABLE_ACCOUNT_LIMIT),
  LOGIN_ATTEMPTS_ENABLED: isFeatureEnabled(SECURITY_CONFIG.ENABLE_LOGIN_ATTEMPTS_LIMIT)
};

// Función para mapear errores técnicos a mensajes amigables
export const getUserFriendlyError = (error: any): string => {
  const errorMessage = error?.message || error || '';
  const errorCode = error?.status || error?.code;

  console.log('[DEBUG] getUserFriendlyError - Error completo:', error);
  console.log('[DEBUG] getUserFriendlyError - errorMessage:', errorMessage);
  console.log('[DEBUG] getUserFriendlyError - errorCode:', errorCode);

  // Manejo especial para nuestra clase APIError personalizada
  if (error?.name === 'APIError') {
    console.log('[DEBUG] APIError detected with status:', error.status);
    
    switch (error.status) {
      case 0:
        return 'Connection problem. Check your internet and try again.';
      case 400:
        return 'There seems to be a problem with the information sent. Please check the data and try again.';
      case 401:
        return 'The credentials are not correct. Check your email and password.';
      case 403:
        return 'You don\'t have permission to perform this action.';
      case 404:
        return 'We couldn\'t find what you\'re looking for. The service might be temporarily unavailable.';
      case 409:
        console.log('[DEBUG] Email duplicate error (409) detected');
        return 'This email is already registered. Do you already have an account?';
      case 429:
        return 'You have made too many requests. Please wait a few minutes before trying again.';
      case 500:
      case 502:
      case 503:
        return 'We have temporary technical problems. Please try again in a few minutes.';
      default:
        // Si es un APIError pero no reconocemos el código, usar el mensaje del servidor
        if (error.response?.message) {
          return error.response.message;
        }
        return 'Something went wrong. Please try again in a few moments.';
    }
  }

  // Errores específicos por código (para compatibilidad con errores antiguos)
  if (errorCode) {
    switch (errorCode) {
      case 400:
        return 'There seems to be a problem with the information sent. Please check the data and try again.';
      case 401:
        return 'The credentials are not correct. Check your email and password.';
      case 403:
        return 'You don\'t have permission to perform this action.';
      case 404:
        return 'We couldn\'t find what you\'re looking for. The service might be temporarily unavailable.';
      case 409:
        return 'This email is already registered. Do you already have an account?';
      case 429:
        return 'You have made too many requests. Please wait a few minutes before trying again.';
      case 500:
      case 502:
      case 503:
        return 'We have temporary technical problems. Please try again in a few minutes.';
      case 'NETWORK_ERROR':
      case 'NetworkError':
        return 'There seems to be a connection problem. Check your internet and try again.';
    }
  }

  // Detectar 409 en el mensaje si no viene en el código
  if (typeof errorMessage === 'string') {
    const message = errorMessage.toLowerCase();
    
    // Buscar específicamente el status 409 en el mensaje
    if (message.includes('409') || message.includes('failed with status 409')) {
      console.log('[DEBUG] 409 detected in message');
      return 'This email is already registered. Do you already have an account?';
    }
    
    // Otros patrones de detección
    if (message.includes('network') || message.includes('connection') || message.includes('internet')) {
      return 'Connection problem. Check your internet and try again.';
    }
    
    if (message.includes('timeout')) {
      return 'The connection is taking too long. Please try again.';
    }
    
    if (message.includes('email') && (message.includes('exist') || message.includes('already') || message.includes('registrado'))) {
      return 'This email is already registered. Do you already have an account?';
    }
    
    if (message.includes('credencial') || message.includes('password') || message.includes('incorrect')) {
      return 'Incorrect email or password. Check your data and try again.';
    }
    
    if (message.includes('required') || message.includes('missing')) {
      return 'Please fill in all required fields.';
    }
    
    if (message.includes('invalid') && message.includes('email')) {
      return 'The email format is not valid. Please check and try again.';
    }

    // Detectar otros códigos de estado en el mensaje
    if (message.includes('400') || message.includes('failed with status 400')) {
      return 'There seems to be a problem with the information sent. Please check the data and try again.';
    }
    
    if (message.includes('401') || message.includes('failed with status 401')) {
      return 'The credentials are not correct. Check your email and password.';
    }
    
    if (message.includes('500') || message.includes('failed with status 500')) {
      return 'We have temporary technical problems. Please try again in a few minutes.';
    }
  }

  // Error genérico amigable
  return 'Something went wrong. Please try again in a few moments.';
};