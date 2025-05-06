// app/services/api.ts - Versión corregida con diagnóstico
import { getUserId } from '../lib/authUtils';

const API_URL = "https://bhu8vgy7nht5.vercel.app/";
const DEBUG = true; // Cambiar a false en producción

export class ApiService {
  static async fetch(endpoint: string, options: RequestInit = {}) {
    try {
      const userId = await getUserId();
      
      if (DEBUG) {
        console.log(`[API] Llamando a ${endpoint}`, {
          userId: userId,
          método: options.method || 'GET',
          tieneBody: !!options.body
        });
      }
      
      const config: RequestInit = {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'User-ID': userId } : {}),
          ...options.headers,
        },
      };
      
      if (DEBUG) {
        console.log(`[API] Headers de la petición:`, config.headers);
      }

      const response = await fetch(`${API_URL}${endpoint}`, config);
      
      if (response.status === 401) {
        // Session expired or invalid
        throw new Error('Sesión expirada');
      }
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error in the request');
      }
      
      return response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Función de diagnóstico para identificar problemas
  static async diagnosticarProblemas() {
    console.log('============ DIAGNÓSTICO DE API ============');
    try {
      // 1. Verificar conexión básica
      console.log('Verificando conexión al servidor...');
      const conexion = await fetch(API_URL);
      console.log(`Conexión: ${conexion.status} ${conexion.statusText}`);
      
      // 2. Verificar datos de usuario
      console.log('Verificando ID de usuario...');
      const userId = await getUserId();
      console.log(`User ID: ${userId || 'No encontrado'}`);
      
      // 3. Probar endpoint público
      console.log('Probando endpoint público...');
      const respuestaPublica = await fetch(`${API_URL}/`);
      console.log(`Respuesta: ${respuestaPublica.status} ${respuestaPublica.statusText}`);
      
      // 4. Probar endpoint protegido con User-ID
      if (userId) {
        console.log('Probando endpoint protegido con User-ID...');
        const respuestaProtegida = await fetch(`${API_URL}/verify-token`, {
          headers: {
            'User-ID': userId
          }
        });
        console.log(`Respuesta: ${respuestaProtegida.status} ${respuestaProtegida.statusText}`);
      } else {
        console.log('No se puede probar endpoint protegido porque no hay User-ID');
      }
      
      console.log('============ FIN DIAGNÓSTICO ============');
    } catch (error) {
      console.error('Error durante el diagnóstico:', error);
    }
  }

  static async login(email: string, password: string) {
    const result = await this.fetch('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    // Si el login es exitoso, verificar que user y userID existan
    if (result.user) {
      // Asegurarse de que userID existe (algunas veces puede estar como _id)
      if (!result.user.userID && result.user._id) {
        console.log('Transformando _id a userID:', result.user._id);
        result.user.userID = result.user._id;
      }
    }
    
    return result;
  }

  static async googleLogin(googleData: {
    idToken: string;
    accessToken: string;
    email: string;
    name: string;
    googleId: string;
  }) {
    return this.fetch('/google-login', {
      method: 'POST',
      body: JSON.stringify(googleData),
    });
  }

  static async signup(userData: {
    name: string;
    email: string;
    password: string;
    language: string;
  }) {
    return this.fetch('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  static async getUsers() {
    return this.fetch('/users');
  }

  static async getArticles() {
    return this.fetch('/articles');
  }

  static async getHistory() {
    return this.fetch('/history');
  }

  static async addToWishlist(productID: string) {
    return this.fetch('/wishlist', {
      method: 'POST',
      body: JSON.stringify({ productID }),
    });
  }

  static async removeFromWishlist(wishlistItemId: string) {
    return this.fetch(`/wishlist/${wishlistItemId}`, {
      method: 'DELETE',
    });
  }

  static async getWishlist() {
    return this.fetch('/wishlist');
  }

  static async addProductNote(productID: string, note: string, rating?: number) {
    return this.fetch('/productnotes', {
      method: 'POST',
      body: JSON.stringify({ productID, note, rating }),
    });
  }

  static async getProductNotes() {
    return this.fetch('/productnotes');
  }

  static async getProfile() {
    return this.fetch('/profile');
  }

  static async changePassword(currentPassword: string, newPassword: string) {
    return this.fetch('/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  static async updateTrialPeriod(trialDays: number) {
    return this.fetch('/update-trial-period', {
      method: 'POST',
      body: JSON.stringify({ trialDays }),
    });
  }

  static async startTest(productID: string) {
    return this.fetch('/tests', {
      method: 'POST',
      body: JSON.stringify({ itemID: productID }),
    });
  }

  static async updateProductNote(noteId: string, note: string, rating?: number) {
    return this.fetch(`/productnotes/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify({ note, rating }),
    });
  }

  // Save product reaction
  static async saveProductReaction(productID: string, reaction: string) {
    return this.fetch('/product-reactions', {
      method: 'POST',
      body: JSON.stringify({ 
        productID, 
        reaction 
      }),
    });
  }

  // Get product reactions
  static async getProductReactions() {
    return this.fetch('/product-reactions');
  }

  // Delete product reaction
  static async deleteProductReaction(productID: string) {
    return this.fetch(`/product-reactions/${productID}`, {
      method: 'DELETE',
    });
  }

  // Save ingredient reaction
  static async saveIngredientReaction(ingredientName: string, reaction: string) {
    return this.fetch('/ingredient-reactions', {
      method: 'POST',
      body: JSON.stringify({ 
        ingredientName, 
        reaction 
      }),
    });
  }

  // Delete ingredient reaction
  static async deleteIngredientReaction(ingredientName: string) {
    return this.fetch(`/ingredient-reactions/${encodeURIComponent(ingredientName)}`, {
      method: 'DELETE',
    });
  }

  static async getTests() {
    return this.fetch('/tests');
  }

  static async completeTest(testId: string, result: 'Critic' | 'Sensitive' | 'Safe' | null) {
    return this.fetch(`/tests/${testId}`, {
      method: 'PUT',
      body: JSON.stringify({ result }),
    });
  }
}