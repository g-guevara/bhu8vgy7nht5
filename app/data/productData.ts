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
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczOu1rrIU6AXVDWRDzuYkDXFTjkmsizzlqDN-EqkTLAj7SWuqSS3JGjQXDV-TIbmHwmeKfejq2RTPxoocWgXMzp5EplBut_2kkQQdWCfm_x031BFtuLIsHpyUQE-GI2CJGLtFYvC2b-wcFC0Xl3XTqVRzQ=w951-h951-s-no-gm?authuser=0"
  },
  {
    "code": "SSS1000000001",
    "product_name": "Cherry",
    "brands": "Fruit",
    "ingredients_text": "Cherry",
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczOGGTcG6RBnQXNmTisHW9ByaTGdc12rL-OKbBMTj5PqkiBQ9WVUKiVjMsw_WmHb3JUyFG8dQRZhB3l_a7OxySo5mqDG9-YOBltVWyxSa4DtlcD9ViNidw8eBi0clRQB2njFO1ICDG_Bp3ExT03h-78BLA=w1024-h1024-s-no-gm?authuser=0"
  },
  {
    "code": "SSS1000000002",
    "product_name": "Quince",
    "brands": "Fruit",
    "ingredients_text": "Quince",
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczPJChoxRlOR3KZ_T9iDSG1op8EiWcsmcZZu4wE2QJP27N77AtSMg3mNQIN98xRgtW-HNgZjO3I3NCcCTTDTUHcIMpjTBKeTTfKWVObrMpj4kUHOQ1NKsOPq1WKup3PbJEgqNGS37EuMBMk4V3mZ2LLfKA=w1024-h1024-s-no-gm?authuser=0"
  },

   {
    "code": "SSS1000000004",
    "product_name": "Pear",
    "brands": "Fruit",
    "ingredients_text": "Pear",
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczMsVxQ6nE0LSBlAt9ARvpAGAay4yE0FbSJsoop8LwR-OWUPvIRN-QMju2M7QuBaJUbkH59EYzpk1dZY-M0rZWCzFGSE8-AL1WfdjE7f8VEjpB2YIFIO5R9VuF2qwJhbQEgr0YlshqWqR1xroLlkXJqsPg=w1024-h1024-s-no-gm?authuser=0"
  },
  {
    "code": "SSS1000000005",
    "product_name": "Grape",
    "brands": "Fruit",
    "ingredients_text": "Grape",
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczMi2v3sfSMcG0lF-Gf4BiiSPSkbkmTJZRNTaq2EJlV9y43hU7QF0J4LhJR00e3OGEvQ2hjMwPLLdq9BC48Wptsm5Od1qqAMuzyyJhYPNE_jofumd8itrHUoNcc-mMv_jLFaJdjKi9aWOQ5MathaSEKYZQ=w1024-h1024-s-no-gm?authuser=0"
  },
  {
    "code": "SSS1000000006",
    "product_name": "Lemon",
    "brands": "Fruit",
    "ingredients_text": "Lemon",
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczPwIKLtt0GdKucBY_9gX7W-ZkIMT5L_g810KkfCtcleUU13LbCRqNTiQwpH5R0zMkEQXLw4iFKgbJsmshFt-7PWP-Ns8ACCTF5EWNowL_fB3UMapsLDZfK0NSp2M8i9QxW-dfPhwwiORviF2QBoNKEq2g=w1024-h1024-s-no-gm?authuser=0"
  },
  {
    "code": "SSS1000000007",
    "product_name": "Orange",
    "brands": "Fruit",
    "ingredients_text": "Orange",
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczMi8OP3MsvwygXbKsDXYpPp_eC64uQ5W6Wc_89QdUB4fwgXe6Y5vJxwNjON3FBRsRt_xn0sHj4ys2DntToNouI2l6O1i33CpHFcPlRbCLdF-MthWxt1lfp37VHAf8qQQYPz2Jb0nXjCxU64BEy5D62Skw=w1024-h1024-s-no-gm?authuser=0"
  },
  {
    "code": "SSS1000000008",
    "product_name": "Watermelon",
    "brands": "Fruit",
    "ingredients_text": "Watermelon",
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczOQ2XZZHAKmlQ-QdCrYmhU-1p7TsgtAQhb7aKYvslru5sHQZ_OGR20ImYgayb-gjEB6dBXrDmx_esqge4wxazhXo5iLS9itFaM40Aiv4S4OVKnBL4j3dWO5OTd1iIBEpE_z8JqBMvxo8x9FckB22bWeRA=w1024-h1024-s-no-gm?authuser=0"
  },
  {
    "code": "SSS1000000009",
    "product_name": "Banana",
    "brands": "Fruit",
    "ingredients_text": "Banana",
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczNuAOkaGo9YYQOMF6YfU3vlqGqnlTPmgN32Q-WjkCfTr7UfMwGtLL7-rg2XRlpaDtJD_dzKUXhiJxJ2ooWAG7EoDK3_C43m53SR_F1HUwnwGb9-9IklXbaunwKZbRcvPVo1Iv2XF0PXcEYzw42W5iDXvA=w1024-h1024-s-no-gm?authuser=0"
  },
  {
    "code": "SSS1000000010",
    "product_name": "Apple",
    "brands": "Fruit",
    "ingredients_text": "Apple",
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczM5_Na5GTSqrX-q99X6Nve_WsWT_nbCb-b8I913PLYfpMLkIYFdxfk1skQSLagfRH0Y-fuzpnv_-jDxQvdGcvo_FG0J5bxguNdMP6drY-_NFkRnTStynDi3XsLFhJ_GLnBj_4oCGUH4XAptCoz_urOgkA=w1024-h1024-s-no-gm?authuser=0"
  },
  {
    "code": "SSS1000000011",
    "product_name": "Tomato",
    "brands": "Vegetable",
    "ingredients_text": "Tomato",
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczPoue-8iixklAlJWysNRU5BeM0FHCI2YsDcroTOcY88XUVtckmdopAGFDd1dhoTh2KSp9XktOf2GjKDegSGpQrLz6Ppq2Vu9JtelrJNMR-0Aazi4f06DmXt5K2arBkirg3FG9M637vpQMluXvkEK0kMAA=w1024-h1024-s-no-gm?authuser=0"
  },
  {
    "code": "SSS1000000012",
    "product_name": "Strawberry",
    "brands": "Fruit",
    "ingredients_text": "Strawberry",
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczOi2tbWAYHKldxWDRI4hfjNm8laxmO_48dXNPIIsmkgt_ppabU7j-jbYcSKHr1TE4IVmPb2Sa3R66yVvrP8r-1BTu6uouJ_m_4u3vBSm_hNUPHp1_B9MUayONHRKwMvoTmtN-xkHr2TtOlKQleldiNjZg=w1024-h1024-s-no-gm?authuser=0"
  },
  {
    "code": "SSS1000000013",
    "product_name": "Onion",
    "brands": "Vegetable",
    "ingredients_text": "Onion",
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczOPAnbGk1SUHOeZxuo3h6HiQwf8WBJ8DqR0xpJNbv-mhmVsD4V2LZnW4AXjL81ElQKmw2uB_AJ2lb-xQuuy0OdJzbodr8Wf1g99lyvgPpisPdKbTOgRWUiP1gLw7rXGZVS363-EVaxohEpYOSyi2qpFzA=w1024-h1024-s-no-gm?authuser=0"
  },
  {
    "code": "SSS1000000014",
    "product_name": "Egg",
    "brands": "Animal Product",
    "ingredients_text": "Egg",
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczNsSmA7tOKNhqgGBTMCFWBPfa3-wHKcDjJmGLqvA3Z2LafHNq0rdz9ojevJ3U-ZP-AbZ39YXo6wb1ehWvddgFkR2I8Qv4mUJPPZpXiwLsDpmwjvYnf-ML8co-EIGrK7oTJQJQ04mkSVxP2xZcwJDaOyow=w1024-h1024-s-no-gm?authuser=0"
  },
  {
    "code": "SSS1000000015",
    "product_name": "Peanut",
    "brands": "Nut",
    "ingredients_text": "Peanut",
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczMSHFoklQalgY2wGVP7e1vbwR4Luf5unKHtYMBliNkAuO5Qsf-m-pZPX1T5mbSLQHWy-eXwxTZt6Jar3doqckYq33RqI8fIKm9TxIqpNqmvLyXABQQ3QUZtrqTLhUDSimNMn1ps8A0kKjNoDnln0i7MwA=w1024-h1024-s-no-gm?authuser=0"
  },
  {
    "code": "SSS1000000016",
    "product_name": "Milk",
    "brands": "Dairy",
    "ingredients_text": "Milk",
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczNGXAKfrua120SajJigMySM01eSrXChXIAwhrrsi-RSTToVOmShrfDavSQoRXoS7U7oxUatAhVWPXvrp2z7WQG1aZJzQ-vC1pib-Z4MwMtcyaz-_QunA-l01XoRnGlqkFQvmR1_WuA0S6UJK7ELkec5-A=w1024-h1024-s-no-gm?authuser=0"
  },
  {
    "code": "SSS1000000017",
    "product_name": "Shrimp",
    "brands": "Seafood",
    "ingredients_text": "Shrimp",
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczOU5r8jHCTfD-rMMjh9EPjpqrTB829OpJYYmSy_WNLTVm4beZaE5FX_4yx1gvSrKl1zA8pPUS9eosw_A_JlvLcPtsCRM6cErc0W59VFdATYAZU5Awy9LQHnU72yWxw_y0h-fOcOjBcWWxjp3-bIlD3dew=w1024-h1024-s-no-gm?authuser=0"
  },
  {
    "code": "SSS1000000018",
    "product_name": "Soy",
    "brands": "Legume",
    "ingredients_text": "Soy",
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczNjxr_5KoTz61_lY3NsN5e91nZqqTbym1EgrJm7gd3NmjOcLf4436MI46nSrui3pNvbS21v0abLaQ3o24yx8uJkuJ_GD5Qi-IxZrSGb9zr1DVxlaj6sa12y7HuQ4clF_JcKdo5RB3uVhCL_xPrJmXkRwA=w1024-h1024-s-no-gm?authuser=0"
  },
  {
    "code": "SSS1000000019",
    "product_name": "Rice",
    "brands": "Grain",
    "ingredients_text": "Rice",
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczPiEAYX2zQyhi39nWIO7q77waxd2ofbOu_9NuMB68te6VqVL8jSw1fb5kFfLVM7iN94opcr2MUeaS31bauUloIQpzfG66OD-IYGxmWWtsY3BXBsL7g33dkoC-xawdS6RoP6CbfNJ8vjvpTbl6_M-QjVhQ=w1024-h1024-s-no-gm?authuser=0"
  },
  {
    "code": "SSS1000000020",
    "product_name": "Oat",
    "brands": "Grain",
    "ingredients_text": "Oat",
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczNA-BA00Q4doTReMJxpGxxZgy46HpSMPJmWv0OkQ3IsVoLrJJ03Ql-7kd35mDZLnitSvCCFz9oXqpEByt9IkWrSaRn-KX-Orgzmk5YP44oP-pw_pmEOWIeD4O-xlT8q1F0KlntCRuSC3KBM2GbD6nqYag=w1024-h1024-s-no-gm?authuser=0"
  },
  {
    "code": "SSS1000000021",
    "product_name": "Pork",
    "brands": "Meat",
    "ingredients_text": "Pork",
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczOQ1fDTvxf3h0JujmEtO-XJO1pRkIMTjCduHuMMRWGUm_s8TWh9SEt9im8CrVSBThGRNohbGCfkHZgTph4op1SKnVHQsdM8o4MbNjpsHeMWkiNw4xUWHK-sFN6JMpOnI3MsKtaSBS5CvGkbefIPyJIS1A=w1024-h1024-s-no-gm?authuser=0"
  },
  {
    "code": "SSS1000000022",
    "product_name": "Beef",
    "brands": "Meat",
    "ingredients_text": "Beef",
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczOkvoTtL8feRMyEqQWHRGl14Gv0ai0igPJrpQCDhblT7Ff9_CFlAEcW7POKxXjNC92VzAMNNU6P0c52WE0YpsFi2G8WZbYBFZbuDLn638ijtPHuxC6iqpTwomsOzmJEwrKGLjZAbKPl_2RgInZPqQVCJw=w1024-h1024-s-no-gm?authuser=0"
  },
  {
    "code": "SSS1000000023",
    "product_name": "Chicken",
    "brands": "Meat",
    "ingredients_text": "Chicken",
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczOq5lwJZyI7dY8k940yWi0h7Lxg5Dr0KpMJIrcAXrZKZrCJH8QLDROWPOr0x9rUkr88gdKyNikduF5L4VGvCoWCk0MHE7aZ9Gdkg2wWEkcNZeC5T3NC0Q_p7ajlk4b8_hCvpiX-Kge_NYSfXiId0zNfaQ=w1024-h1024-s-no-gm?authuser=0"
  },
  {
    "code": "SSS1000000024",
    "product_name": "Turkey",
    "brands": "Meat",
    "ingredients_text": "Turkey",
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczOOVDYY8iJoZL78M1BoHKOoBoUON8QciVE3OI86MQJujn8SR0LVMwMwT44PUot4kuqocvEBU7cAFjn2GPVEhNUu_3SNug2kxqmb6FIP9ctts6b3aMiyuW7OJUA8PnOhHToRKh7ymmTGuucjXpLRMSx0aA=w1024-h1024-s-no-gm?authuser=0"
  },
  {
    "code": "SSS1000000025",
    "product_name": "Corn",
    "brands": "Grain",
    "ingredients_text": "Corn",
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczPLTlYt1JzmWHYsJOBz6Ss04SU1looaCJq0tn-gQDQfqgjVjf5wZkBsr9eDi1aiF_0ChsTF2BP2mkd4oWiI5EpWI0Fl4ExU7Cp6vu-Eh_qN0Fben_MQ4d_fiEVV-s4FIjW3VHKqk7xi6iATy1SbSLzqtA=w1024-h1024-s-no-gm?authuser=0"
  },
  {
    "code": "SSS1000000026",
    "product_name": "Avocado",
    "brands": "Fruit",
    "ingredients_text": "Avocado",
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczMhKmvcbzQQzNLeXcOs8tFWgGpQlI5awnaBT3FtlR6ii43zPksRywAil55lfyN5l8EwzEUTPsYfuLQMhjn_nXkB4sJOREBZ2_XbzNMSkB1RNZMHjXMDzFWg1AEcoACmyvrsqV7v3iTWqmfbNW1daoIy4g=w1024-h1024-s-no-gm?authuser=0"
  },
  {
    "code": "SSS1000000027",
    "product_name": "Wheat",
    "brands": "Grain",
    "ingredients_text": "Wheat",
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczOSphrkfSId3h5NTTbkIy7YDJLpH6_uiuTso96n2d_l-z8_obVn3YsTBnDpHayg_izpAFTN1v3lBd3XK1eTBZeZKVC94RPvVzjryLrPkjSiTfUAdPu2zGxbIUnMbgx514ufMdz7tjronZAlcvjUg8lv_w=w1024-h1024-s-no-gm?authuser=0"
  },
  {
    "code": "SSS1000000028",
    "product_name": "Spinach",
    "brands": "Vegetable",
    "ingredients_text": "Spinach",
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczPx7TzxfFnImnJ2SW7LP1IRCr-8maWnU8Rt8t60vVLKiuNuFD1DRae1Yu_P2cPHhw_2m7Nw74hskzENFNrBOquRN1t5khs2WwfjEQykw8sbGkhIqMhQE7bWyP6EF1gKngd87VaxPn8x7fZs8wEG5EuvsQ=w1024-h1024-s-no-gm?authuser=0"
  },
  {
    "code": "SSS1000000029",
    "product_name": "Potato",
    "brands": "Vegetable",
    "ingredients_text": "Potato",
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczP_zlkxDM14BGIINwP_BlyUuKNfocDIHvE-MhCeG5bSv3kizeXRc_H1dHDWT7IU5rtL_YykO0T_HyV442yNdCgAPrFiIWI84L2S0yGLfB-Diuh92syeDcWx36O-uq08FmOUIe3n_ayT09Mfqf3IsG5WXg=w1024-h1024-s-no-gm?authuser=0"
  },
  {
    "code": "SSS1000000030",
    "product_name": "Asparagus",
    "brands": "Vegetable",
    "ingredients_text": "Asparagus",
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczMEDVOu9fmiumTJi1uNbZxuhhRkIHxTFFO58VcakcDL11pgNoKOYC2WS_T84gpzmnMbDjskaR6yjauTS8FrCH37okLMGdk1YvdGz_alAX77VbgcnaskDLczRztvS2mCH84fhi8Yqqeh-HpT_GxbrsYUww=w1024-h1024-s-no-gm?authuser=0"
  },
  {
    "code": "SSS1000000031",
    "product_name": "Sweet Potato",
    "brands": "Vegetable",
    "ingredients_text": "Sweet Potato",
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczNLqIgS7FeiUkfLJ-SfgHBa2KfwGcS7ziwQho690_rijEzv41eZt-TzAm6O1wVducPTdpvfHa04CLweGW3_0MwuaY1MpQcH3fMA2E0LMr58ZuT-lYOzkXsUTMQv1OgB4NMIqsAXlnqW-yAPQLhge_i4TQ=w1024-h1024-s-no-gm?authuser=0"
  },
  {
    "code": "SSS1000000032",
    "product_name": "Broccoli",
    "brands": "Vegetable",
    "ingredients_text": "Broccoli",
    "image_url": "https://lh3.googleusercontent.com/pw/AP1GczMZ5leYptwDjO0vV2Nmkdk-GygUYA59TVpNcfmILOnjB7sABBUvSLmZyn9RGMeNWQgAhniMcugbVLUHRCbpor1wIq453IJqBMAI-h9_EY_0bTL6jeIYzEH-yq_qVqqmz7mOZvs2VDhr6CnKMsjkdQjocA=w1024-h1024-s-no-gm?authuser=0"
  }

    


];

// Inicializar automáticamente
initializeProductData(INITIAL_PRODUCTS);

// Exportación por defecto para compatibilidad
export default sampleProducts;