// app/utils/productCacheUtils.ts - Sistema de cache inteligente para información de productos

import AsyncStorage from '@react-native-async-storage/async-storage';

const PRODUCT_CACHE_KEY = 'products_info_cache';
const CACHE_METADATA_KEY = 'products_cache_metadata';

// Interfaces
export interface CachedProduct {
  code: string;
  product_name: string;
  brands: string;
  ingredients_text: string;
  image_url?: string;
  // Metadata del cache
  cachedAt: number; // timestamp
  lastAccessed: number; // timestamp
  accessCount: number; // cuántas veces se ha accedido
}

export interface ProductCacheMetadata {
  totalProducts: number;
  totalSizeBytes: number;
  oldestProduct: number; // timestamp
  newestProduct: number; // timestamp
  lastCleanup: number; // timestamp
}

export interface ProductCacheStats {
  totalProducts: number;
  totalSizeKB: number;
  totalSizeMB: number;
  oldestProductAge: string; // ej: "2 days ago"
  mostAccessedProduct: CachedProduct | null;
  cacheHitRate: number; // porcentaje de productos encontrados en cache
}

class ProductCacheManager {
  private static instance: ProductCacheManager;
  private cache: Record<string, CachedProduct> = {};
  private isInitialized = false;
  private cacheRequests = 0; // total de solicitudes
  private cacheHits = 0; // solicitudes encontradas en cache

  // Configuración
  private readonly MAX_CACHE_SIZE = 1000; // máximo 1000 productos
  private readonly MAX_AGE_DAYS = 30; // limpiar productos más antiguos a 30 días
  private readonly CLEANUP_INTERVAL = 7 * 24 * 60 * 60 * 1000; // limpiar cada 7 días

  static getInstance(): ProductCacheManager {
    if (!ProductCacheManager.instance) {
      ProductCacheManager.instance = new ProductCacheManager();
    }
    return ProductCacheManager.instance;
  }

