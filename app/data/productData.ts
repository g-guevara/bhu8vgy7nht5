// app/data/productData.ts - Sistema mejorado con cache integrado
import AsyncStorage from '@react-native-async-storage/async-storage';

// =================== INTERFACES ===================

export interface Product {
  code: string;
  product_name: string;
  brands: string;
  ingredients_text: string;
  image_url?: string;
  // Metadata del cache
  _cached?: boolean;
  _cachedAt?: number;
  _lastAccessed?: number;
  _accessCount?: number;
}

export interface ProductCacheMetadata {
  totalProducts: number;
  lastUpdated: number;
  version: string;
}

// =================== CONFIGURACIÓN ===================

const CACHE_KEY = 'enhanced_product_data';
const METADATA_KEY = 'product_data_metadata';
const CACHE_VERSION = '1.0';
const MAX_CACHE_SIZE = 1000;
const MAX_AGE_DAYS = 30;

// =================== ARRAY PRINCIPAL DE PRODUCTOS ===================

// Este es el array que usarán todos los componentes existentes
export const sampleProducts: Product[] = [];

// =================== SISTEMA DE CACHE ===================

class ProductDataManager {
  private static instance: ProductDataManager;
  private isInitialized = false;
  private initialProducts: Product[] = [];

  static getInstance(): ProductDataManager {
    if (!ProductDataManager.instance) {
      ProductDataManager.instance = new ProductDataManager();
    }
    return ProductDataManager.instance;
  }

