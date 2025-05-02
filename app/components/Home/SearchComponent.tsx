// Updated SearchComponent.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sampleProducts } from '../../data/productData';
import { searchStyles } from '../../styles/HomeComponentStyles';

interface SearchComponentProps {
  onFocusChange: (focused: boolean) => void;
}

export default function SearchComponent({ onFocusChange }: SearchComponentProps) {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState(sampleProducts.slice(0, 2));

  // Function to handle search
  const handleSearch = (text: string) => {
    setSearchText(text);

    if (text.trim() === '') {
      setSearchResults(sampleProducts.slice(0, 2));
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

    return '🍽️';
  };

  const handleProductPress = async (product: typeof sampleProducts[0]) => {
    try {
      // Store the selected product in AsyncStorage
      await AsyncStorage.setItem('selectedProduct', JSON.stringify(product));
      
      // Navigate to product detail screen
      router.push('/screens/ProductInfoScreen');
    } catch (error) {
      console.error('Error storing product in AsyncStorage:', error);
    }
  };

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

        {searchResults.length > 0 ? (
          <>
            {searchResults.map(product => (
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
            ))}
          </>
        ) : (
          <View style={searchStyles.noResultsContainer}>
            <Text style={searchStyles.noResultsText}>No products found for "{searchText}"</Text>
            <Text style={searchStyles.noResultsSubtext}>Try a different search term</Text>
          </View>
        )}
      </View>
    </>
  );
}