// Updated SearchComponent.tsx with fix for style error
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sampleProducts } from '../../data/productData';
import { searchStyles } from '../../styles/HomeComponentStyles';
import { ApiService } from '../../services/api';

interface SearchComponentProps {
  onFocusChange: (focused: boolean) => void;
}

export default function SearchComponent({ onFocusChange }: SearchComponentProps) {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<typeof sampleProducts>([]);
  const [historyItems, setHistoryItems] = useState<typeof sampleProducts>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Fetch history only when component mounts
  useEffect(() => {
    if (!initialLoadDone) {
      fetchHistoryItems();
      setInitialLoadDone(true);
    }
  }, [initialLoadDone]);

  const fetchHistoryItems = async () => {
    setLoadingHistory(true);
    try {
      // Fetch the history from API
      const historyResponse = await ApiService.fetch('/history?limit=2');
      
      if (historyResponse && historyResponse.length > 0) {
        // Get the 2 most recent items
        const recentHistoryItems = historyResponse
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 2);
          
        // Find corresponding products from sample data
        const historyProducts = recentHistoryItems
          .map((itemID: any) => {
            const itemId = itemID;
            return sampleProducts.find(product => product.code === itemId);
          })
          .filter(Boolean); // Filter out undefined values
        
        setHistoryItems(historyProducts);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Function to handle search
  const handleSearch = (text: string) => {
    setSearchText(text);

    if (text.trim() === '') {
      // When search is cleared, show history items
      setSearchResults([]);
    } else {
      const filtered = sampleProducts.filter(product =>
        product.product_name.toLowerCase().includes(text.toLowerCase()) ||
        product.brands.toLowerCase().includes(text.toLowerCase()) ||
        product.ingredients_text.toLowerCase().includes(text.toLowerCase())
      );

      setSearchResults(filtered.slice(0, 15)); // Show only up to 15 results
    }
  };

  const getDefaultEmoji = (product: typeof sampleProducts[0]): string => {
    const name = product.product_name.toLowerCase();
    const ingredients = product.ingredients_text.toLowerCase();

    if (name.includes('peanut') || ingredients.includes('peanut')) return '🥜';
    if (name.includes('hafer') || ingredients.includes('hafer')) return '🌾';
    if (name.includes('milk') || name.includes('dairy')) return '🥛';
    if (name.includes('fruit') || name.includes('apple')) return '🍎';
    if (name.includes('vegetable') || name.includes('carrot')) return '🥦';

    return '🍽️';
  };

  const handleProductPress = async (product: typeof sampleProducts[0]) => {
    try {
      // Store the selected product in AsyncStorage
      await AsyncStorage.setItem('selectedProduct', JSON.stringify(product));
      
      // Save to history database
      try {
        await ApiService.fetch('/history', {
          method: 'POST',
          body: JSON.stringify({
            itemID: product.code, 
          })
        });
      } catch (historyError) {
        console.error('Error saving to history:', historyError);
      }
      
      // Navigate to product detail screen
      router.push('/screens/ProductInfoScreen');
    } catch (error) {
      console.error('Error storing product in AsyncStorage:', error);
    }
  };

  // Function to render a product item
  const renderProductItem = (product: typeof sampleProducts[0]) => (
    <TouchableOpacity
      key={product.code}
      style={searchStyles.productItem}
      onPress={() => handleProductPress(product)}
    >
      <View style={searchStyles.productImageContainer}>
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            style={searchStyles.productImage}
            resizeMode="cover"
          />
        ) : (
          <Text style={searchStyles.productEmoji}>{getDefaultEmoji(product)}</Text>
        )}
      </View>
      <View style={searchStyles.productInfo}>
        <Text style={searchStyles.productName}>{product.product_name}</Text>
        <Text style={searchStyles.productBrand}>{product.brands}</Text>
      </View>
      <Text style={searchStyles.arrowIcon}>›</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <View style={searchStyles.searchContainer}>
        <TextInput
          style={searchStyles.searchInput}
          placeholder="Search"
          value={searchText}
          onChangeText={handleSearch}
          onFocus={() => onFocusChange(true)}
          onBlur={() => {
            if (!searchText) {
              onFocusChange(false);
            }
          }}
        />
        {searchText ? (
          <TouchableOpacity
            style={searchStyles.clearButton}
            onPress={() => {
              handleSearch('');
              onFocusChange(false);
            }}
          >
            <Text style={searchStyles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={searchStyles.resultsContainer}>
        <Text style={searchStyles.sectionTitle}>
          {searchText ? 'Search Results' : 'History'}
        </Text>

        {searchText && searchResults.length > 0 ? (
          // Show search results
          <>
            {searchResults.map(product => renderProductItem(product))}
          </>
        ) : searchText && searchResults.length === 0 ? (
          // No search results found
          <View style={searchStyles.noResultsContainer}>
            <Text style={searchStyles.noResultsText}>No products found for "{searchText}"</Text>
            <Text style={searchStyles.noResultsSubtext}>Try a different search term</Text>
          </View>
        ) : loadingHistory ? (
          // Loading history - using noResultsContainer style instead of loadingContainer
          <View style={searchStyles.noResultsContainer}>
            <ActivityIndicator size="small" color="#000000" />
          </View>
        ) : historyItems.length > 0 ? (
          // Show history items
          <>
            {historyItems.map(product => renderProductItem(product))}
          </>
        ) : (
          // No history items
          <View style={searchStyles.noResultsContainer}>
            <Text style={searchStyles.noResultsText}>No recent products viewed</Text>
            <Text style={searchStyles.noResultsSubtext}>Products you view will appear here</Text>
          </View>
        )}
      </View>
    </>
  );
}