// app/services/api.ts - Actualizado con endpoints de productos MongoDB
import { getUserId } from '../lib/authUtils';
import { getUserFriendlyError } from '../utils/securityConfig';

const API_URL = "https://bhu8vgy7nht5.vercel.app/";
const DEBUG = true;

// Interfaces para productos
export interface Product {
  code: string;
  product_name: string;
  brands: string;
  ingredients_text: string;
}

export interface ProductSearchResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ProductStats {
  total: number;
  organic: number;
  withIngredients: number;
  regular: number;
}

// Clase de error personalizada
class APIError extends Error {
  public status: number;
  public statusText: string;
  public response: any;

  constructor(message: string, status: number, statusText: string, response?: any) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.statusText = statusText;
    this.response = response;
  }
}

export class ApiService {
  static async fetch(endpoint: string, options: RequestInit = {}) {
    try {
      const userId = await getUserId();
      
      if (DEBUG) {
        console.log(`[API] Calling ${endpoint}`, {
          userId: userId,
          method: options.method || 'GET',
          hasBody: !!options.body
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
        console.log(`[API] Request headers:`, config.headers);
      }

      const response = await fetch(`${API_URL}${endpoint}`, config);
      
      if (DEBUG) {
        console.log(`[API] Response status: ${response.status} ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('application/json')) {
        console.error(`[API] Server returned non-JSON content type: ${contentType}`);
        const text = await response.text();
        console.error(`[API] Response starts with: ${text.substring(0, 100)}`);
        throw new APIError(
          'Server returned unexpected response format',
          response.status,
          response.statusText,
          { contentType, preview: text.substring(0, 100) }
        );
      }
      
      let responseData;
      try {
        responseData = await response.json();
      } catch (jsonError: unknown) {
        console.error('[API] JSON parse error:', jsonError);
        const errorMessage = jsonError instanceof Error ? jsonError.message : 'JSON parse failed';
        throw new APIError(
          'Invalid response format from server',
          response.status,
          response.statusText,
          { jsonError: errorMessage }
        );
      }
      
      if (!response.ok) {
        const errorMessage = responseData?.message || responseData?.error || response.statusText || 'Request failed';
        
        if (DEBUG) {
          console.log(`[API] Error response data:`, responseData);
        }
        
        throw new APIError(
          errorMessage,
          response.status,
          response.statusText,
          responseData
        );
      }
      
      return responseData;
    } catch (error: unknown) {
      if (error instanceof APIError) {
        if (DEBUG) {
          console.log('[API] APIError thrown:', {
            message: error.message,
            status: error.status,
            statusText: error.statusText
          });
        }
        throw error;
      }
      
      console.error('API Network Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Network request failed';
      
      throw new APIError(
        errorMessage,
        0,
        'Network Error',
        { originalError: errorMessage }
      );
    }
  }

  // =================== MÉTODOS DE PRODUCTOS (NUEVOS) ===================

  /**
   * Buscar productos por término de búsqueda
   */
  static async searchProducts(query: string, page: number = 1, limit: number = 15): Promise<ProductSearchResponse> {
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      limit: limit.toString()
    });
    
    return this.fetch(`products/search?${params}`);
  }

  /**
   * Obtener producto por código
   */
  static async getProductByCode(code: string): Promise<Product> {
    return this.fetch(`products/${encodeURIComponent(code)}`);
  }

  /**
   * Obtener productos por categoría/marca
   */
  static async getProductsByCategory(brand: string, organic: boolean = false): Promise<Product[]> {
    const params = new URLSearchParams();
    if (organic) {
      params.append('organic', 'true');
    }
    
    const queryString = params.toString();
    const endpoint = `products/category/${encodeURIComponent(brand)}${queryString ? `?${queryString}` : ''}`;
    
    return this.fetch(endpoint);
  }

  /**
   * Obtener estadísticas de productos
   */
  static async getProductStats(): Promise<ProductStats> {
    return this.fetch('products/stats');
  }

  /**
   * Obtener productos sin término de búsqueda (para mostrar todos)
   */
  static async getAllProducts(page: number = 1, limit: number = 15): Promise<ProductSearchResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    return this.fetch(`products/search?${params}`);
  }

  // =================== MÉTODOS EXISTENTES ===================

  static async diagnosticarProblemas() {
    console.log('============ DIAGNÓSTICO DE API ============');
    try {
      console.log('Verificando conexión al servidor...');
      const conexion = await fetch(API_URL);
      console.log(`Conexión: ${conexion.status} ${conexion.statusText}`);
      
      console.log('Verificando ID de usuario...');
      const userId = await getUserId();
      console.log(`User ID: ${userId || 'No encontrado'}`);
      
      console.log('Probando endpoint público...');
      const respuestaPublica = await fetch(`${API_URL}/`);
      console.log(`Respuesta: ${respuestaPublica.status} ${respuestaPublica.statusText}`);
      
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
      
      // Probar endpoint de productos
      console.log('Probando endpoint de productos...');
      const respuestaProductos = await fetch(`${API_URL}products/stats`);
      console.log(`Productos: ${respuestaProductos.status} ${respuestaProductos.statusText}`);
      
      console.log('============ FIN DIAGNÓSTICO ============');
    } catch (error: unknown) {
      console.error('Error durante el diagnóstico:', error);
    }
  }

  static async login(email: string, password: string) {
    const result = await this.fetch('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (result.user) {
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

  static async saveProductReaction(productID: string, reaction: string) {
    return this.fetch('/product-reactions', {
      method: 'POST',
      body: JSON.stringify({ 
        productID, 
        reaction 
      }),
    });
  }

  static async getProductReactions() {
    return this.fetch('/product-reactions');
  }

  static async deleteProductReaction(productID: string) {
    return this.fetch(`/product-reactions/${productID}`, {
      method: 'DELETE',
    });
  }

  static async saveIngredientReaction(ingredientName: string, reaction: string) {
    return this.fetch('/ingredient-reactions', {
      method: 'POST',
      body: JSON.stringify({ 
        ingredientName, 
        reaction 
      }),
    });
  }

  static async deleteIngredientReaction(ingredientName: string) {
    return this.fetch(`/ingredient-reactions/${encodeURIComponent(ingredientName)}`, {
      method: 'DELETE',
    });
  }

  static async getIngredientReactions() {
    console.log('[API] Fetching ingredient reactions...');
    
    try {
      const timestamp = new Date().getTime();
      const endpoint = `/ingredient-reactions?t=${timestamp}`;
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'User-ID': await getUserId() || '',
          'Accept': 'application/json'
        }
      });
      
      console.log(`[API] Response status: ${response.status}`);
      console.log(`[API] Response content-type: ${response.headers.get('content-type')}`);
      
      if (!response.ok) {
        throw new APIError(
          `Request failed with status ${response.status}`,
          response.status,
          response.statusText
        );
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error(`[API] Non-JSON response, content-type: ${contentType}`);
        const text = await response.text();
        console.error(`[API] Response preview: ${text.substring(0, 100)}`);
        throw new APIError(
          'Server returned non-JSON response',
          response.status,
          response.statusText,
          { contentType, preview: text.substring(0, 100) }
        );
      }
      
      const data = await response.json();
      console.log(`[API] Successfully fetched ${data.length} ingredient reactions`);
      return data;
    } catch (error: unknown) {
      console.error('[API] Error fetching ingredient reactions:', error);
      throw error;
    }
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