// app/screens/ReactionsScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity,
  Image,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../styles/ReactionStyles';
import { ApiService } from '../services/api';
import { sampleProducts } from '../data/productData';
import { useToast } from '../utils/ToastContext';

type TabName = 'All' | 'Organic' | 'Product' | 'Ing';

interface ProductReaction {
  _id: string;
  userID: string;
  productID: string;
  reaction: 'Critic' | 'Sensitive' | 'Safe';
  createdAt: string;
  updatedAt: string;
}

interface Product {
  code: string;
  product_name: string;
  brands: string;
  ingredients_text: string;
  image_url?: string;
}

interface ProductWithReaction extends Product {
  reaction: 'Critic' | 'Sensitive' | 'Safe';
  isOrganic: boolean;
}

export default function ReactionsScreen() {
  const [activeTab, setActiveTab] = useState<TabName>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productReactions, setProductReactions] = useState<ProductWithReaction[]>([]);
  const { showToast } = useToast();
  const router = useRouter();
  
  // Fetch product reactions when component mounts
  useEffect(() => {
    fetchProductReactions();
  }, []);

  const fetchProductReactions = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get product reactions from API
      const reactions = await ApiService.getProductReactions();
      
      // Map reactions to products
      const productsWithReactions: ProductWithReaction[] = [];
      
      for (const reaction of reactions) {
        // Find the product in sampleProducts using the productID
        const product = sampleProducts.find(p => p.code === reaction.productID);
        
        if (product) {
          productsWithReactions.push({
            ...product,
            reaction: reaction.reaction,
            isOrganic: product.code.startsWith('SSS')
          });
        }
      }
      
      setProductReactions(productsWithReactions);
    } catch (error: any) {
      console.error('Error fetching product reactions:', error);
      setError(error.message || 'Failed to load reactions');
      showToast('Failed to load reactions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTabPress = (tabName: TabName): void => {
    setActiveTab(tabName);
  };

  const getFilteredProducts = (): ProductWithReaction[] => {
    switch (activeTab) {
      case 'Organic':
        return productReactions.filter(product => product.isOrganic);
      case 'Product':
        return productReactions.filter(product => !product.isOrganic);
      case 'Ing':
        // For ingredients tab - this would need additional logic
        // For now, return empty array as it's not fully specified
        return [];
      default: // 'All'
        return productReactions;
    }
  };

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

  const getDefaultEmoji = (product: ProductWithReaction): string => {
    const name = product.product_name.toLowerCase();
    const ingredients = product.ingredients_text.toLowerCase();

    if (name.includes('peanut') || ingredients.includes('peanut')) return '🥜';
    if (name.includes('hafer') || ingredients.includes('hafer')) return '🌾';
    if (name.includes('milk') || name.includes('dairy')) return '🥛';
    if (name.includes('fruit') || name.includes('apple')) return '🍎';
    if (name.includes('vegetable') || name.includes('carrot')) return '🥦';
    if (name.includes('fish') || name.includes('tuna')) return '🐟';
    if (name.includes('meat') || name.includes('beef')) return '🥩';
    if (name.includes('onion')) return '🧅';
    if (name.includes('wheat')) return '🌾';

    return '🍽️';
  };

  const groupProductsByReaction = (products: ProductWithReaction[]) => {
    const grouped = {
      Critic: [] as ProductWithReaction[],
      Sensitive: [] as ProductWithReaction[],
      Safe: [] as ProductWithReaction[]
    };
    
    products.forEach(product => {
      if (product.reaction in grouped) {
        grouped[product.reaction].push(product);
      }
    });
    
    return grouped;
  };

  const filteredProducts = getFilteredProducts();
  const groupedProducts = groupProductsByReaction(filteredProducts);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerText}>Reactions</Text>
      
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[
            styles.tabButton, 
            activeTab === 'All' && styles.activeTabButton
          ]}
          onPress={() => handleTabPress('All')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'All' && styles.activeTabText
          ]}>All</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.tabButton, 
            activeTab === 'Organic' && styles.activeTabButton
          ]}
          onPress={() => handleTabPress('Organic')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'Organic' && styles.activeTabText
          ]}>Organic</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.tabButton, 
            activeTab === 'Product' && styles.activeTabButton
          ]}
          onPress={() => handleTabPress('Product')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'Product' && styles.activeTabText
          ]}>Product</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.tabButton, 
            activeTab === 'Ing' && styles.activeTabButton
          ]}
          onPress={() => handleTabPress('Ing')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'Ing' && styles.activeTabText
          ]}>Ing</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchProductReactions}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          {/* Critic Section */}
          {groupedProducts.Critic.length > 0 && (
            <View style={styles.reactionSection}>
              <View style={styles.reactionHeader}>
                <View style={[styles.reactionIndicator, styles.criticIndicator]} />
                <Text style={styles.reactionType}>Critic</Text>
              </View>
              
              {groupedProducts.Critic.map((product) => (
                <TouchableOpacity 
                  key={product.code} 
                  style={styles.foodItem}
                  onPress={() => handleProductPress(product)}
                >
                  <View style={styles.foodImagePlaceholder}>
                    {product.image_url ? (
                      <Image
                        source={{ uri: product.image_url }}
                        style={styles.foodImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.foodEmoji}>{getDefaultEmoji(product)}</Text>
                    )}
                  </View>
                  <View style={styles.foodInfo}>
                    <Text style={styles.foodName}>{product.product_name}</Text>
                    <Text style={styles.foodCategory}>{product.brands}</Text>
                  </View>
                  <Text style={styles.arrowIcon}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          {/* Sensitive Section */}
          {groupedProducts.Sensitive.length > 0 && (
            <View style={styles.reactionSection}>
              <View style={styles.reactionHeader}>
                <View style={[styles.reactionIndicator, styles.sensitivIndicator]} />
                <Text style={styles.reactionType}>Sensitiv</Text>
              </View>
              
              {groupedProducts.Sensitive.map((product) => (
                <TouchableOpacity 
                  key={product.code}
                  style={styles.foodItem}
                  onPress={() => handleProductPress(product)}
                >
                  <View style={styles.foodImagePlaceholder}>
                    {product.image_url ? (
                      <Image
                        source={{ uri: product.image_url }}
                        style={styles.foodImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.foodEmoji}>{getDefaultEmoji(product)}</Text>
                    )}
                  </View>
                  <View style={styles.foodInfo}>
                    <Text style={styles.foodName}>{product.product_name}</Text>
                    <Text style={styles.foodCategory}>{product.brands}</Text>
                  </View>
                  <Text style={styles.arrowIcon}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          {/* Safe Section */}
          {groupedProducts.Safe.length > 0 && (
            <View style={styles.reactionSection}>
              <View style={styles.reactionHeader}>
                <View style={[styles.reactionIndicator, styles.safeIndicator]} />
                <Text style={styles.reactionType}>Safe</Text>
              </View>
              
              {groupedProducts.Safe.map((product) => (
                <TouchableOpacity 
                  key={product.code}
                  style={styles.foodItem}
                  onPress={() => handleProductPress(product)}
                >
                  <View style={styles.foodImagePlaceholder}>
                    {product.image_url ? (
                      <Image
                        source={{ uri: product.image_url }}
                        style={styles.foodImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.foodEmoji}>{getDefaultEmoji(product)}</Text>
                    )}
                  </View>
                  <View style={styles.foodInfo}>
                    <Text style={styles.foodName}>{product.product_name}</Text>
                    <Text style={styles.foodCategory}>{product.brands}</Text>
                  </View>
                  <Text style={styles.arrowIcon}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          {filteredProducts.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No reactions found</Text>
              <Text style={styles.emptySubtext}>
                Products you mark as Critic, Sensitive, or Safe will appear here
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// Add some additional styles to the imported styles
const additionalStyles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  foodImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  safeIndicator: {
    backgroundColor: '#34C759',
  }
});