  setInitialProducts(products: Product[]) {
    this.initialProducts = products;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('📦 Initializing enhanced product data system...');
      
      await this.loadFromCache();
      
      if (sampleProducts.length === 0 && this.initialProducts.length > 0) {
        sampleProducts.push(...this.initialProducts);
        console.log(`📦 Loaded ${this.initialProducts.length} initial products`);
      }

      this.isInitialized = true;
      console.log(`📦 Product data system ready with ${sampleProducts.length} products`);
    } catch (error) {
      console.error('❌ Error initializing product data:', error);
      if (this.initialProducts.length > 0) {
        sampleProducts.push(...this.initialProducts);
      }
      this.isInitialized = true;
    }
  }

  private async loadFromCache(): Promise<void> {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const products: Product[] = JSON.parse(cachedData);
        const validProducts = this.cleanOldProducts(products);
        
        sampleProducts.length = 0;
        sampleProducts.push(...validProducts);
        
        console.log(`💾 Loaded ${validProducts.length} products from cache`);
      }
    } catch (error) {
      console.error('❌ Error loading from cache:', error);
    }
  }

  private cleanOldProducts(products: Product[]): Product[] {
    const now = Date.now();
    const maxAge = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

    return products.filter(product => {
      if (!product._cachedAt) return true;
      return (now - product._cachedAt) < maxAge;
    });
  }

  async saveToCache(): Promise<void> {
    try {
      if (sampleProducts.length > MAX_CACHE_SIZE) {
        const sortedProducts = [...sampleProducts].sort((a, b) => {
          const accessA = a._accessCount || 0;
          const accessB = b._accessCount || 0;
          if (accessA !== accessB) return accessB - accessA;
          
          const timeA = a._lastAccessed || 0;
          const timeB = b._lastAccessed || 0;
          return timeB - timeA;
        });
        
        sampleProducts.length = 0;
        sampleProducts.push(...sortedProducts.slice(0, MAX_CACHE_SIZE));
      }

      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(sampleProducts));
      await this.updateMetadata();
      console.log(`💾 Saved ${sampleProducts.length} products to cache`);
    } catch (error) {
      console.error('❌ Error saving to cache:', error);
    }
  }

  private async updateMetadata(): Promise<void> {
    try {
      const metadata: ProductCacheMetadata = {
        totalProducts: sampleProducts.length,
        lastUpdated: Date.now(),
        version: CACHE_VERSION
      };
      await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error('❌ Error updating metadata:', error);
    }
  }

  addProduct(product: Product): void {
    const existingIndex = sampleProducts.findIndex(p => p.code === product.code);
    
    const enhancedProduct: Product = {
      ...product,
      _cached: true,
      _cachedAt: Date.now(),
      _lastAccessed: Date.now(),
      _accessCount: existingIndex >= 0 ? (sampleProducts[existingIndex]._accessCount || 0) + 1 : 1
    };

    if (existingIndex >= 0) {
      sampleProducts[existingIndex] = enhancedProduct;
    } else {
      sampleProducts.push(enhancedProduct);
    }

    this.saveToCache();
  }

  addProducts(products: Product[]): void {
    products.forEach(product => {
      const existingIndex = sampleProducts.findIndex(p => p.code === product.code);
      
      const enhancedProduct: Product = {
        ...product,
        _cached: true,
        _cachedAt: Date.now(),
        _lastAccessed: Date.now(),
        _accessCount: existingIndex >= 0 ? sampleProducts[existingIndex]._accessCount || 0 : 0
      };

      if (existingIndex >= 0) {
        sampleProducts[existingIndex] = enhancedProduct;
      } else {
        sampleProducts.push(enhancedProduct);
      }
    });

    this.saveToCache();
  }

  markProductAccessed(productCode: string): void {
    const product = sampleProducts.find(p => p.code === productCode);
    if (product) {
      product._lastAccessed = Date.now();
      product._accessCount = (product._accessCount || 0) + 1;
      this.saveToCache();
    }
  }

  findProduct(productCode: string): Product | undefined {
    const product = sampleProducts.find(p => p.code === productCode);
    if (product) {
      this.markProductAccessed(productCode);
    }
    return product;
  }

  searchProducts(searchTerm: string, limit: number = 20): Product[] {
    const term = searchTerm.toLowerCase();
    
    return sampleProducts
      .filter(product => 
        product.product_name.toLowerCase().includes(term) ||
        product.brands.toLowerCase().includes(term) ||
        product.ingredients_text.toLowerCase().includes(term)
      )
      .sort((a, b) => (b._accessCount || 0) - (a._accessCount || 0))
      .slice(0, limit);
  }

  async getStats(): Promise<{
    totalProducts: number;
    cachedProducts: number;
    originalProducts: number;
    cacheSizeKB: number;
    mostAccessedProduct: Product | null;
  }> {
    const cachedProducts = sampleProducts.filter(p => p._cached).length;
    const originalProducts = sampleProducts.filter(p => !p._cached).length;
    
    let mostAccessedProduct: Product | null = null;
    if (sampleProducts.length > 0) {
      mostAccessedProduct = sampleProducts.reduce((prev, current) => 
        (current._accessCount || 0) > (prev._accessCount || 0) ? current : prev
      );
    }

    const cacheData = await AsyncStorage.getItem(CACHE_KEY);
    const cacheSizeBytes = cacheData ? new Blob([cacheData]).size : 0;

    return {
      totalProducts: sampleProducts.length,
      cachedProducts,
      originalProducts,
      cacheSizeKB: Math.round(cacheSizeBytes / 1024 * 100) / 100,
      mostAccessedProduct
    };
  }

  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([CACHE_KEY, METADATA_KEY]);
      
      sampleProducts.length = 0;
      if (this.initialProducts.length > 0) {
        sampleProducts.push(...this.initialProducts);
      }
      
      console.log('🧹 Cache cleared, restored initial products');
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
    }
  }
}

// =================== API PÚBLICA ===================

const productManager = ProductDataManager.getInstance();

export const initializeProductData = async (initialProducts: Product[] = []) => {
  productManager.setInitialProducts(initialProducts);
  await productManager.initialize();
};

export const addProductsToData = (products: Product[]): void => {
  productManager.addProducts(products);
};

export const addProductToData = (product: Product): void => {
  productManager.addProduct(product);
};

export const findProductInData = (productCode: string): Product | undefined => {
  return productManager.findProduct(productCode);
};

export const searchProductsInData = (searchTerm: string, limit?: number): Product[] => {
  return productManager.searchProducts(searchTerm, limit);
};

export const getProductDataStats = (): Promise<{
  totalProducts: number;
  cachedProducts: number;
  originalProducts: number;
  cacheSizeKB: number;
  mostAccessedProduct: Product | null;
}> => {
  return productManager.getStats();
};

export const clearProductDataCache = (): Promise<void> => {
  return productManager.clearCache();
};

