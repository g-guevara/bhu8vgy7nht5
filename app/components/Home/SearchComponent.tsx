// app/components/Home/SearchComponent.tsx - VERSIÓN FINAL CORREGIDA
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { searchStyles } from '../../styles/HomeComponentStyles';

// Configuración exacta del Python
const API_CONFIG = {
  DB1_URL: 'https://products-api-database1.vercel.app/',
  DB2_URL: 'https://products-api-database2.vercel.app/',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 2
};

// Mapeo exacto del Python
const DB1_COLLECTIONS = ['a_b', 'c', 'd_e', 'f_h', 'i_l'];  // A-L
const DB2_COLLECTIONS = ['m_n', 'o_q', 'r_s', 't_z'];       // M-Z

// Tipos para el mapeo de colecciones
interface CollectionInfo {
  uri: string;
  collection: string;
  db: number;
}

// Mapeo de letras a colecciones - EXACTO DEL PYTHON
const COLLECTION_MAPPING: Record<string, CollectionInfo> = {
  // Base de datos 1 (A-L)
  'a': { uri: API_CONFIG.DB1_URL, collection: 'a_b', db: 1 },
  'b': { uri: API_CONFIG.DB1_URL, collection: 'a_b', db: 1 },
  'c': { uri: API_CONFIG.DB1_URL, collection: 'c', db: 1 },
  'd': { uri: API_CONFIG.DB1_URL, collection: 'd_e', db: 1 },
  'e': { uri: API_CONFIG.DB1_URL, collection: 'd_e', db: 1 },
  'f': { uri: API_CONFIG.DB1_URL, collection: 'f_h', db: 1 },
  'g': { uri: API_CONFIG.DB1_URL, collection: 'f_h', db: 1 },
  'h': { uri: API_CONFIG.DB1_URL, collection: 'f_h', db: 1 },
  'i': { uri: API_CONFIG.DB1_URL, collection: 'i_l', db: 1 },
  'j': { uri: API_CONFIG.DB1_URL, collection: 'i_l', db: 1 },
  'k': { uri: API_CONFIG.DB1_URL, collection: 'i_l', db: 1 },
  'l': { uri: API_CONFIG.DB1_URL, collection: 'i_l', db: 1 },
  // Base de datos 2 (M-Z)
  'm': { uri: API_CONFIG.DB2_URL, collection: 'm_n', db: 2 },
  'n': { uri: API_CONFIG.DB2_URL, collection: 'm_n', db: 2 },
  'o': { uri: API_CONFIG.DB2_URL, collection: 'o_q', db: 2 },
  'p': { uri: API_CONFIG.DB2_URL, collection: 'o_q', db: 2 },
  'q': { uri: API_CONFIG.DB2_URL, collection: 'o_q', db: 2 },
  'r': { uri: API_CONFIG.DB2_URL, collection: 'r_s', db: 2 },
  's': { uri: API_CONFIG.DB2_URL, collection: 'r_s', db: 2 },
  't': { uri: API_CONFIG.DB2_URL, collection: 't_z', db: 2 },
  'u': { uri: API_CONFIG.DB2_URL, collection: 't_z', db: 2 },
  'v': { uri: API_CONFIG.DB2_URL, collection: 't_z', db: 2 },
  'w': { uri: API_CONFIG.DB2_URL, collection: 't_z', db: 2 },
  'x': { uri: API_CONFIG.DB2_URL, collection: 't_z', db: 2 },
  'y': { uri: API_CONFIG.DB2_URL, collection: 't_z', db: 2 },
  'z': { uri: API_CONFIG.DB2_URL, collection: 't_z', db: 2 },
};

interface Product {
  code: string;
  product_name: string;
  brands: string;
  ingredients_text: string;
}

// ✅ FIXED: Made relevanceScore required since it's always assigned
interface ProductWithEmoji extends Product {
  emoji?: string;
  relevanceScore: number;
}

interface SearchComponentProps {
  onFocusChange: (focused: boolean) => void;
}

// FUNCIÓN EXACTA DEL PYTHON: get_collection_for_search_term
function getCollectionForSearchTerm(searchTerm: string) {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return null;
  }
  
  const firstLetter = searchTerm.toLowerCase().trim()[0];
  
  return COLLECTION_MAPPING[firstLetter] || null;
}

