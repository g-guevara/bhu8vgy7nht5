// app/screens/WishlistScreen.tsx - CORREGIDO CON CACHE DE IMÁGENES
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { styles } from '../styles/WishlistStyles';
import { ApiService } from '../services/api';
import { useToast } from '../utils/ToastContext';
import { sampleProducts } from '../data/productData';
// 🆕 IMPORTAR EL SISTEMA DE CACHE DE IMÁGENES
import { imageCacheUtils } from '../utils/imageCacheUtils';

// Define interfaces for our data
interface WishlistItem {
  _id: string;
  userID: string;
  productID: string;
  addedAt: string;
}

interface Product {
  code: string;
  product_name: string;
  brands: string;
  image_url?: string; // 🔧 Hacer opcional para compatibilidad
  ingredients_text: string;
}

// 🆕 INTERFAZ EXTENDIDA PARA PRODUCTOS CON CACHE DE IMÁGENES
interface ProductWithImage extends Product {
  imageUri?: string | null;
  imageLoading?: boolean;
  imageError?: boolean;
}

export default function WishlistScreen() {
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 🆕 CAMBIAR TIPO DE ESTADO PARA INCLUIR IMAGEN CACHE
  const [wishlistProducts, setWishlistProducts] = useState<ProductWithImage[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductWithImage[]>([]);
  const { showToast } = useToast();
  const router = useRouter();

  // Get default emoji for product without image
  const getDefaultEmoji = (product: Product): string => {
    const name = (product.product_name || '').toLowerCase();
    const ingredients = (product.ingredients_text || '').toLowerCase();
    return '';
  };

  // 🆕 FUNCIÓN PARA CARGAR IMÁGENES DESDE CACHE
  const loadImagesForProducts = async (products: ProductWithImage[]) => {
    console.log(`🖼️ [Wishlist] Cargando imágenes para ${products.length} productos...`);
    
    // Procesar productos con un pequeño delay para evitar sobrecarga
    for (let i = 0; i < products.length; i++) {
      setTimeout(() => loadProductImage(products[i]), i * 100);
    }
  };

  // 🆕 FUNCIÓN PARA CARGAR IMAGEN DE UN PRODUCTO ESPECÍFICO
  const loadProductImage = async (product: ProductWithImage) => {
    try {
      // Marcar como cargando
      setWishlistProducts(prevProducts => 
        prevProducts.map(p => 
          p.code === product.code ? { ...p, imageLoading: true, imageError: false } : p
        )
      );
      setFilteredProducts(prevProducts => 
        prevProducts.map(p => 
          p.code === product.code ? { ...p, imageLoading: true, imageError: false } : p
        )
      );

      console.log(`🔍 [Wishlist] Buscando imagen para producto: ${product.code}`);
      
      // ⏱️ TIMEOUT DE 30 SEGUNDOS
      const timeoutPromise = new Promise<string | null>((_, reject) => {
        setTimeout(() => reject(new Error('Image timeout')), 30000);
      });
      
      const imagePromise = imageCacheUtils.getProductImage(product.code);
      
      // Race entre la imagen y el timeout
      const imageUri = await Promise.race([imagePromise, timeoutPromise]);
      
      // Actualizar ambos estados con la imagen obtenida
      const updateFunction = (prevProducts: ProductWithImage[]) => 
        prevProducts.map(p => 
          p.code === product.code ? { 
            ...p, 
            imageUri, 
            imageLoading: false, 
            imageError: !imageUri 
          } : p
        );

      setWishlistProducts(updateFunction);
      setFilteredProducts(updateFunction);

      if (imageUri) {
        console.log(`✅ [Wishlist] Imagen cargada para producto: ${product.code}`);
      } else {
        console.log(`❌ [Wishlist] No se encontró imagen para producto: ${product.code}`);
      }
    } catch (error) {
      console.error(`❌ [Wishlist] Error cargando imagen para producto ${product.code}:`, error);
      
      // Actualizar estado con error
      const updateFunction = (prevProducts: ProductWithImage[]) => 
        prevProducts.map(p => 
          p.code === product.code ? { ...p, imageLoading: false, imageError: true } : p
        );

      setWishlistProducts(updateFunction);
      setFilteredProducts(updateFunction);
    }
  };

  // Función para obtener la wishlist
  const fetchWishlist = useCallback(async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) {
      setLoading(true);
    }
    setError(null);
    
    try {
      console.log('[Wishlist] Fetching wishlist...');
      
      // Get wishlist items from API
      const wishlistItems = await ApiService.getWishlist();
      console.log('[Wishlist] Received items:', wishlistItems.length);
      
      // Map product IDs from wishlist
      const productIDs = wishlistItems.map((item: WishlistItem) => item.productID);
      
      // Find corresponding products from sample data
      const products = sampleProducts.filter(product => 
        productIDs.includes(product.code)
      );
      
      console.log('[Wishlist] Filtered products:', products.length);
      
      // 🆕 CONVERTIR A PRODUCTOS CON CACHE DE IMÁGENES
      const productsWithImageState: ProductWithImage[] = products.map(product => ({
        ...product,
        imageUri: null,
        imageLoading: false,
        imageError: false
      }));
      
      setWishlistProducts(productsWithImageState);
      
      // Apply current search filter if any
      if (searchText) {
        const filtered = productsWithImageState.filter(product => 
          product.product_name.toLowerCase().includes(searchText.toLowerCase()) ||
          product.brands.toLowerCase().includes(searchText.toLowerCase())
        );
        setFilteredProducts(filtered);
      } else {
        setFilteredProducts(productsWithImageState);
      }
      
      // 🆕 CARGAR IMÁGENES DESPUÉS DE CONFIGURAR LOS PRODUCTOS
      if (productsWithImageState.length > 0) {
        console.log(`🚀 [Wishlist] Iniciando carga de imágenes para ${productsWithImageState.length} productos`);
        loadImagesForProducts(productsWithImageState);
      }
      
    } catch (error: any) {
      console.error('Error fetching wishlist:', error);
      setError(error.message || 'Failed to load wishlist');
      if (showLoadingIndicator) {
        showToast('Failed to load wishlist', 'error');
      }
    } finally {
      if (showLoadingIndicator) {
        setLoading(false);
      }
    }
  }, [searchText]);

  // Fetch wishlist on component mount
  useEffect(() => {
    fetchWishlist();
  }, []);

  // 🔥 SOLUCIÓN PRINCIPAL: Actualizar cuando la pantalla recibe foco
  useFocusEffect(
    useCallback(() => {
      console.log('[Wishlist] Screen focused, refreshing wishlist...');
      // Solo actualizar si no estamos ya cargando
      if (!loading) {
        fetchWishlist(false); // No mostrar loading indicator
      }
    }, [fetchWishlist, loading])
  );

  // 🔥 SOLUCIÓN ADICIONAL: Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchWishlist(false);
    setRefreshing(false);
    showToast('Wishlist updated', 'success');
  }, [fetchWishlist]);

  const handleSearch = useCallback((text: string) => {
    setSearchText(text);
    if (text) {
      const filtered = wishlistProducts.filter(product => 
        product.product_name.toLowerCase().includes(text.toLowerCase()) ||
        product.brands.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(wishlistProducts);
    }
  }, [wishlistProducts]);

  const handleProductPress = async (product: Product) => {
    try {
      // Store the selected product in AsyncStorage
      await AsyncStorage.setItem('selectedProduct', JSON.stringify(product));
      
      // Navigate to product detail screen
      router.push('/screens/ProductInfoScreen');
    } catch (error) {
      console.error('Error navigating to product:', error);
      showToast('Error opening product details', 'error');
    }
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
              console.log(`❌ [Wishlist] Error loading cached image for ${product.code}`);
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

  const renderProduct = ({ item }: { item: ProductWithImage }) => (
    <TouchableOpacity
      key={item.code}
      style={styles.productItem}
      onPress={() => handleProductPress(item)}
    >
      {/* 🆕 USAR COMPONENTE DE IMAGEN CON CACHE */}
      <ProductImageWithCache product={item} />
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.product_name}</Text>
        <Text style={styles.productBrand}>{item.brands}</Text>
      </View>
      <Text style={styles.arrowIcon}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerText}>Wishlist</Text>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          value={searchText}
          onChangeText={handleSearch}
        />
        {searchText ? (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => handleSearch('')}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={{ marginTop: 10, color: '#666' }}>Loading wishlist...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => fetchWishlist()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchText ? 'No products found matching your search' : 'Your wishlist is empty'}
          </Text>
          {searchText ? (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Text style={styles.clearSearchText}>Clear search</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.emptySubtext}>
              Products you add to your wishlist will appear here
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={item => item.code}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
              title="Pull to refresh"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}