// =================== PRODUCTOS INICIALES ===================

const INITIAL_PRODUCTS: Product[] = [
  //  PRODUCTOS EXISTENTES


        {
        "code": "SSS1000000000",
        "product_name": "Blueberry",
        "brands": "Fruit",
        "ingredients_text": "Blueberry",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000001",
        "product_name": "Cherry",
        "brands": "Fruit",
        "ingredients_text": "Cherry",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000002",
        "product_name": "Quince",
        "brands": "Fruit",
        "ingredients_text": "Quince",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000003",
        "product_name": "Tuna",
        "brands": "Fish",
        "ingredients_text": "Tuna",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000004",
        "product_name": "Pear",
        "brands": "Fruit",
        "ingredients_text": "Pear",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000005",
        "product_name": "Grape",
        "brands": "Fruit",
        "ingredients_text": "Grape",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000006",
        "product_name": "Lemon",
        "brands": "Fruit",
        "ingredients_text": "Lemon",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000007",
        "product_name": "Orange",
        "brands": "Fruit",
        "ingredients_text": "Orange",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000008",
        "product_name": "Watermelon",
        "brands": "Fruit",
        "ingredients_text": "Watermelon",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000009",
        "product_name": "Banana",
        "brands": "Fruit",
        "ingredients_text": "Banana",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000010",
        "product_name": "Apple",
        "brands": "Fruit",
        "ingredients_text": "Apple",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000011",
        "product_name": "Tomato",
        "brands": "Vegetable",
        "ingredients_text": "Tomato",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000012",
        "product_name": "Strawberry",
        "brands": "Fruit",
        "ingredients_text": "Strawberry",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000013",
        "product_name": "Onion",
        "brands": "Vegetable",
        "ingredients_text": "Onion",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000014",
        "product_name": "Egg",
        "brands": "Animal Product",
        "ingredients_text": "Egg",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000015",
        "product_name": "Peanut",
        "brands": "Nut",
        "ingredients_text": "Peanut",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000016",
        "product_name": "Milk",
        "brands": "Dairy",
        "ingredients_text": "Milk",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000017",
        "product_name": "Shrimp",
        "brands": "Seafood",
        "ingredients_text": "Shrimp",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000018",
        "product_name": "Soy",
        "brands": "Legume",
        "ingredients_text": "Soy",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000019",
        "product_name": "Rice",
        "brands": "Grain",
        "ingredients_text": "Rice",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000020",
        "product_name": "Oat",
        "brands": "Grain",
        "ingredients_text": "Oat",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000021",
        "product_name": "Pork",
        "brands": "Meat",
        "ingredients_text": "Pork",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000022",
        "product_name": "Beef",
        "brands": "Meat",
        "ingredients_text": "Beef",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000023",
        "product_name": "Chicken",
        "brands": "Meat",
        "ingredients_text": "Chicken",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000024",
        "product_name": "Turkey",
        "brands": "Meat",
        "ingredients_text": "Turkey",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000025",
        "product_name": "Corn",
        "brands": "Grain",
        "ingredients_text": "Corn",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000026",
        "product_name": "Avocado",
        "brands": "Fruit",
        "ingredients_text": "Avocado",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000027",
        "product_name": "Wheat",
        "brands": "Grain",
        "ingredients_text": "Wheat",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000028",
        "product_name": "Spinach",
        "brands": "Vegetable",
        "ingredients_text": "Spinach",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000029",
        "product_name": "Potato",
        "brands": "Vegetable",
        "ingredients_text": "Potato",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000030",
        "product_name": "Asparagus",
        "brands": "Vegetable",
        "ingredients_text": "Asparagus",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000031",
        "product_name": "Sweet Potato",
        "brands": "Vegetable",
        "ingredients_text": "Sweet Potato",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
      {
        "code": "SSS1000000032",
        "product_name": "Broccoli",
        "brands": "Vegetable",
        "ingredients_text": "Broccoli",
        "image_url": "https://images.openfoodfacts.org/images/products/000/010/120/9159/front_fr.4.200.jpg"
      },
    


];

// Inicializar automáticamente
initializeProductData(INITIAL_PRODUCTS);

// Exportación por defecto para compatibilidad
export default sampleProducts;