// app/screens/WishlistScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../styles/WishlistStyles';
import { ApiService } from '../services/api';
import { useToast } from '../utils/ToastContext';
import { sampleProducts } from '../data/productData';

// Define interfaces for our data
interface WishlistItem {
  _id: string;
  userID: string;
  productID: string;
  addedAt: string;
}

interface WishlistProductItem {
  id: string;
  name: string;
  category: string;
  image: string;
  backgroundColor: string;
  productID: string;
}

// Color mapping for different categories
const categoryColors: Record<string, string> = {
  'Seafood': '#e1f0ff',
  'Fruits': '#fff7e6',
  'Vegetables': '#e6f7f0',
  'Dairy': '#f0e6ff',
  'Grains': '#ffe6e6',
  'Nuts': '#e6ffe6',
  'Legumes': '#fff0e6',
  'Meat': '#ffefe6',
  'Default': '#f2f2f2'
};

// Emoji mapping for different categories
const categoryEmojis: Record<string, string> = {
  'Seafood': '🐟',
  'Fruits': '🍎',
  'Vegetables': '🥦',
  'Dairy': '🥛',
  'Grains': '🌾',
  'Nuts': '🥜',
  'Legumes': '🌱',
  'Meat': '🥩',
  'Default': '🍽️'
};

export default function WishlistScreen() {
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wishlistData, setWishlistData] = useState<WishlistProductItem[]>([]);
  const [filteredData, setFilteredData] = useState<WishlistProductItem[]>([]);
  const { showToast } = useToast();
  const router = useRouter();

  // Helper function to determine the category
  const getCategoryFromProduct = (product: any): string => {
    const name = (product.product_name || '').toLowerCase();
    const ingredients = (product.ingredients_text || '').toLowerCase();

    if (name.includes('fish') || name.includes('tuna') || ingredients.includes('fish')) return 'Seafood';
    if (name.includes('apple') || name.includes('banana') || name.includes('fruit')) return 'Fruits';
    if (name.includes('carrot') || name.includes('vegetable')) return 'Vegetables';
    if (name.includes('milk') || name.includes('cheese') || name.includes('yogurt')) return 'Dairy';
    if (name.includes('wheat') || name.includes('rice') || name.includes('cereal')) return 'Grains';
    if (name.includes('peanut') || name.includes('almond')) return 'Nuts';
    if (name.includes('bean') || name.includes('lentil')) return 'Legumes';
    if (name.includes('beef') || name.includes('chicken') || name.includes('pork')) return 'Meat';
    
    return 'Default';
  };

  // Fetch wishlist data
  useEffect(() => {
    const fetchWishlist = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Get wishlist items from API
        const wishlistItems = await ApiService.getWishlist();
        
        // Convert wishlist items to displayable format
        const productsMap = new Map();
        
        // Use sample products as a fallback - in a real app, you'd fetch product details
        // from your API based on the productIDs in the wishlist
        sampleProducts.forEach(product => {
          productsMap.set(product.code, product);
        });
        
        const enrichedItems: WishlistProductItem[] = wishlistItems.map((item: WishlistItem) => {
          // Try to find product details from our sample data
          // In a production app, you might need to fetch these details from an API
          const productDetails = productsMap.get(item.productID) || {
            product_name: 'Unknown Product',
            code: item.productID
          };
          
          const category = getCategoryFromProduct(productDetails);
          
          return {
            id: item._id,
            name: productDetails.product_name || 'Unknown Product',
            category: category,
            image: categoryEmojis[category] || '🍽️',
            backgroundColor: categoryColors[category] || '#f2f2f2',
            productID: item.productID
          };
        });
        
        setWishlistData(enrichedItems);
        setFilteredData(enrichedItems);
      } catch (error: any) {
        console.error('Error fetching wishlist:', error);
        setError(error.message || 'Failed to load wishlist');
        showToast('Failed to load wishlist', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchWishlist();
  }, []);

  const handleSearch = (text: string) => {
    setSearchText(text);
    if (text) {
      const filtered = wishlistData.filter(item => 
        item.name.toLowerCase().includes(text.toLowerCase()) ||
        item.category.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredData(filtered);
    } else {
      setFilteredData(wishlistData);
    }
  };

  const handleItemPress = async (item: WishlistProductItem) => {
    try {
      // Find the full product in sample data
      const product = sampleProducts.find(p => p.code === item.productID);
      
      if (product) {
        // Store the selected product in AsyncStorage
        await AsyncStorage.setItem('selectedProduct', JSON.stringify(product));
        
        // Navigate to product detail screen
        router.push('/screens/ProductInfoScreen');
      } else {
        showToast('Product details not found', 'error');
      }
    } catch (error) {
      console.error('Error navigating to product:', error);
      showToast('Error opening product details', 'error');
    }
  };

  const renderItem = ({ item }: { item: WishlistProductItem }) => (
    <TouchableOpacity 
      style={styles.itemContainer}
      onPress={() => handleItemPress(item)}
    >
      <View style={[styles.imageContainer, { backgroundColor: item.backgroundColor }]}>
        <Text style={styles.itemEmoji}>{item.image}</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemCategory}>{item.category}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerText}>Wishlist</Text>
      
      <View style={styles.searchContainer}>
        <View style={styles.searchIcon}>
          <Text style={styles.searchIconText}>🔍</Text>
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={handleSearch}
        />
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
            onPress={() => setLoading(true)} // This will trigger the useEffect again
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredData.length === 0 ? (
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
          data={filteredData}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}