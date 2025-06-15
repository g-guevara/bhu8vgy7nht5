// app/components/Home/SearchComponent.tsx - VERSIÓN MEJORADA CON RANKING DE RELEVANCIA
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { searchStyles } from '../../styles/HomeComponentStyles';

// Configuración de las APIs
const API_CONFIG = {
  DB1_URL: 'https://products-api-database1.vercel.app/',
  DB2_URL: 'https://products-api-database2.vercel.app/',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 2
};

interface Product {
  code: string;
  product_name: string;
  brands: string;
  ingredients_text: string;
}

interface ProductWithEmoji extends Product {
  emoji?: string;
  relevanceScore?: number; // NUEVO: Score de relevancia
}

interface SearchComponentProps {
  onFocusChange: (focused: boolean) => void;
}

// NUEVAS FUNCIONES PARA MEJORAR LA BÚSQUEDA

/**
 * Calcula la similitud entre dos strings usando Levenshtein distance
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  const len1 = str1.length;
  const len2 = str2.length;

  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[len2][len1];
}

/**
 * Calcula el score de relevancia de un producto basado en la query
 */
function calculateRelevanceScore(product: Product, query: string): number {
  const queryLower = query.toLowerCase().trim();
  const productName = product.product_name.toLowerCase();
  const brands = product.brands.toLowerCase();
  
  let score = 0;

  // 1. COINCIDENCIA EXACTA EN NOMBRE (puntuación máxima: 100)
  if (productName === queryLower) {
    score += 100;
  }
  
  // 2. COINCIDENCIA EXACTA EN MARCA (puntuación: 90)
  if (brands === queryLower) {
    score += 90;
  }

  // 3. COMIENZA CON LA QUERY (puntuación: 80)
  if (productName.startsWith(queryLower)) {
    score += 80;
  }
  if (brands.startsWith(queryLower)) {
    score += 70;
  }

  // 4. CONTIENE LA QUERY COMPLETA (puntuación: 60)
  if (productName.includes(queryLower)) {
    score += 60;
  }
  if (brands.includes(queryLower)) {
    score += 50;
  }

  // 5. COINCIDENCIA DE PALABRAS INDIVIDUALES (puntuación variable)
  const queryWords = queryLower.split(/\s+/);
  const productWords = productName.split(/\s+/);
  const brandWords = brands.split(/\s+/);

  queryWords.forEach(queryWord => {
    if (queryWord.length < 2) return; // Ignorar palabras muy cortas

    // Palabras exactas en nombre
    productWords.forEach(productWord => {
      if (productWord === queryWord) {
        score += 30;
      } else if (productWord.includes(queryWord)) {
        score += 15;
      }
    });

    // Palabras exactas en marca
    brandWords.forEach(brandWord => {
      if (brandWord === queryWord) {
        score += 25;
      } else if (brandWord.includes(queryWord)) {
        score += 10;
      }
    });
  });

  // 6. SIMILARIDAD FUZZY (para manejar typos)
  const maxDistance = Math.max(3, Math.floor(queryLower.length * 0.3));
  
  // Fuzzy match en nombre
  const nameDistance = levenshteinDistance(queryLower, productName);
  if (nameDistance <= maxDistance) {
    score += Math.max(0, 40 - (nameDistance * 10));
  }

  // Fuzzy match en marca
  const brandDistance = levenshteinDistance(queryLower, brands);
  if (brandDistance <= maxDistance) {
    score += Math.max(0, 30 - (brandDistance * 8));
  }

  // 7. PENALIZACIÓN POR LONGITUD (productos con nombres muy largos son menos relevantes)
  const lengthPenalty = Math.max(0, (productName.length - queryLower.length) * 0.1);
  score -= lengthPenalty;

  // 8. BONUS PARA MARCAS CONOCIDAS (ajustar según necesidad)
  const popularBrands = ['coca cola', 'pepsi', 'nestle', 'danone', 'kraft', 'unilever'];
  if (popularBrands.some(brand => brands.includes(brand))) {
    score += 5;
  }

  return Math.max(0, score);
}

/**
 * Normaliza texto para búsqueda (maneja caracteres especiales, espacios, etc.)
 */
function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9\s]/g, ' ') // Reemplazar caracteres especiales con espacios
    .replace(/\s+/g, ' ') // Múltiples espacios a uno solo
    .trim();
}

/**
 * Expande la query para incluir variaciones comunes
 */
