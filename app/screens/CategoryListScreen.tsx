// app/screens/CategoryListScreen.tsx - CORREGIDO CON CACHE DE IMÁGENES
import React, { useEffect, useState } from 'react';
import { 
  SafeAreaView, 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  FlatList,
  ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sampleProducts } from '../data/productData';
import { styles } from '../styles/CategoryListStyles';
// 🆕 IMPORTAR EL SISTEMA DE CACHE DE IMÁGENES
import { imageCacheUtils } from '../utils/imageCacheUtils';

// Define the Product interface if not imported
interface Product {
  code: string;
  product_name: string;
  brands: string;
  ingredients_text: string;
  image_url?: string;
}

// 🆕 INTERFAZ EXTENDIDA PARA PRODUCTOS CON CACHE DE IMÁGENES
interface ProductWithImage extends Product {
  imageUri?: string | null;
  imageLoading?: boolean;
  imageError?: boolean;
}

export default function CategoryListScreen() {
  const router = useRouter();
  const { category, brand } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  // 🆕 CAMBIAR TIPO DE ESTADO PARA INCLUIR IMAGEN CACHE
  const [products, setProducts] = useState<ProductWithImage[]>([]);

  useEffect(() => {
    const loadProducts = () => {
      setLoading(true);
      try {
        console.log('🔍 Starting product filtering...');
        console.log('📊 Total sampleProducts available:', sampleProducts.length);
        console.log('🎯 Looking for brand:', brand);
        
        // 🔧 ROBUST FILTERING: Handle both local and API products
        const filteredProducts = sampleProducts.filter(product => {
          // ✅ STEP 1: Basic validation
          if (!product) {
            console.warn('⚠️ Found null/undefined product');
            return false;
          }
          
          // ✅ STEP 2: Ensure code exists and convert to string if needed
          let productCode: string;
          if (product.code === null || product.code === undefined) {
            console.warn('⚠️ Product missing code:', product);
            return false;
          }
          
          // Convert number codes to strings for consistency
          productCode = String(product.code);
          
          // ✅ STEP 3: Only include organic products (SSS prefix)
          const isOrganic = productCode.startsWith('SSS');
          if (!isOrganic) {
            // This is an API product, skip it for category view
            return false;
          }
          
          // ✅ STEP 4: Validate brands
          if (!product.brands || typeof product.brands !== 'string') {
            console.warn('⚠️ Product missing brands:', product);
            return false;
          }
          
          // ✅ STEP 5: Check if brands match (case insensitive)
          const brandsMatch = product.brands.toLowerCase() === (brand?.toString().toLowerCase() || '');
          
          console.log(`📝 Product ${productCode}: isOrganic=${isOrganic}, brands="${product.brands}", match=${brandsMatch}`);
          
          return brandsMatch;
        });
        
        console.log('✅ Filtered products result:', filteredProducts.length);
        filteredProducts.forEach(p => {
          console.log(`✅ Including: ${p.code} - ${p.product_name} (${p.brands})`);
        });
        
        // 🆕 CONVERTIR A PRODUCTOS CON CACHE DE IMÁGENES
        const productsWithImageState: ProductWithImage[] = filteredProducts.map(product => ({
          ...product,
          imageUri: null,
          imageLoading: false,
          imageError: false
        }));
        
        setProducts(productsWithImageState);
        
        // 🆕 CARGAR IMÁGENES DESPUÉS DE CONFIGURAR LOS PRODUCTOS
        if (productsWithImageState.length > 0) {
          console.log(`🚀 [CategoryList] Iniciando carga de imágenes para ${productsWithImageState.length} productos`);
          loadImagesForProducts(productsWithImageState);
        }
      } catch (error) {
        console.error('❌ Error filtering products:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [brand]);

  // 🆕 FUNCIÓN PARA CARGAR IMÁGENES DESDE CACHE
  const loadImagesForProducts = async (products: ProductWithImage[]) => {
    console.log(`🖼️ [CategoryList] Cargando imágenes para ${products.length} productos...`);
    
    // Procesar productos con un pequeño delay para evitar sobrecarga
    for (let i = 0; i < products.length; i++) {
      setTimeout(() => loadProductImage(products[i]), i * 100);
    }
  };

  // 🆕 FUNCIÓN PARA CARGAR IMAGEN DE UN PRODUCTO ESPECÍFICO
  const loadProductImage = async (product: ProductWithImage) => {
    try {
      // Marcar como cargando
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p.code === product.code ? { ...p, imageLoading: true, imageError: false } : p
        )
      );

      console.log(`🔍 [CategoryList] Buscando imagen para producto: ${product.code}`);
      
      // 🚀 PRIORIZAR IMAGE_URL SI EXISTE (Google Photos, etc.)
      if (product.image_url && product.image_url.trim()) {
        console.log(`🖼️ [CategoryList] Usando image_url directa para ${product.code}: ${product.image_url}`);
        
        // Actualizar con la URL directa (Google Photos)
        setProducts(prevProducts => 
          prevProducts.map(p => 
            p.code === product.code ? { 
              ...p, 
              imageUri: product.image_url,
              imageLoading: false, 
              imageError: false 
            } : p
          )
        );
        
        console.log(`✅ [CategoryList] Imagen directa configurada para producto: ${product.code}`);
        return;
      }
      
      // 🔍 FALLBACK: Buscar en OpenFoodFacts solo si NO tiene image_url
      console.log(`🌐 [CategoryList] No tiene image_url, buscando en OpenFoodFacts para: ${product.code}`);
      
      // ⏱️ TIMEOUT DE 30 SEGUNDOS
      const timeoutPromise = new Promise<string | null>((_, reject) => {
        setTimeout(() => reject(new Error('Image timeout')), 30000);
      });
      
      const imagePromise = imageCacheUtils.getProductImage(product.code);
      
      // Race entre la imagen y el timeout
      const imageUri = await Promise.race([imagePromise, timeoutPromise]);
      
      // Actualizar estado con la imagen obtenida
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p.code === product.code ? { 
            ...p, 
            imageUri, 
            imageLoading: false, 
            imageError: !imageUri 
          } : p
        )
      );

      if (imageUri) {
        console.log(`✅ [CategoryList] Imagen de OpenFoodFacts cargada para producto: ${product.code}`);
      } else {
        console.log(`❌ [CategoryList] No se encontró imagen para producto: ${product.code}`);
      }
    } catch (error) {
      console.error(`❌ [CategoryList] Error cargando imagen para producto ${product.code}:`, error);
      
      // Actualizar estado con error
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p.code === product.code ? { ...p, imageLoading: false, imageError: true } : p
        )
      );
    }
  };

  const handleProductPress = async (product: Product) => {
    try {
      // Validate product before storing
      if (!product || !product.code) {
        console.error('❌ Invalid product for navigation:', product);
        return;
      }
      
      // Store the selected product in AsyncStorage
      await AsyncStorage.setItem('selectedProduct', JSON.stringify(product));
      
      // Navigate to product detail screen
      router.push('/screens/ProductInfoScreen');
    } catch (error) {
      console.error('❌ Error storing product in AsyncStorage:', error);
    }
  };

  const getDefaultEmoji = (product: Product): string => {
    if (!product) return '🍽️';
    
    const name = (product.product_name || '').toLowerCase();
    const ingredients = (product.ingredients_text || '').toLowerCase();

    if (name.includes('null') || ingredients.includes('hafer')) return '';

    return '🍽️';
  };

  const handleBack = () => {
    router.back();
  };

  // 🆕 COMPONENTE DE IMAGEN CON CACHE
  const ProductImageWithCache: React.FC<{ product: ProductWithImage }> = ({ product }) => {
    if (product.imageLoading) {
      return (
        <View style={[styles.productImageContainer, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="small" color="#007AFF" />
        </View>
      );
    }

    if (product.imageUri && !product.imageError) {
      return (
        <View style={styles.productImageContainer}>
          <Image
            source={{ uri: product.imageUri }}
            style={styles.productImage}
            resizeMode="cover"
            onError={() => {
              console.log(`❌ [CategoryList] Error loading cached image for ${product.code}`);
            }}
          />
        </View>
      );
    }

    // Fallback al placeholder si no hay imagen o hay error
    return (
      <View style={styles.productImageContainer}>
        <View style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#f0f0f0',
          borderRadius: 12,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: '#e0e0e0'
        }}>
          <MaterialCommunityIcons 
            name="image" 
            size={32} 
            color="#c0c0c0" 
          />
        </View>
      </View>
    );
  };

  // 🔧 DEBUG: Show cache info in development
  useEffect(() => {
    if (__DEV__) {
      console.log('🐛 CATEGORY SCREEN DEBUG:');
      console.log('- Category:', category);
      console.log('- Brand:', brand);
      console.log('- Total sampleProducts:', sampleProducts.length);
      
      // Count different types of products
      const sssProducts = sampleProducts.filter(p => p && String(p.code).startsWith('SSS'));
      const apiProducts = sampleProducts.filter(p => p && !String(p.code).startsWith('SSS'));
      
      console.log('- SSS Products (Local):', sssProducts.length);
      console.log('- API Products (External):', apiProducts.length);
      
      // Show some examples of each type
      if (sssProducts.length > 0) {
        console.log('📝 Sample SSS Products:');
        sssProducts.slice(0, 3).forEach(p => {
          console.log(`  - ${p.code}: ${p.product_name} (${p.brands})`);
        });
      }
      
      if (apiProducts.length > 0) {
        console.log('📝 Sample API Products (will be filtered out):');
        apiProducts.slice(0, 3).forEach(p => {
          console.log(`  - ${p.code}: ${p.product_name} (${p.brands})`);
        });
      }
    }
  }, [category, brand]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#000" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{category} Products</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#000" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{category} Products</Text>
      </View>

      {products.length > 0 ? (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.code)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.productItem}
              onPress={() => handleProductPress(item)}
            >
              {/* 🆕 USAR COMPONENTE DE IMAGEN CON CACHE */}
              <ProductImageWithCache product={item} />
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.product_name || 'Unknown Product'}</Text>
                <Text style={styles.productBrand}>{item.brands || 'Unknown Brand'}</Text>
              </View>
              <Text style={styles.arrowIcon}>›</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No organic {category?.toString()} products found</Text>
          <Text style={styles.emptySubtext}>
            Products for this category will appear here once added.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}