// FUNCIÓN EXACTA DEL PYTHON: calculate_relevance_score
function calculateRelevanceScore(product: Product, searchTerm: string): number {
  const name = product.product_name.toLowerCase();
  const brands = product.brands.toLowerCase();
  const searchLower = searchTerm.toLowerCase();
  
  let score = 0;
  
  // Máxima puntuación: nombre empieza exactamente con el término
  if (name.startsWith(searchLower)) {
    score += 1000;
  }
  
  // Alta puntuación: nombre contiene el término al inicio de una palabra
  else if (name.includes(` ${searchLower}`) || name.includes(`-${searchLower}`)) {
    score += 800;
  }
  
  // Puntuación media-alta: marca empieza con el término
  else if (brands.startsWith(searchLower)) {
    score += 600;
  }
  
  // Puntuación media: marca contiene el término al inicio de una palabra
  else if (brands.includes(` ${searchLower}`) || brands.includes(`-${searchLower}`)) {
    score += 400;
  }
  
  // Puntuación baja: nombre contiene el término en cualquier parte
  else if (name.includes(searchLower)) {
    score += 200;
  }
  
  // Puntuación muy baja: marca contiene el término en cualquier parte
  else if (brands.includes(searchLower)) {
    score += 100;
  }
  
  // Bonificación por longitud del nombre
  if (name.length < 50) {
    score += 50;
  }
  
  // Bonificación si el nombre es similar en longitud al término buscado
  const nameWords = name.split(' ');
  if (nameWords.length <= 3) {
    score += 30;
  }
  
  return score;
}

// 🔥 FUNCIÓN CORREGIDA: Con noScoring=true para evitar doble scoring
async function searchInSpecificCollection(searchTerm: string): Promise<ProductWithEmoji[]> {
  const collectionInfo = getCollectionForSearchTerm(searchTerm);
  
  if (!collectionInfo) {
    console.log(`❌ No se pudo determinar colección para: "${searchTerm}"`);
    return [];
  }
  
  const { uri, collection, db } = collectionInfo;
  const dbName = db === 1 ? "1 (A-L)" : "2 (M-Z)";
  
  console.log(`🎯 Buscando "${searchTerm}" en DB${db}, colección ${collection}`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
    
    // 🔥 IMPORTANTE: Usar noScoring=true para desactivar el scoring de la API
    const response = await fetch(`${uri}/api/search?q=${encodeURIComponent(searchTerm)}&type=name&limit=500&debug=false&noScoring=true`, {
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
    console.log(`✅ DB${db} respondió: ${data.results?.length || 0} productos`);
    
    if (!data.results || data.results.length === 0) {
      return [];
    }
    
    // 🔥 IMPORTANTE: Aplicar NUESTRO sistema de scoring (el de Python)
    // ignorando cualquier scoring que venga de la API
    const resultsWithScores = data.results.map((product: Product): ProductWithEmoji => {
      const relevanceScore = calculateRelevanceScore(product, searchTerm);
      return {
        ...product,
        emoji: generateEmojiForProduct(product),
        relevanceScore
      };
    });
    
    // Ordenar por NUESTRO score de relevancia (descendente)
    const sortedResults = resultsWithScores
      .filter((product: ProductWithEmoji) => product.relevanceScore > 0)
      .sort((a: ProductWithEmoji, b: ProductWithEmoji) => b.relevanceScore - a.relevanceScore);
    
    console.log(`📊 Resultados finales: ${sortedResults.length} con relevancia > 0`);
    
    // Log top 3 para debugging
    if (__DEV__ && sortedResults.length > 0) {
      console.log('🏆 Top 3 resultados:');
      // ✅ FIXED: Added proper types for parameters
      sortedResults.slice(0, 3).forEach((r: ProductWithEmoji, i: number) => {
        console.log(`${i+1}. "${r.product_name}" (${r.brands}) - Score: ${r.relevanceScore}`);
      });
    }
    
    return sortedResults;
    
  } catch (error) {
    console.error(`❌ Error en DB${db}:`, error);
    throw error;
  }
}

// Generar emoji para producto (mantener la función original)
function generateEmojiForProduct(product: Product): string {
  const productName = product.product_name.toLowerCase();
  const brands = product.brands.toLowerCase();
  const searchText = `${productName} ${brands}`;

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

  // Sistema de matching de emojis (mantener original)
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
}

export default function SearchComponent({ onFocusChange }: SearchComponentProps) {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<ProductWithEmoji[]>([]);
  const [historyItems, setHistoryItems] = useState<ProductWithEmoji[]>([]);
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
        
        const historyProducts: ProductWithEmoji[] = [];
        
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
                    emoji: generateEmojiForProduct(product),
                    relevanceScore: 1000
                  });
                }
              }
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

  // FUNCIÓN PRINCIPAL DE BÚSQUEDA - REPLICA DEL PYTHON
  const handleSearch = async () => {
    const searchQuery = searchText.trim();
    
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      console.log(`🔍 Iniciando búsqueda: "${searchQuery}"`);
      
      // Usar la función exacta del Python
      const results = await searchInSpecificCollection(searchQuery);
      
      setSearchResults(results);
      
      console.log(`✅ Búsqueda completada: ${results.length} resultados`);
      
      // Mostrar top 3 para debugging (como en el Python)
      if (__DEV__ && results.length > 0) {
        console.log('🏆 Top 3 resultados:');
        // ✅ FIXED: Added proper types for parameters
        results.slice(0, 3).forEach((r: ProductWithEmoji, i: number) => {
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

  const getCollectionInfo = (query: string) => {
    const info = getCollectionForSearchTerm(query);
    if (!info) return 'No determinada';
    return `DB${info.db} - ${info.collection}`;
  };

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
            {searchResults.map(product => renderProductItem(product))}
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