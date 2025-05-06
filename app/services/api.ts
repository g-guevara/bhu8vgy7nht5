// app/services/api.ts - Complete fix removing all getToken references
import { getUserId } from '../lib/authUtils';

const API_URL = "https://bhu8vgy7nht5.vercel.app/";

export class ApiService {
  static async fetch(endpoint: string, options: RequestInit = {}) {
    try {
      const userId = await getUserId();
      
      const config: RequestInit = {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'User-ID': userId } : {}),
          ...options.headers,
        },
      };

      const response = await fetch(`${API_URL}${endpoint}`, config);
      
      if (response.status === 401) {
        // Session expired or invalid
        throw new Error('Session expired');
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

  static async login(email: string, password: string) {
    return this.fetch('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
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



// Add these methods to app/services/api.ts

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