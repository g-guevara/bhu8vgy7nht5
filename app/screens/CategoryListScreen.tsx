// app/screens/CategoryListScreen.tsx - FINAL FIX: Handle mixed API and local products
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
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sampleProducts } from '../data/productData';
import { styles } from '../styles/CategoryListStyles';

// Define the Product interface if not imported
interface Product {
  code: string;
  product_name: string;
  brands: string;
  ingredients_text: string;
  image_url?: string;
}

export default function CategoryListScreen() {
  const router = useRouter();
  const { category, brand } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);

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
        
        setProducts(filteredProducts);
      } catch (error) {
        console.error('❌ Error filtering products:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [brand]);

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
            <Ionicons name="chevron-back" size={28} color="#007AFF" />
            <Text style={styles.backText}>Home</Text>
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
          <Ionicons name="chevron-back" size={28} color="#007AFF" />
          <Text style={styles.backText}>Home</Text>
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
              <View style={styles.productImageContainer}>
                {item.image_url ? (
                  <Image
                    source={{ uri: item.image_url }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.productEmoji}>{getDefaultEmoji(item)}</Text>
                )}
              </View>
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