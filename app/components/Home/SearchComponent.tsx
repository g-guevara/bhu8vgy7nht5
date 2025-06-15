// app/components/Home/SearchComponent.tsx - VERSIÓN SIN OPENFOODFACTS API
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { searchStyles } from '../../styles/HomeComponentStyles';

// Configuración de las APIs
const API_CONFIG = {
  DB1_URL: 'https://products-api-database1.vercel.app/', // Reemplazar con tu URL de DB1 (A-L)
  DB2_URL: 'https://products-api-database2.vercel.app/', // Reemplazar con tu URL de DB2 (M-Z)
  TIMEOUT: 10000, // 10 segundos timeout
  RETRY_ATTEMPTS: 2
};

// Interfaz para los productos
interface Product {
  code: string;
  product_name: string;
  brands: string;
  ingredients_text: string;
}

interface ProductWithEmoji extends Product {
  emoji?: string;
}

interface SearchComponentProps {
  onFocusChange: (focused: boolean) => void;
}

interface HistoryItem {
  code: string;
  viewedAt: string;
}

// Constantes
const HISTORY_KEY = 'product_history';
const MAX_HISTORY_ITEMS = 2;
const RESULTS_PER_PAGE = 15;

// Sistema de emojis por categorías de productos
const PRODUCT_EMOJIS = {
  // Frutas
  fruits: ['🍎', '🍌', '🍊', '🍋', '🍇', '🍓', '🥝', '🍑', '🍒', '🥭', '🍍', '🥥'],
  
  // Verduras
  vegetables: ['🥕', '🥬', '🥒', '🍅', '🥔', '🧅', '🥦', '🌽', '🫑', '🍆', '🥑'],
  
  // Lácteos
  dairy: ['🥛', '🧀', '🧈', '🍦', '🥧'],
  
  // Carnes
  meat: ['🍗', '🥓', '🍖', '🌭', '🥩'],
  
  // Pescado
  fish: ['🐟', '🦐', '🦀', '🐙', '🍣'],
  
  // Panadería
  bakery: ['🍞', '🥖', '🥨', '🥐', '🧇', '🥞'],
  
  // Dulces
  sweets: ['🍫', '🍭', '🍬', '🧁', '🍰', '🍪', '🍩'],
  
  // Bebidas
  drinks: ['🥤', '☕', '🍵', '🧃', '🥃', '🍷', '🍺'],
  
  // Agua
  water: ['💧', '🚰'],
  
  // Cereales y granos
  grains: ['🌾', '🍚', '🍝', '🥣'],
  
  // Snacks
  snacks: ['🥨', '🍿', '🥜', '🌰'],
  
  // Por defecto
  default: ['🍽️', '🥘', '🍲', '🥗', '🍱']
};

