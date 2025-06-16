// app/components/Home/SearchComponent.tsx - Componente principal de búsqueda
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { searchStyles } from '../../styles/HomeComponentStyles';
import { 
  searchInSpecificCollection, 
  getCollectionForSearchTerm,
  ProductWithImageAndEmoji 
} from './searchLogic';
import { 
  loadImagesForProducts, 
  ProductImage,
  handleProductPress as handleProductPressUtil
} from './productUtils';

interface SearchComponentProps {
  onFocusChange: (focused: boolean) => void;
}

export default function SearchComponent({ onFocusChange }: SearchComponentProps) {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<ProductWithImageAndEmoji[]>([]);
  const [historyItems, setHistoryItems] = useState<ProductWithImageAndEmoji[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  
  const MAX_HISTORY_ITEMS = 2;
  const HISTORY_KEY = 'product_history';

  useEffect(() => {
    loadHistoryFromStorage();
  }, []);

  const loadHistoryFromStorage = async () => {
    setLoadingHistory(true);
    try {
      const historyJson = await AsyncStorage.getItem(HISTORY_KEY);
      if (historyJson) {
        const historyData = JSON.parse(historyJson);
        
        const historyProducts: ProductWithImageAndEmoji[] = [];
        
        for (const historyItem of historyData.slice(0, MAX_HISTORY_ITEMS)) {
          try {
            // Intentar encontrar el producto usando el mismo sistema
            const collectionInfo = getCollectionForSearchTerm(historyItem.code);
            if (collectionInfo) {
              const response = await fetch(`${collectionInfo.uri}/api/search/code/${historyItem.code}`);
              if (response.ok) {
                const data = await response.json();
                const product = data.results?.[0];
                
                if (product) {
                  historyProducts.push({
                    ...product,
                    emoji: '🍽️',
                    relevanceScore: 1000,
                    imageUri: null,
                    imageLoading: false,
                    imageError: false
                  });
                }
              }
            }
          } catch (error) {
            console.error(`Error loading history item ${historyItem.code}:`, error);
          }
        }
        
        setHistoryItems(historyProducts);
        // Cargar imágenes para items del historial
        loadImagesForProducts(historyProducts, setHistoryItems);
      } else {
        setHistoryItems([]);
      }
    } catch (error) {
      console.error('Error loading history:', error);
      setHistoryItems([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const saveToHistory = async (productCode: string) => {
    try {
      const historyJson = await AsyncStorage.getItem(HISTORY_KEY);
      let historyData = historyJson ? JSON.parse(historyJson) : [];

      historyData = historyData.filter((item: any) => item.code !== productCode);

      const newHistoryItem = {
        code: productCode,
        viewedAt: new Date().toISOString(),
      };
      historyData.unshift(newHistoryItem);

      historyData = historyData.slice(0, MAX_HISTORY_ITEMS);

      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(historyData));
      await loadHistoryFromStorage();
    } catch (error) {
      console.error('Error saving to history:', error);
    }
  };

  const clearHistory = async () => {
    try {
      await AsyncStorage.removeItem(HISTORY_KEY);
      setHistoryItems([]);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  // FUNCIÓN PRINCIPAL DE BÚSQUEDA
  const handleSearch = async () => {
    const searchQuery = searchText.trim();
    
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      console.log(`🔍 Iniciando búsqueda: "${searchQuery}"`);
      
      // Usar la función de búsqueda del archivo searchLogic
      const results = await searchInSpecificCollection(searchQuery);
      
      setSearchResults(results);
      
      console.log(`✅ Búsqueda completada: ${results.length} resultados`);
      
      // Cargar imágenes para los resultados de búsqueda
      if (results.length > 0) {
        loadImagesForProducts(results, setSearchResults);
      }
      
      // Mostrar top 3 para debugging
      if (__DEV__ && results.length > 0) {
        console.log('🏆 Top 3 resultados:');
        results.slice(0, 3).forEach((r: ProductWithImageAndEmoji, i: number) => {
          console.log(`${i+1}. "${r.product_name}" (${r.brands}) - Score: ${r.relevanceScore}`);
        });
      }
      
    } catch (error) {
      console.error('❌ Error en búsqueda:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleProductPress = async (product: ProductWithImageAndEmoji) => {
    await handleProductPressUtil(product, router);
    await saveToHistory(product.code);
  };

  const getCollectionInfo = (query: string) => {
    const info = getCollectionForSearchTerm(query);
    if (!info) return 'No determinada';
    return `DB${info.db} - ${info.collection}`;
  };

  const renderProductClickable = (product: ProductWithImageAndEmoji) => (
    <TouchableOpacity
      key={product.code}
      style={searchStyles.productItem}
      onPress={() => handleProductPress(product)}
    >
      <ProductImage product={product} />
      <View style={searchStyles.productInfo}>
        <Text style={searchStyles.productName} numberOfLines={1} ellipsizeMode="tail">
          {product.product_name}
          {__DEV__ && (
            <Text style={{ color: '#999', fontSize: 12 }}> ({product.relevanceScore})</Text>
          )}
        </Text>
        <Text style={searchStyles.productBrand} numberOfLines={1} ellipsizeMode="tail">
          {product.brands || 'Sin marca'}
        </Text>
      </View>
      <Text style={searchStyles.arrowIcon}>›</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <View style={searchStyles.searchContainer}>
        <TextInput
          style={searchStyles.searchInput}
          placeholder="Search products..."
          value={searchText}
          onChangeText={setSearchText}
          onFocus={() => onFocusChange(true)}
          onBlur={() => {
            if (!searchText) {
              onFocusChange(false);
            }
          }}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        
        {/* BOTÓN DE BÚSQUEDA */}
        <TouchableOpacity
          style={[
            searchStyles.searchButton,
            (!searchText.trim() || searchLoading) && searchStyles.searchButtonDisabled
          ]}
          onPress={handleSearch}
          disabled={!searchText.trim() || searchLoading}
        >
          {searchLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={searchStyles.searchButtonText}>Search</Text>
          )}
        </TouchableOpacity>
        
        {searchText && !searchLoading ? (
          <TouchableOpacity
            style={searchStyles.clearButton}
            onPress={() => {
              setSearchText('');
              setSearchResults([]);
              onFocusChange(false);
            }}
          >
            <Text style={searchStyles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Info de debugging en desarrollo */}
      {__DEV__ && searchText && (
        <View style={{ paddingHorizontal: 20, paddingVertical: 5 }}>
          <Text style={{ fontSize: 12, color: '#666' }}>
            🎯 Colección: {getCollectionInfo(searchText)}
          </Text>
        </View>
      )}

      <View style={searchStyles.resultsContainer}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={searchStyles.sectionTitle}>
            {searchText ? 'Search Results' : 'Recent'}
          </Text>
          {!searchText && historyItems.length > 0 && (
            <TouchableOpacity onPress={clearHistory} style={{ padding: 8 }}>
              <Text style={{ color: '#666', fontSize: 14 }}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {searchLoading ? (
          <View style={searchStyles.noResultsContainer}>
            <ActivityIndicator size="large" color="#000000" />
            <Text style={searchStyles.noResultsSubtext}>
              Searching in {getCollectionInfo(searchText)}...
            </Text>
          </View>
        ) : searchText && searchResults.length > 0 ? (
          <>
            {searchResults.map(product => renderProductClickable(product))}
          </>
        ) : searchText && searchResults.length === 0 ? (
          <View style={searchStyles.noResultsContainer}>
            <Text style={searchStyles.noResultsText}>No products found for "{searchText}"</Text>
            <Text style={searchStyles.noResultsSubtext}>
              Searched in collection: {getCollectionInfo(searchText)}
            </Text>
          </View>
        ) : loadingHistory ? (
          <View style={searchStyles.noResultsContainer}>
            <ActivityIndicator size="small" color="#000000" />
          </View>
        ) : historyItems.length > 0 ? (
          <>
            {historyItems.map(product => renderProductClickable(product))}
          </>
        ) : (
          <View style={searchStyles.noResultsContainer}>
            <Text style={searchStyles.noResultsText}>No recent products</Text>
            <Text style={searchStyles.noResultsSubtext}>Products you view will appear here</Text>
          </View>
        )}
      </View>
    </>
  );
}