  private async initializeCache(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      console.log('📦 Initializing product cache...');
      
      const cacheJson = await AsyncStorage.getItem(PRODUCT_CACHE_KEY);
      if (cacheJson) {
        this.cache = JSON.parse(cacheJson);
        console.log(`📦 Loaded ${Object.keys(this.cache).length} products from cache`);
      }
      
      // Verificar si necesita limpieza automática
      await this.checkAndPerformCleanup();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Error initializing product cache:', error);
      this.cache = {};
      this.isInitialized = true;
    }
  }

  private async saveCache(): Promise<void> {
    try {
      await AsyncStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify(this.cache));
      await this.updateMetadata();
    } catch (error) {
      console.error('❌ Error saving product cache:', error);
    }
  }

  private async updateMetadata(): Promise<void> {
    try {
      const products = Object.values(this.cache);
      const now = Date.now();
      
      if (products.length === 0) {
        await AsyncStorage.removeItem(CACHE_METADATA_KEY);
        return;
      }

      const metadata: ProductCacheMetadata = {
        totalProducts: products.length,
        totalSizeBytes: JSON.stringify(this.cache).length,
        oldestProduct: Math.min(...products.map(p => p.cachedAt)),
        newestProduct: Math.max(...products.map(p => p.cachedAt)),
        lastCleanup: now
      };

      await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error('❌ Error updating cache metadata:', error);
    }
  }

  private async checkAndPerformCleanup(): Promise<void> {
    try {
      const metadataJson = await AsyncStorage.getItem(CACHE_METADATA_KEY);
      if (!metadataJson) return;

      const metadata: ProductCacheMetadata = JSON.parse(metadataJson);
      const now = Date.now();
      
      // Verificar si necesita limpieza (cada 7 días)
      if (now - metadata.lastCleanup > this.CLEANUP_INTERVAL) {
        console.log('🧹 Performing automatic cache cleanup...');
        await this.performCleanup();
      }
    } catch (error) {
      console.error('❌ Error during cleanup check:', error);
    }
  }

  private async performCleanup(): Promise<void> {
    const now = Date.now();
    const maxAge = this.MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    let removedCount = 0;

    // Remover productos antiguos
    for (const productCode in this.cache) {
      const product = this.cache[productCode];
      if (now - product.cachedAt > maxAge) {
        delete this.cache[productCode];
        removedCount++;
      }
    }

    // Si aún hay demasiados productos, remover los menos accedidos
    const remainingProducts = Object.values(this.cache);
    if (remainingProducts.length > this.MAX_CACHE_SIZE) {
      // Ordenar por accessCount (ascendente) y lastAccessed (ascendente)
      remainingProducts.sort((a, b) => {
        if (a.accessCount !== b.accessCount) {
          return a.accessCount - b.accessCount;
        }
        return a.lastAccessed - b.lastAccessed;
      });

      // Remover los menos usados
      const toRemove = remainingProducts.length - this.MAX_CACHE_SIZE;
      for (let i = 0; i < toRemove; i++) {
        delete this.cache[remainingProducts[i].code];
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} old products from cache`);
      await this.saveCache();
    }
  }

  // MÉTODO PRINCIPAL: Obtener producto del cache
  async getProduct(productCode: string): Promise<CachedProduct | null> {
    await this.initializeCache();
    this.cacheRequests++;

    const cachedProduct = this.cache[productCode];
    
    if (cachedProduct) {
      // Actualizar estadísticas de acceso
      cachedProduct.lastAccessed = Date.now();
      cachedProduct.accessCount++;
      this.cacheHits++;
      
      // Guardar cambios (sin await para mejor performance)
      this.saveCache();
      
      console.log(`💾 Product ${productCode} found in cache (accessed ${cachedProduct.accessCount} times)`);
      return { ...cachedProduct }; // retornar copia para evitar mutaciones
    }

    console.log(`🔍 Product ${productCode} not in cache`);
    return null;
  }

  // MÉTODO PRINCIPAL: Guardar producto en cache
  async setProduct(product: Omit<CachedProduct, 'cachedAt' | 'lastAccessed' | 'accessCount'>): Promise<void> {
    await this.initializeCache();

    const now = Date.now();
    const cachedProduct: CachedProduct = {
      ...product,
      cachedAt: now,
      lastAccessed: now,
      accessCount: 1
    };

    this.cache[product.code] = cachedProduct;
    await this.saveCache();
    
    console.log(`💾 Product ${product.code} saved to cache`);
  }

  // Remover producto específico
  async removeProduct(productCode: string): Promise<void> {
    await this.initializeCache();
    
    if (this.cache[productCode]) {
      delete this.cache[productCode];
      await this.saveCache();
      console.log(`🗑️ Product ${productCode} removed from cache`);
    }
  }

  // Limpiar todo el cache
  async clearCache(): Promise<void> {
    await this.initializeCache();
    
    try {
      console.log('🧹 Clearing entire product cache...');
      this.cache = {};
      await AsyncStorage.multiRemove([PRODUCT_CACHE_KEY, CACHE_METADATA_KEY]);
      console.log('✅ Product cache cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing product cache:', error);
    }
  }

  // Obtener estadísticas detalladas
  async getStats(): Promise<ProductCacheStats> {
    await this.initializeCache();
    
    const products = Object.values(this.cache);
    const totalSizeBytes = JSON.stringify(this.cache).length;
    
    // Encontrar producto más accedido
    let mostAccessedProduct: CachedProduct | null = null;
    if (products.length > 0) {
      mostAccessedProduct = products.reduce((prev, current) => 
        (current.accessCount > prev.accessCount) ? current : prev
      );
    }

    // Calcular age del producto más antiguo
    let oldestProductAge = 'N/A';
    if (products.length > 0) {
      const oldestTimestamp = Math.min(...products.map(p => p.cachedAt));
      const ageMs = Date.now() - oldestTimestamp;
      const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
      oldestProductAge = ageDays === 0 ? 'Today' : 
                       ageDays === 1 ? '1 day ago' : 
                       `${ageDays} days ago`;
    }

    // Calcular hit rate
    const cacheHitRate = this.cacheRequests > 0 ? 
      Math.round((this.cacheHits / this.cacheRequests) * 100) : 0;

    return {
      totalProducts: products.length,
      totalSizeKB: Math.round(totalSizeBytes / 1024 * 100) / 100,
      totalSizeMB: Math.round(totalSizeBytes / (1024 * 1024) * 100) / 100,
      oldestProductAge,
      mostAccessedProduct,
      cacheHitRate
    };
  }

  // Obtener productos más accedidos
  async getMostAccessedProducts(limit: number = 10): Promise<CachedProduct[]> {
    await this.initializeCache();
    
    return Object.values(this.cache)
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
  }

  // Buscar productos por nombre (útil para búsquedas offline)
  async searchProducts(searchTerm: string, limit: number = 20): Promise<CachedProduct[]> {
    await this.initializeCache();
    
    const term = searchTerm.toLowerCase();
    
    return Object.values(this.cache)
      .filter(product => 
        product.product_name.toLowerCase().includes(term) ||
        product.brands.toLowerCase().includes(term) ||
        product.ingredients_text.toLowerCase().includes(term)
      )
      .sort((a, b) => b.accessCount - a.accessCount) // Ordenar por popularidad
      .slice(0, limit);
  }

  // Precargar productos en lote
  async preloadProducts(products: Array<Omit<CachedProduct, 'cachedAt' | 'lastAccessed' | 'accessCount'>>): Promise<void> {
    console.log(`🚀 Preloading ${products.length} products to cache...`);
    
    await this.initializeCache();
    
    const now = Date.now();
    let addedCount = 0;
    
    for (const product of products) {
      // Solo agregar si no existe ya
      if (!this.cache[product.code]) {
        const cachedProduct: CachedProduct = {
          ...product,
          cachedAt: now,
          lastAccessed: now,
          accessCount: 0 // 0 porque no ha sido accedido por el usuario aún
        };
        
        this.cache[product.code] = cachedProduct;
        addedCount++;
      }
    }
    
    if (addedCount > 0) {
      await this.saveCache();
      console.log(`✅ Preloaded ${addedCount} new products to cache`);
    }
  }
}

// Exportar instancia singleton
export const productCacheUtils = ProductCacheManager.getInstance();

// API pública simplificada
export const ProductCacheAPI = {
  /**
   * Obtener producto del cache
   */
  getProduct: (productCode: string) => productCacheUtils.getProduct(productCode),
  
  /**
   * Guardar producto en cache
   */
  setProduct: (product: Omit<CachedProduct, 'cachedAt' | 'lastAccessed' | 'accessCount'>) => 
    productCacheUtils.setProduct(product),
  
  /**
   * Remover producto específico
   */
  removeProduct: (productCode: string) => productCacheUtils.removeProduct(productCode),
  
  /**
   * Limpiar todo el cache
   */
  clearCache: () => productCacheUtils.clearCache(),
  
  /**
   * Obtener estadísticas del cache
   */
  getStats: () => productCacheUtils.getStats(),
  
  /**
   * Obtener productos más accedidos
   */
  getMostAccessed: (limit?: number) => productCacheUtils.getMostAccessedProducts(limit),
  
  /**
   * Buscar productos en cache (útil para funcionalidad offline)
   */
  searchProducts: (searchTerm: string, limit?: number) => 
    productCacheUtils.searchProducts(searchTerm, limit),
  
  /**
   * Precargar productos en lote
   */
  preloadProducts: (products: Array<Omit<CachedProduct, 'cachedAt' | 'lastAccessed' | 'accessCount'>>) =>
    productCacheUtils.preloadProducts(products),
};