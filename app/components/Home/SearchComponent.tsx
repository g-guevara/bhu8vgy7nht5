// app/components/Home/SearchComponent.tsx - CORREGIDO: Botón Search dinámico
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

// 🆕 IMPORTAR EL NUEVO SISTEMA DE PRODUCT DATA
import { 
  sampleProducts, 
  addProductsToData, 
  findProductInData,
  searchProductsInData,
  getProductDataStats,
  Product 
} from '../../data/productData';

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
  
  // 🔥 NUEVO: Estado para trackear si se ha realizado una búsqueda
  const [hasSearched, setHasSearched] = useState(false);
  
  // 🆕 Estados para mostrar información del cache
  const [cacheStats, setCacheStats] = useState<{
    totalProducts: number;
    cachedProducts: number;
    cacheSizeKB: number;
  } | null>(null);
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const RESULTS_PER_PAGE = 15;
  
  const MAX_HISTORY_ITEMS = 2;
  const HISTORY_KEY = 'product_history';

  useEffect(() => {
    loadHistoryFromStorage();
    loadCacheStats();
  }, []);

  // 🆕 Cargar estadísticas del cache
  const loadCacheStats = async () => {
    try {
      const stats = await getProductDataStats();
      setCacheStats({
        totalProducts: stats.totalProducts,
        cachedProducts: stats.cachedProducts,
        cacheSizeKB: stats.cacheSizeKB
      });
    } catch (error) {
      console.error('Error loading cache stats:', error);
    }
  };

  const loadHistoryFromStorage = async () => {
    setLoadingHistory(true);
    try {
      const historyJson = await AsyncStorage.getItem(HISTORY_KEY);
      if (historyJson) {
        const historyData = JSON.parse(historyJson);
        
        const historyProducts: ProductWithImageAndEmoji[] = [];
        
        for (const historyItem of historyData.slice(0, MAX_HISTORY_ITEMS)) {
          try {
            // 🆕 PRIMERO: Buscar en productData.ts integrado
            const cachedProduct = findProductInData(historyItem.code);
            
            if (cachedProduct) {
              console.log(`💾 History item ${historyItem.code} found in integrated data`);
              historyProducts.push({
                ...cachedProduct,
                relevanceScore: 1000,
                imageUri: null,
                imageLoading: false,
                imageError: false
              });
              continue;
            }
            
            // FALLBACK: Si no está en datos integrados, buscar en API
            const collectionInfo = getCollectionForSearchTerm(historyItem.code);
            if (collectionInfo) {
              const response = await fetch(`${collectionInfo.uri}/api/search/code/${historyItem.code}`);
              if (response.ok) {
                const data = await response.json();
                const product = data.results?.[0];
                
                if (product) {
                  historyProducts.push({
                    ...product,
                    relevanceScore: 1000,
                    imageUri: null,
                    imageLoading: false,
                    imageError: false
                  });
                  
                  // 🆕 Agregar al sistema integrado para próximas veces
                  addProductsToData([product]);
                  
                  // Actualizar estadísticas
                  loadCacheStats();
                }
              }
            }
          } catch (error) {
            console.error(`Error loading history item ${historyItem.code}:`, error);
          }
        }
        
        setHistoryItems(historyProducts);
        
        // Cargar imágenes para items del historial
        if (historyProducts.length > 0) {
          loadImagesForProducts(historyProducts, setHistoryItems);
        }
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

  // 🆕 FUNCIÓN DE BÚSQUEDA HÍBRIDA (cache local + API)
  const performHybridSearch = async (searchQuery: string): Promise<ProductWithImageAndEmoji[]> => {
    const results: ProductWithImageAndEmoji[] = [];
    
    // 1. Buscar primero en datos locales/cache
    const localResults = searchProductsInData(searchQuery, 20);
    console.log(`🔍 Found ${localResults.length} local results for "${searchQuery}"`);
    
    // Convertir resultados locales al formato esperado
    localResults.forEach(product => {
      results.push({
        ...product,
        relevanceScore: 1500, // Mayor prioridad para resultados locales
        imageUri: null,
        imageLoading: false,
        imageError: false
      });
    });
    
    // 2. Si hay pocos resultados locales, buscar en API
    if (results.length < 10) {
      try {
        console.log(`🌐 Searching API for additional results for "${searchQuery}"`);
        const apiResults = await searchInSpecificCollection(searchQuery);
        
        // Filtrar resultados que ya tenemos localmente
        const newApiResults = apiResults.filter(apiProduct => 
          !results.some(localProduct => localProduct.code === apiProduct.code)
        );
        
        console.log(`🌐 Found ${newApiResults.length} new API results`);
        
        // Agregar resultados de API al cache para próximas búsquedas
        if (newApiResults.length > 0) {
          const productsToCache = newApiResults.map(product => ({
            code: product.code,
            product_name: product.product_name,
            brands: product.brands,
            ingredients_text: product.ingredients_text,
            // 🔧 FIX: Usar imageUri en lugar de image_url para consistencia
            image_url: product.imageUri || undefined
          }));
          
          addProductsToData(productsToCache);
          console.log(`💾 Added ${productsToCache.length} new products to integrated data`);
          
          // Actualizar estadísticas
          loadCacheStats();
        }
        
        results.push(...newApiResults);
      } catch (error) {
        console.error('❌ Error in API search:', error);
      }
    }
    
    // 3. Ordenar por relevancia
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  };

  // 🔥 FUNCIÓN PRINCIPAL DE BÚSQUEDA - ACTUALIZADA CON hasSearched
  const handleSearch = async () => {
    const searchQuery = searchText.trim();
    
    if (!searchQuery) {
      setSearchResults([]);
      setCurrentPage(1);
      // 🔥 IMPORTANTE: Resetear hasSearched cuando se limpia la búsqueda
      setHasSearched(false);
      return;
    }

    setSearchLoading(true);
    setCurrentPage(1);
    // 🔥 IMPORTANTE: Marcar que se ha realizado una búsqueda
    setHasSearched(true);
    
    try {
      console.log(`🔍 Starting hybrid search for: "${searchQuery}"`);
      
      // Usar búsqueda híbrida
      const results = await performHybridSearch(searchQuery);
      
      setSearchResults(results);
      
      console.log(`✅ Hybrid search completed: ${results.length} total results`);
      
      // Cargar imágenes solo para la primera página
      if (results.length > 0) {
        const firstPageResults = results.slice(0, RESULTS_PER_PAGE);
        loadImagesForProducts(firstPageResults, setSearchResults);
        console.log(`📸 Loading images for first ${firstPageResults.length} products`);
      }
      
      // Mostrar top 3 para debugging
      if (__DEV__ && results.length > 0) {
        console.log('🏆 Top 3 results:');
        results.slice(0, 3).forEach((r: ProductWithImageAndEmoji, i: number) => {
          const source = r.relevanceScore >= 1500 ? 'Local' : 'API';
          console.log(`${i+1}. "${r.product_name}" (${r.brands}) - Score: ${r.relevanceScore} [${source}]`);
        });
      }
      
    } catch (error) {
      console.error('❌ Error in hybrid search:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleProductPress = async (product: ProductWithImageAndEmoji) => {
    // Agregar producto al sistema integrado si no existe
    const existingProduct = findProductInData(product.code);
    if (!existingProduct) {
      addProductsToData([{
        code: product.code,
        product_name: product.product_name,
        brands: product.brands,
        ingredients_text: product.ingredients_text,
        // 🔧 FIX: Usar imageUri en lugar de image_url
        image_url: product.imageUri || undefined
      }]);
    }
    
    await handleProductPressUtil(product, router);
    await saveToHistory(product.code);
  };

  const getCollectionInfo = (query: string) => {
    const info = getCollectionForSearchTerm(query);
    if (!info) return 'No determinada';
    return `DB${info.db} - ${info.collection}`;
  };

  // Funciones de paginación (sin cambios)
  const getTotalPages = () => Math.ceil(searchResults.length / RESULTS_PER_PAGE);
  
  const getCurrentPageResults = () => {
    const startIndex = (currentPage - 1) * RESULTS_PER_PAGE;
    const endIndex = startIndex + RESULTS_PER_PAGE;
    return searchResults.slice(startIndex, endIndex);
  };

  const goToPage = (page: number) => {
    const totalPages = getTotalPages();
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      
      const startIndex = (page - 1) * RESULTS_PER_PAGE;
      const endIndex = startIndex + RESULTS_PER_PAGE;
      const pageResults = searchResults.slice(startIndex, endIndex);
      
      const productsNeedingImages = pageResults.filter(product => 
        !product.imageUri && !product.imageLoading && !product.imageError
      );
      
      if (productsNeedingImages.length > 0) {
        console.log(`📸 Page ${page}: Loading images for ${productsNeedingImages.length} new products`);
        loadImagesForProducts(productsNeedingImages, setSearchResults);
      }
    }
  };

  const getPageNumbers = () => {
    const totalPages = getTotalPages();
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
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
            <Text style={{ color: '#999', fontSize: 12 }}>
              {' '}({product.relevanceScore >= 1500 ? 'Local' : 'API'}: {product.relevanceScore})
            </Text>
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
          placeholder="Search"
          value={searchText}
          onChangeText={(text) => {
            setSearchText(text);
            // 🔥 IMPORTANTE: Si se borra el texto, resetear hasSearched
            if (!text.trim()) {
              setHasSearched(false);
              setSearchResults([]);
            }
          }}
          onFocus={() => onFocusChange(true)}
          onBlur={() => {
            if (!searchText) {
              onFocusChange(false);
            }
          }}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        
        {/* 🔥 CAMBIO PRINCIPAL: Solo mostrar el botón cuando hay texto */}
        {searchText.trim() && (
          <TouchableOpacity
            style={[
              searchStyles.searchButton,
              searchLoading && searchStyles.searchButtonDisabled
            ]}
            onPress={handleSearch}
            disabled={searchLoading}
          >
            {searchLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={searchStyles.searchButtonText}>Search</Text>
            )}
          </TouchableOpacity>
        )}
        
        {searchText && !searchLoading ? (
          <TouchableOpacity
            style={searchStyles.clearButton}
            onPress={() => {
              setSearchText('');
              setSearchResults([]);
              setCurrentPage(1);
              // 🔥 IMPORTANTE: Resetear hasSearched al limpiar
              setHasSearched(false);
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
            <Text style={searchStyles.noResultsSubtext}>
              Searching ...
            </Text>
          </View>
        ) : searchText && searchResults.length > 0 ? (
          <>
            {getCurrentPageResults().map(product => renderProductClickable(product))}

            {/* Controles de paginación */}
            <View style={searchStyles.paginationContainer}>
              <View style={searchStyles.paginationInfo}>
                <Text style={searchStyles.paginationInfoText}>
                  Showing {((currentPage - 1) * RESULTS_PER_PAGE) + 1}-{Math.min(currentPage * RESULTS_PER_PAGE, searchResults.length)} of {searchResults.length} results
                </Text>
                <Text style={searchStyles.paginationInfoText}>
                  Page {currentPage} of {getTotalPages()}
                </Text>
              </View>

              {getTotalPages() > 1 && (
                <View style={searchStyles.paginationControls}>
                  <TouchableOpacity
                    style={[
                      searchStyles.paginationButton,
                      currentPage === 1 && searchStyles.paginationButtonDisabled
                    ]}
                    onPress={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <Text style={[
                      searchStyles.paginationButtonText,
                      currentPage === 1 && searchStyles.paginationButtonTextDisabled
                    ]}>‹</Text>
                  </TouchableOpacity>

                  <View style={searchStyles.paginationPageNumbers}>
                    {getPageNumbers().map(pageNum => (
                      <TouchableOpacity
                        key={pageNum}
                        style={[
                          searchStyles.paginationPageButton,
                          currentPage === pageNum && searchStyles.paginationPageButtonActive
                        ]}
                        onPress={() => goToPage(pageNum)}
                      >
                        <Text style={[
                          searchStyles.paginationPageButtonText,
                          currentPage === pageNum && searchStyles.paginationPageButtonTextActive
                        ]}>
                          {pageNum}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[
                      searchStyles.paginationButton,
                      currentPage === getTotalPages() && searchStyles.paginationButtonDisabled
                    ]}
                    onPress={() => goToPage(currentPage + 1)}
                    disabled={currentPage === getTotalPages()}
                  >
                    <Text style={[
                      searchStyles.paginationButtonText,
                      currentPage === getTotalPages() && searchStyles.paginationButtonTextDisabled
                    ]}>›</Text>
                  </TouchableOpacity>
                  </View>
              )}
            </View>
          </>
        ) : hasSearched && searchText && searchResults.length === 0 ? (
          // 🔥 CAMBIO CRÍTICO: Solo mostrar "no encontrado" si hasSearched es true
          <View style={searchStyles.noResultsContainer}>
            <Text style={searchStyles.noResultsText}>No products found for "{searchText}"</Text>
            <Text style={searchStyles.noResultsSubtext}>
              Searched locally and in: {getCollectionInfo(searchText)}
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