function expandQuery(query: string): string[] {
  const normalized = normalizeSearchText(query);
  const variations = [normalized];
  
  // Agregar variaciones comunes
  const commonVariations: Record<string, string[]> = {
    'coca cola': ['cocacola', 'coca-cola', 'coke'],
    'cocacola': ['coca cola', 'coca-cola', 'coke'],
    'coca-cola': ['cocacola', 'coca cola', 'coke'],
  };
  
  Object.entries(commonVariations).forEach(([key, vals]) => {
    if (normalized.includes(key)) {
      variations.push(...vals);
    }
  });
  
  return [...new Set(variations)]; // Eliminar duplicados
}

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

  const RESULTS_PER_PAGE = 15;
  const MAX_HISTORY_ITEMS = 2;
  const HISTORY_KEY = 'product_history';

  // Sistema de emojis (mantenido igual)
  const PRODUCT_EMOJIS = {
    fruits: ['🍎', '🍌', '🍊', '🍋', '🍇', '🍓', '🥝', '🍑', '🍒', '🥭', '🍍', '🥥'],
    vegetables: ['🥕', '🥬', '🥒', '🍅', '🥔', '🧅', '🥦', '🌽', '🫑', '🍆', '🥑'],
    dairy: ['🥛', '🧀', '🧈', '🍦', '🥧'],
    meat: ['🍗', '🥓', '🍖', '🌭', '🥩'],
    fish: ['🐟', '🦐', '🦀', '🐙', '🍣'],
    bakery: ['🍞', '🥖', '🥨', '🥐', '🧇', '🥞'],
    sweets: ['🍫', '🍭', '🍬', '🧁', '🍰', '🍪', '🍩'],
    drinks: ['🥤', '☕', '🍵', '🧃', '🥃', '🍷', '🍺'],
    water: ['💧', '🚰'],
    grains: ['🌾', '🍚', '🍝', '🥣'],
    snacks: ['🥨', '🍿', '🥜', '🌰'],
    default: ['🍽️', '🥘', '🍲', '🥗', '🍱']
  };

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

  const getTargetAPI = (query: string): 'DB1' | 'DB2' | 'BOTH' => {
    if (!query || !query.trim()) return 'BOTH';
    
    const firstLetter = normalizeSearchText(query)[0];
    
    if (!firstLetter || !firstLetter.match(/[a-z]/)) {
      return 'DB2';
    }
    
    if (firstLetter >= 'a' && firstLetter <= 'l') {
      return 'DB1';
    }
    
    if (firstLetter >= 'm' && firstLetter <= 'z') {
      return 'DB2';
    }
    
    return 'BOTH';
  };

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
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchWithRetry(url, retries - 1);
      }
      
      throw error;
    }
  };

  const generateEmojiForProduct = (product: Product): string => {
    const productName = product.product_name.toLowerCase();
    const brands = product.brands.toLowerCase();
    const searchText = `${productName} ${brands}`;

    if (searchText.match(/\b(fruit|pomme|apple|banane|banana|orange|citron|lemon|raisin|grape|fraise|strawberry|kiwi|cerise|cherry|mangue|mango|ananas|pineapple|coco|coconut)\b/)) {
      return PRODUCT_EMOJIS.fruits[Math.floor(Math.random() * PRODUCT_EMOJIS.fruits.length)];
    }

    if (searchText.match(/\b(légume|vegetable|carotte|carrot|laitue|lettuce|concombre|cucumber|tomate|tomato|pomme de terre|potato|oignon|onion|brocoli|broccoli|maïs|corn|poivron|pepper|aubergine|eggplant|avocat|avocado)\b/)) {
      return PRODUCT_EMOJIS.vegetables[Math.floor(Math.random() * PRODUCT_EMOJIS.vegetables.length)];
    }

    if (searchText.match(/\b(lait|milk|yaourt|yogurt|fromage|cheese|beurre|butter|crème|cream|glace|ice cream)\b/)) {
      return PRODUCT_EMOJIS.dairy[Math.floor(Math.random() * PRODUCT_EMOJIS.dairy.length)];
    }

    if (searchText.match(/\b(viande|meat|poulet|chicken|bœuf|beef|porc|pork|jambon|ham|saucisse|sausage|bacon)\b/)) {
      return PRODUCT_EMOJIS.meat[Math.floor(Math.random() * PRODUCT_EMOJIS.meat.length)];
    }

    if (searchText.match(/\b(poisson|fish|saumon|salmon|thon|tuna|crevette|shrimp|crabe|crab|poulpe|octopus|sushi)\b/)) {
      return PRODUCT_EMOJIS.fish[Math.floor(Math.random() * PRODUCT_EMOJIS.fish.length)];
    }

    if (searchText.match(/\b(pain|bread|baguette|croissant|brioche|gaufre|waffle|crêpe|pancake)\b/)) {
      return PRODUCT_EMOJIS.bakery[Math.floor(Math.random() * PRODUCT_EMOJIS.bakery.length)];
    }

    if (searchText.match(/\b(chocolat|chocolate|bonbon|candy|gâteau|cake|biscuit|cookie|pâtisserie|pastry|dessert)\b/)) {
      return PRODUCT_EMOJIS.sweets[Math.floor(Math.random() * PRODUCT_EMOJIS.sweets.length)];
    }

    if (searchText.match(/\b(boisson|drink|soda|jus|juice|café|coffee|thé|tea|vin|wine|bière|beer|alcool|alcohol|cola|coca|pepsi)\b/)) {
      return PRODUCT_EMOJIS.drinks[Math.floor(Math.random() * PRODUCT_EMOJIS.drinks.length)];
    }

    if (searchText.match(/\b(eau|water|hydratation|hydration)\b/)) {
      return PRODUCT_EMOJIS.water[Math.floor(Math.random() * PRODUCT_EMOJIS.water.length)];
    }

    if (searchText.match(/\b(céréale|cereal|riz|rice|pâtes|pasta|avoine|oats|quinoa|blé|wheat)\b/)) {
      return PRODUCT_EMOJIS.grains[Math.floor(Math.random() * PRODUCT_EMOJIS.grains.length)];
    }

    if (searchText.match(/\b(chips|snack|noix|nuts|amande|almond|cacahuète|peanut|pop-corn|popcorn)\b/)) {
      return PRODUCT_EMOJIS.snacks[Math.floor(Math.random() * PRODUCT_EMOJIS.snacks.length)];
    }

    return PRODUCT_EMOJIS.default[Math.floor(Math.random() * PRODUCT_EMOJIS.default.length)];
  };

  // FUNCIÓN PRINCIPAL DE BÚSQUEDA MEJORADA
  const searchProductsInAPIs = async (query: string): Promise<ProductWithEmoji[]> => {
    const queryVariations = expandQuery(query);
    const targetAPI = getTargetAPI(query);
    
    console.log(`🔍 Buscando variaciones: ${queryVariations.join(', ')}`);
    
    try {
      let allResults: Product[] = [];
      
      // Buscar con todas las variaciones de la query
      for (const searchQuery of queryVariations) {
        const encodedQuery = encodeURIComponent(searchQuery);
        
        if (targetAPI === 'DB1' || targetAPI === 'BOTH') {
          try {
            const db1Response = await fetchWithRetry(
              `${API_CONFIG.DB1_URL}/api/search?q=${encodedQuery}&type=all&limit=200`
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
              `${API_CONFIG.DB2_URL}/api/search?q=${encodedQuery}&type=all&limit=200`
            );
            allResults.push(...(db2Response.results || []));
          } catch (error) {
            console.error('❌ Error en DB2:', error);
            if (targetAPI === 'DB2') {
              throw new Error('Base de datos M-Z no disponible');
            }
          }
        }
      }
      
      // Eliminar duplicados por código
      const uniqueResults = allResults
        .filter((product, index, self) => 
          index === self.findIndex(p => p.code === product.code)
        );
      
      // CALCULAR SCORES DE RELEVANCIA Y ORDENAR
      const resultsWithScores = uniqueResults.map(product => {
        const relevanceScore = calculateRelevanceScore(product, query);
        return {
          ...product,
          emoji: generateEmojiForProduct(product),
          relevanceScore
        };
      });
      
      // Ordenar por score de relevancia (mayor a menor)
      const sortedResults = resultsWithScores
        .filter(product => product.relevanceScore > 0) // Solo incluir productos con relevancia
        .sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      console.log(`📊 Resultados ordenados por relevancia: ${sortedResults.length}`);
      console.log(`🏆 Top 3 resultados:`, sortedResults.slice(0, 3).map(r => ({
        name: r.product_name,
        brand: r.brands,
        score: r.relevanceScore
      })));
      
      return sortedResults;
      
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
        const historyData = JSON.parse(historyJson);
        
        const historyProducts: ProductWithEmoji[] = [];
        
        for (const historyItem of historyData.slice(0, MAX_HISTORY_ITEMS)) {
          try {
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
          {/* MOSTRAR SCORE EN DESARROLLO */}
          {__DEV__ && product.relevanceScore && (
            <Text style={{ color: '#999', fontSize: 12 }}> ({product.relevanceScore.toFixed(1)})</Text>
          )}
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