export default function SearchComponent({ onFocusChange }: SearchComponentProps) {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [allSearchResults, setAllSearchResults] = useState<ProductWithEmoji[]>([]);
  const [displayedResults, setDisplayedResults] = useState<ProductWithEmoji[]>([]);
  const [historyItems, setHistoryItems] = useState<ProductWithEmoji[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);

  useEffect(() => {
    loadHistoryFromStorage();
  }, []);

  useEffect(() => {
    if (allSearchResults.length > 0) {
      const total = Math.ceil(allSearchResults.length / RESULTS_PER_PAGE);
      setTotalPages(total);
      setTotalResults(allSearchResults.length);
      
      if (currentPage > total) {
        setCurrentPage(1);
      }
      
      updateDisplayedResults(currentPage, allSearchResults);
    } else {
      setTotalPages(0);
      setTotalResults(0);
      setDisplayedResults([]);
    }
  }, [allSearchResults, currentPage]);

  // Determinar qué API consultar basándose en la primera letra
  const getTargetAPI = (query: string): 'DB1' | 'DB2' | 'BOTH' => {
    if (!query || !query.trim()) return 'BOTH';
    
    const firstLetter = query.toLowerCase().trim()[0];
    
    // Verificar si es una letra válida
    if (!firstLetter || !firstLetter.match(/[a-z]/)) {
      return 'DB2'; // Caracteres especiales van a DB2 (t_z)
    }
    
    // DB1: A-L
    if (firstLetter >= 'a' && firstLetter <= 'l') {
      return 'DB1';
    }
    
    // DB2: M-Z
    if (firstLetter >= 'm' && firstLetter <= 'z') {
      return 'DB2';
    }
    
    return 'BOTH'; // Fallback
  };

  // Función para hacer llamadas a la API con reintentos
  const fetchWithRetry = async (url: string, retries = API_CONFIG.RETRY_ATTEMPTS): Promise<any> => {
    try {
      console.log(`🔍 Buscando en: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Respuesta recibida: ${data.results?.length || 0} productos`);
      
      return data;
    } catch (error) {
      console.error(`❌ Error en llamada a API: ${error}`);
      
      if (retries > 0) {
        console.log(`🔄 Reintentando... (${retries} intentos restantes)`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo
        return fetchWithRetry(url, retries - 1);
      }
      
      throw error;
    }
  };

  // Generar emoji para producto basado en nombre y marca
  const generateEmojiForProduct = (product: Product): string => {
    const productName = product.product_name.toLowerCase();
    const brands = product.brands.toLowerCase();
    const searchText = `${productName} ${brands}`;

    // Frutas
    if (searchText.match(/\b(fruit|pomme|apple|banane|banana|orange|citron|lemon|raisin|grape|fraise|strawberry|kiwi|cerise|cherry|mangue|mango|ananas|pineapple|coco|coconut)\b/)) {
      return PRODUCT_EMOJIS.fruits[Math.floor(Math.random() * PRODUCT_EMOJIS.fruits.length)];
    }

    // Verduras
    if (searchText.match(/\b(légume|vegetable|carotte|carrot|laitue|lettuce|concombre|cucumber|tomate|tomato|pomme de terre|potato|oignon|onion|brocoli|broccoli|maïs|corn|poivron|pepper|aubergine|eggplant|avocat|avocado)\b/)) {
      return PRODUCT_EMOJIS.vegetables[Math.floor(Math.random() * PRODUCT_EMOJIS.vegetables.length)];
    }

    // Lácteos
    if (searchText.match(/\b(lait|milk|yaourt|yogurt|fromage|cheese|beurre|butter|crème|cream|glace|ice cream)\b/)) {
      return PRODUCT_EMOJIS.dairy[Math.floor(Math.random() * PRODUCT_EMOJIS.dairy.length)];
    }

    // Carnes
    if (searchText.match(/\b(viande|meat|poulet|chicken|bœuf|beef|porc|pork|jambon|ham|saucisse|sausage|bacon)\b/)) {
      return PRODUCT_EMOJIS.meat[Math.floor(Math.random() * PRODUCT_EMOJIS.meat.length)];
    }

    // Pescado
    if (searchText.match(/\b(poisson|fish|saumon|salmon|thon|tuna|crevette|shrimp|crabe|crab|poulpe|octopus|sushi)\b/)) {
      return PRODUCT_EMOJIS.fish[Math.floor(Math.random() * PRODUCT_EMOJIS.fish.length)];
    }

    // Panadería
    if (searchText.match(/\b(pain|bread|baguette|croissant|brioche|gaufre|waffle|crêpe|pancake)\b/)) {
      return PRODUCT_EMOJIS.bakery[Math.floor(Math.random() * PRODUCT_EMOJIS.bakery.length)];
    }

    // Dulces
    if (searchText.match(/\b(chocolat|chocolate|bonbon|candy|gâteau|cake|biscuit|cookie|pâtisserie|pastry|dessert)\b/)) {
      return PRODUCT_EMOJIS.sweets[Math.floor(Math.random() * PRODUCT_EMOJIS.sweets.length)];
    }

    // Bebidas
    if (searchText.match(/\b(boisson|drink|soda|jus|juice|café|coffee|thé|tea|vin|wine|bière|beer|alcool|alcohol)\b/)) {
      return PRODUCT_EMOJIS.drinks[Math.floor(Math.random() * PRODUCT_EMOJIS.drinks.length)];
    }

    // Agua
    if (searchText.match(/\b(eau|water|hydratation|hydration)\b/)) {
      return PRODUCT_EMOJIS.water[Math.floor(Math.random() * PRODUCT_EMOJIS.water.length)];
    }

    // Cereales
    if (searchText.match(/\b(céréale|cereal|riz|rice|pâtes|pasta|avoine|oats|quinoa|blé|wheat)\b/)) {
      return PRODUCT_EMOJIS.grains[Math.floor(Math.random() * PRODUCT_EMOJIS.grains.length)];
    }

    // Snacks
    if (searchText.match(/\b(chips|snack|noix|nuts|amande|almond|cacahuète|peanut|pop-corn|popcorn)\b/)) {
      return PRODUCT_EMOJIS.snacks[Math.floor(Math.random() * PRODUCT_EMOJIS.snacks.length)];
    }

    // Por defecto
    return PRODUCT_EMOJIS.default[Math.floor(Math.random() * PRODUCT_EMOJIS.default.length)];
  };

  // Buscar productos en las APIs
  const searchProductsInAPIs = async (query: string): Promise<ProductWithEmoji[]> => {
    const targetAPI = getTargetAPI(query);
    const encodedQuery = encodeURIComponent(query);
    
    try {
      let allResults: Product[] = [];
      
      if (targetAPI === 'DB1' || targetAPI === 'BOTH') {
        try {
          const db1Response = await fetchWithRetry(
            `${API_CONFIG.DB1_URL}/api/search?q=${encodedQuery}&type=all&limit=50`
          );
          allResults.push(...(db1Response.results || []));
        } catch (error) {
          console.error('❌ Error en DB1:', error);
          if (targetAPI === 'DB1') {
            throw new Error('Base de datos A-L no disponible');
          }
        }
      }
      
      if (targetAPI === 'DB2' || targetAPI === 'BOTH') {
        try {
          const db2Response = await fetchWithRetry(
            `${API_CONFIG.DB2_URL}/api/search?q=${encodedQuery}&type=all&limit=50`
          );
          allResults.push(...(db2Response.results || []));
        } catch (error) {
          console.error('❌ Error en DB2:', error);
          if (targetAPI === 'DB2') {
            throw new Error('Base de datos M-Z no disponible');
          }
        }
      }
      
      // Eliminar duplicados por código y agregar emojis
      const uniqueResults = allResults
        .filter((product, index, self) => 
          index === self.findIndex(p => p.code === product.code)
        )
        .map(product => ({
          ...product,
          emoji: generateEmojiForProduct(product)
        }));
      
      console.log(`📊 Resultados únicos encontrados: ${uniqueResults.length}`);
      
      return uniqueResults;
      
    } catch (error) {
      console.error('❌ Error general en búsqueda:', error);
      throw error;
    }
  };

  const updateDisplayedResults = (page: number, results: ProductWithEmoji[]) => {
    const startIndex = (page - 1) * RESULTS_PER_PAGE;
    const endIndex = startIndex + RESULTS_PER_PAGE;
    const pageResults = results.slice(startIndex, endIndex);
    setDisplayedResults(pageResults);
  };

  const loadHistoryFromStorage = async () => {
    setLoadingHistory(true);
    try {
      const historyJson = await AsyncStorage.getItem(HISTORY_KEY);
      if (historyJson) {
        const historyData: HistoryItem[] = JSON.parse(historyJson);
        
        // Para el historial, necesitamos buscar los productos en las APIs
        const historyProducts: ProductWithEmoji[] = [];
        
        for (const historyItem of historyData.slice(0, MAX_HISTORY_ITEMS)) {
          try {
            // Buscar el producto por código en ambas APIs
            const db1Response = await fetchWithRetry(
              `${API_CONFIG.DB1_URL}/api/search/code/${historyItem.code}`
            ).catch(() => ({ results: [] }));
            
            const db2Response = await fetchWithRetry(
              `${API_CONFIG.DB2_URL}/api/search/code/${historyItem.code}`
            ).catch(() => ({ results: [] }));
            
            const product = db1Response.results?.[0] || db2Response.results?.[0];
            
            if (product) {
              historyProducts.push({
                ...product,
                emoji: generateEmojiForProduct(product)
              });
            }
          } catch (error) {
            console.error(`Error loading history item ${historyItem.code}:`, error);
          }
        }
        
        setHistoryItems(historyProducts);
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
      let historyData: HistoryItem[] = historyJson ? JSON.parse(historyJson) : [];

      historyData = historyData.filter(item => item.code !== productCode);

      const newHistoryItem: HistoryItem = {
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

  const handleSearch = async (text: string) => {
    setSearchText(text);

    if (text.trim() === '') {
      setAllSearchResults([]);
      setCurrentPage(1);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    try {
      console.log(`🔍 Buscando: "${text}"`);
      const results = await searchProductsInAPIs(text);
      
      setAllSearchResults(results);
      setCurrentPage(1);
      
    } catch (error) {
      console.error('Error en búsqueda:', error);
      setAllSearchResults([]);
      // Aquí podrías mostrar un toast de error
    } finally {
      setSearchLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      updateDisplayedResults(newPage, allSearchResults);
    }
  };

  const handlePreviousPage = () => {
    handlePageChange(currentPage - 1);
  };

  const handleNextPage = () => {
    handlePageChange(currentPage + 1);
  };

  const handleProductPress = async (product: ProductWithEmoji) => {
    try {
      await AsyncStorage.setItem('selectedProduct', JSON.stringify(product));
      await saveToHistory(product.code);
      router.push('/screens/ProductInfoScreen');
    } catch (error) {
      console.error('Error storing product:', error);
    }
  };

  const renderProductItem = (product: ProductWithEmoji) => (
    <TouchableOpacity
      key={product.code}
      style={searchStyles.productItem}
      onPress={() => handleProductPress(product)}
    >
      <View style={searchStyles.productImageContainer}>
        <Text style={searchStyles.productEmoji}>{product.emoji}</Text>
      </View>
      <View style={searchStyles.productInfo}>
        <Text style={searchStyles.productName} numberOfLines={1} ellipsizeMode="tail">
          {product.product_name}
        </Text>
        <Text style={searchStyles.productBrand} numberOfLines={1} ellipsizeMode="tail">
          {product.brands || 'Sin marca'}
        </Text>
      </View>
      <Text style={searchStyles.arrowIcon}>›</Text>
    </TouchableOpacity>
  );

  const renderPaginationControls = () => {
    if (!searchText || totalPages <= 1) return null;

    return (
      <View style={searchStyles.paginationContainer}>
        <View style={searchStyles.paginationInfo}>
          <Text style={searchStyles.paginationInfoText}>
            {totalResults} resultado{totalResults !== 1 ? 's' : ''} encontrado{totalResults !== 1 ? 's' : ''}
          </Text>
          <Text style={searchStyles.paginationInfoText}>
            Página {currentPage} de {totalPages}
          </Text>
        </View>

        <View style={searchStyles.paginationControls}>
          <TouchableOpacity
            style={[
              searchStyles.paginationButton,
              currentPage === 1 && searchStyles.paginationButtonDisabled
            ]}
            onPress={handlePreviousPage}
            disabled={currentPage === 1}
          >
            <Text style={[
              searchStyles.paginationButtonText,
              currentPage === 1 && searchStyles.paginationButtonTextDisabled
            ]}>
              ←
            </Text>
          </TouchableOpacity>

          <View style={searchStyles.paginationPageNumbers}>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNumber;
              if (totalPages <= 5) {
                pageNumber = i + 1;
              } else if (currentPage <= 3) {
                pageNumber = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + i;
              } else {
                pageNumber = currentPage - 2 + i;
              }

              return (
                <TouchableOpacity
                  key={pageNumber}
                  style={[
                    searchStyles.paginationPageButton,
                    currentPage === pageNumber && searchStyles.paginationPageButtonActive
                  ]}
                  onPress={() => handlePageChange(pageNumber)}
                >
                  <Text style={[
                    searchStyles.paginationPageButtonText,
                    currentPage === pageNumber && searchStyles.paginationPageButtonTextActive
                  ]}>
                    {pageNumber}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[
              searchStyles.paginationButton,
              currentPage === totalPages && searchStyles.paginationButtonDisabled
            ]}
            onPress={handleNextPage}
            disabled={currentPage === totalPages}
          >
            <Text style={[
              searchStyles.paginationButtonText,
              currentPage === totalPages && searchStyles.paginationButtonTextDisabled
            ]}>
              →
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <>
      <View style={searchStyles.searchContainer}>
        <TextInput
          style={searchStyles.searchInput}
          placeholder="Search products..."
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
            <Text style={searchStyles.noResultsSubtext}>Searching products...</Text>
          </View>
        ) : searchText && displayedResults.length > 0 ? (
          <>
            {displayedResults.map(product => renderProductItem(product))}
            {renderPaginationControls()}
          </>
        ) : searchText && allSearchResults.length === 0 ? (
          <View style={searchStyles.noResultsContainer}>
            <Text style={searchStyles.noResultsText}>No products found for "{searchText}"</Text>
            <Text style={searchStyles.noResultsSubtext}>Try a different search term</Text>
          </View>
        ) : loadingHistory ? (
          <View style={searchStyles.noResultsContainer}>
            <ActivityIndicator size="small" color="#000000" />
          </View>
        ) : historyItems.length > 0 ? (
          <>
            {historyItems.map(product => renderProductItem(product))}
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