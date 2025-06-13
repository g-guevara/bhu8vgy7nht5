// app/screens/CategoryListScreen.tsx - Actualizado para usar MongoDB API
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
import { ApiService, Product } from '../services/api';
import { styles } from '../styles/CategoryListStyles';

export default function CategoryListScreen() {
  const router = useRouter();
  const { category, brand } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log(`🔍 Loading products for category: ${category}, brand: ${brand}`);
        
        if (!brand) {
          throw new Error('Brand parameter is required');
        }
        
        // Usar la nueva API de productos desde MongoDB
        // El parámetro 'organic=true' filtrará productos que empiecen con "SSS"
        const filteredProducts = await ApiService.getProductsByCategory(
          brand.toString(), 
          true // organic = true para filtrar productos que empiecen con "SSS"
        );
        
        console.log(`📊 Found ${filteredProducts.length} products for brand: ${brand}`);
        
        setProducts(filteredProducts);
      } catch (error: any) {
        console.error('Error loading products:', error);
        setError(error.message || 'Error loading products');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [brand, category]);

  const handleProductPress = async (product: Product) => {
    try {
      console.log(`🎯 Product selected: ${product.product_name} (${product.code})`);
      
      // Store the selected product in AsyncStorage
      await AsyncStorage.setItem('selectedProduct', JSON.stringify(product));
      
      // Navigate to product detail screen
      router.push('/screens/ProductInfoScreen');
    } catch (error) {
      console.error('Error storing product in AsyncStorage:', error);
    }
  };

  const getDefaultEmoji = (product: Product): string => {
    const name = product.product_name.toLowerCase();
    const ingredients = product.ingredients_text.toLowerCase();

    // Mapeo específico de productos según el contenido
    if (name.includes('fruit') || name.includes('pomme') || name.includes('banane')) return '🍎';
    if (name.includes('chocolate') || name.includes('chocolat')) return '🍫';
    if (name.includes('lait') || name.includes('milk') || name.includes('yaourt')) return '🥛';
    if (name.includes('fromage') || name.includes('cheese') || name.includes('mozzarella')) return '🧀';
    if (name.includes('pain') || name.includes('bread') || name.includes('céréales')) return '🍞';
    if (name.includes('poulet') || name.includes('chicken') || name.includes('jambon')) return '🍗';
    if (name.includes('poisson') || name.includes('fish') || name.includes('saumon')) return '🐟';
    if (name.includes('légume') || name.includes('vegetable') || name.includes('tomate') || name.includes('salade')) return '🥗';
    if (name.includes('boisson') || name.includes('drink') || name.includes('soda') || name.includes('jus')) return '🥤';
    if (name.includes('eau') || name.includes('water')) return '💧';
    
    // Mapeo por categoría/marca
    const brandLower = brand?.toString().toLowerCase() || '';
    if (brandLower.includes('dairy')) return '🥛';
    if (brandLower.includes('fruit')) return '🍎';
    if (brandLower.includes('grain')) return '🌾';
    if (brandLower.includes('meat')) return '🍖';
    if (brandLower.includes('nut')) return '🥜';
    if (brandLower.includes('seafood')) return '🐟';
    if (brandLower.includes('vegetable')) return '🥬';
    if (brandLower.includes('legume')) return '🫘';

    return '🍽️';
  };

  const handleBack = () => {
    router.back();
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productItem}
      onPress={() => handleProductPress(item)}
    >
      <View style={styles.productImageContainer}>
        <Text style={styles.productEmoji}>{getDefaultEmoji(item)}</Text>
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.product_name}
        </Text>
        <Text style={styles.productBrand}>
          {item.brands || 'Sin marca'}
        </Text>
      </View>
      <Text style={styles.arrowIcon}>›</Text>
    </TouchableOpacity>
  );

  const renderLoadingState = () => (
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
        <Text style={{ marginTop: 15, color: '#666' }}>
          Loading {category} products...
        </Text>
      </View>
    </SafeAreaView>
  );

  const renderErrorState = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#007AFF" />
          <Text style={styles.backText}>Home</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{category} Products</Text>
      </View>
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: '#FF3B30' }]}>
          Error loading products
        </Text>
        <Text style={{ color: '#666', textAlign: 'center', marginTop: 10 }}>
          {error}
        </Text>
        <TouchableOpacity 
          onPress={() => {
            // Retry loading
            const loadProducts = async () => {
              setLoading(true);
              setError(null);
              
              try {
                const filteredProducts = await ApiService.getProductsByCategory(
                  brand?.toString() || '', 
                  true
                );
                setProducts(filteredProducts);
              } catch (error: any) {
                console.error('Error loading products:', error);
                setError(error.message || 'Error loading products');
              } finally {
                setLoading(false);
              }
            };
            loadProducts();
          }}
          style={{
            marginTop: 20,
            backgroundColor: '#007AFF',
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 8
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  if (loading) {
    return renderLoadingState();
  }

  if (error) {
    return renderErrorState();
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#007AFF" />
          <Text style={styles.backText}>Home</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {category} Products ({products.length})
        </Text>
      </View>

      {products.length > 0 ? (
        <FlatList
          data={products}
          keyExtractor={(item) => item.code}
          renderItem={renderProduct}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={true}
          ListHeaderComponent={() => (
            <View style={{ paddingBottom: 10 }}>
              <Text style={{ 
                fontSize: 14, 
                color: '#666', 
                textAlign: 'center',
                fontStyle: 'italic'
              }}>
                Showing organic {category?.toString().toLowerCase()} products
              </Text>
            </View>
          )}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No organic {category?.toString()} products found
          </Text>
          <Text style={{ 
            fontSize: 14, 
            color: '#999', 
            textAlign: 'center', 
            marginTop: 10,
            paddingHorizontal: 20
          }}>
            This might be because there are no products with brand "{brand}" in our database,
            or they don't meet the organic criteria (code starting with "SSS").
          </Text>
          <TouchableOpacity 
            onPress={handleBack}
            style={{
              marginTop: 20,
              backgroundColor: '#007AFF',
              paddingVertical: 12,
              paddingHorizontal: 20,
              borderRadius: 8
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}