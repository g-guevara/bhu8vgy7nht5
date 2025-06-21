// app/components/Home/SearchComponent.tsx - FIXED: Race condition en carga de imágenes
import React, { useState, useEffect, useRef } from 'react';
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
import { imageCacheUtils } from '../../utils/imageCacheUtils';

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
  
  // 🆕 NUEVO: Estado para trackear si el input está enfocado
  const [isInputFocused, setIsInputFocused] = useState(false);
  
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

  // 🔥 NUEVO: Referencias para cancelar operaciones pendientes
  const imageTimeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const currentSearchIdRef = useRef<string>('');

  useEffect(() => {
    loadHistoryFromStorage();
    loadCacheStats();
    
    // 🔥 NUEVO: Limpiar timeouts al desmontar componente
    return () => {
      clearAllImageTimeouts();
    };
  }, []);

  // 🔥 NUEVA FUNCIÓN: Limpiar todos los timeouts de imágenes
  const clearAllImageTimeouts = () => {
    imageTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    imageTimeoutsRef.current.clear();
  };

  // 🔥 NUEVA FUNCIÓN: Generar ID único para cada búsqueda
  const generateSearchId = (): string => {
    return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

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
        
        // 🔥 CARGAR IMÁGENES CON CANCELACIÓN
        if (historyProducts.length > 0) {
          console.log(`🚀 [Search] Iniciando carga de imágenes para historial`);
          const searchId = generateSearchId();
          loadImagesForProductsWithCancellation(historyProducts, setHistoryItems, searchId);
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

  // 🔥 NUEVA FUNCIÓN: Cargar imágenes con sistema de cancelación
  const loadImagesForProductsWithCancellation = async (
    products: ProductWithImageAndEmoji[], 
    setProducts: React.Dispatch<React.SetStateAction<ProductWithImageAndEmoji[]>>,
    searchId: string
  ) => {
    console.log(`🖼️ [Search] Cargando imágenes para ${products.length} productos... (ID: ${searchId})`);
    
    // Procesar productos con un pequeño delay para evitar sobrecarga
    for (let i = 0; i < products.length; i++) {
      const timeout = setTimeout(() => {
        // 🔥 VERIFICAR SI ESTA BÚSQUEDA SIGUE SIENDO VÁLIDA
        if (currentSearchIdRef.current !== searchId && searchId !== 'history') {
          console.log(`❌ [Search] Operación cancelada para ${products[i].code} (búsqueda obsoleta)`);
          return;
        }
        
        loadProductImageWithCancellation(products[i], setProducts, searchId);
        
        // Remover timeout de la lista una vez ejecutado
        imageTimeoutsRef.current.delete(timeout);
      }, i * 100);
      
      // Agregar timeout a la lista para poder cancelarlo
      imageTimeoutsRef.current.add(timeout);
    }
  };

  // 🔥 NUEVA FUNCIÓN: Cargar imagen con verificación de cancelación
  const loadProductImageWithCancellation = async (
    product: ProductWithImageAndEmoji,
    setProducts: React.Dispatch<React.SetStateAction<ProductWithImageAndEmoji[]>>,
    searchId: string
  ) => {
    try {
      // 🔥 VERIFICAR CANCELACIÓN ANTES DE EMPEZAR
      if (currentSearchIdRef.current !== searchId && searchId !== 'history') {
        console.log(`❌ [Search] Operación cancelada para ${product.code} antes de empezar`);
        return;
      }

      // Marcar como cargando
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p.code === product.code ? { ...p, imageLoading: true, imageError: false } : p
        )
      );

      console.log(`🔍 [Search] Buscando imagen para producto: ${product.code}`);
      
      // 🚀 PRIORIDAD 1: USAR image_url SI EXISTE (productos SSS)
      const productWithImageUrl = product as Product & ProductWithImageAndEmoji;
      if (productWithImageUrl.image_url && productWithImageUrl.image_url.trim()) {
        // 🔥 VERIFICAR CANCELACIÓN ANTES DE ACTUALIZAR
        if (currentSearchIdRef.current !== searchId && searchId !== 'history') {
          console.log(`❌ [Search] Operación cancelada para ${product.code} en image_url`);
          return;
        }

        console.log(`🖼️ [Search] Usando image_url directa para ${product.code}`);
        
        setProducts(prevProducts => 
          prevProducts.map(p => 
            p.code === product.code ? { 
              ...p, 
              imageUri: productWithImageUrl.image_url,
              imageLoading: false, 
              imageError: false 
            } : p
          )
        );
        
        console.log(`✅ [Search] Imagen directa configurada para producto: ${product.code}`);
        return;
      }
      
      // 🔍 FALLBACK: Buscar en OpenFoodFacts solo si NO tiene image_url
      console.log(`🌐 [Search] Buscando en OpenFoodFacts para: ${product.code}`);
      
      // 🔥 VERIFICAR CANCELACIÓN ANTES DE LLAMADA API
      if (currentSearchIdRef.current !== searchId && searchId !== 'history') {
        console.log(`❌ [Search] Operación cancelada para ${product.code} antes de API`);
        return;
      }

      // Usar la función existente de productUtils.tsx con verificación
      await loadImagesForProductsWithApiCall(product, setProducts, searchId);
      
    } catch (error) {
      console.error(`❌ [Search] Error cargando imagen para producto ${product.code}:`, error);
      
      // Solo actualizar si la búsqueda sigue siendo válida
      if (currentSearchIdRef.current === searchId || searchId === 'history') {
        setProducts(prevProducts => 
          prevProducts.map(p => 
            p.code === product.code ? { ...p, imageLoading: false, imageError: true } : p
          )
        );
      }
    }
  };

  // 🔥 NUEVA FUNCIÓN: Llamar API con verificación de cancelación
  const loadImagesForProductsWithApiCall = async (
    product: ProductWithImageAndEmoji,
    setProducts: React.Dispatch<React.SetStateAction<ProductWithImageAndEmoji[]>>,
    searchId: string
  ) => {
    // Implementar la lógica de la función original loadImagesForProducts pero con verificaciones
    try {
      // Verificar cancelación antes de la llamada costosa
      if (currentSearchIdRef.current !== searchId && searchId !== 'history') {
        console.log(`❌ [Search] API call cancelada para ${product.code}`);
        return;
      }

      const imageUri = await imageCacheUtils.getProductImage(product.code);
      
      // Verificar cancelación antes de actualizar el estado
      if (currentSearchIdRef.current !== searchId && searchId !== 'history') {
        console.log(`❌ [Search] Update cancelado para ${product.code}`);
        return;
      }
      
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p.code === product.code ? { 
            ...p, 
            imageUri, 
            imageLoading: false, 
            imageError: !imageUri 
          } : p
        )
      );

      if (imageUri) {
        console.log(`✅ [Search] Imagen de OpenFoodFacts cargada para producto: ${product.code}`);
      } else {
        console.log(`❌ [Search] No se encontró imagen para producto: ${product.code}`);
      }
    } catch (error) {
      console.error(`❌ [Search] Error en API call para ${product.code}:`, error);
      throw error;
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
            image_url: (product as any).image_url || undefined
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

  // 🔥 FUNCIÓN PRINCIPAL DE BÚSQUEDA - ACTUALIZADA CON CANCELACIÓN
  const handleSearch = async () => {
    const searchQuery = searchText.trim();
    
    if (!searchQuery) {
      // 🔥 CANCELAR OPERACIONES PENDIENTES AL LIMPIAR
      clearAllImageTimeouts();
      currentSearchIdRef.current = '';
      
      setSearchResults([]);
      setCurrentPage(1);
      setHasSearched(false);
      return;
    }

    // 🔥 CANCELAR OPERACIONES PENDIENTES DE BÚSQUEDA ANTERIOR
    clearAllImageTimeouts();
    
    // 🔥 GENERAR NUEVO ID DE BÚSQUEDA
    const searchId = generateSearchId();
    currentSearchIdRef.current = searchId;

    setSearchLoading(true);
    setCurrentPage(1);
    setHasSearched(true);
    
    try {
      console.log(`🔍 Starting hybrid search for: "${searchQuery}" (ID: ${searchId})`);
      
      // Usar búsqueda híbrida
      const results = await performHybridSearch(searchQuery);
      
      // 🔥 VERIFICAR QUE ESTA BÚSQUEDA SIGUE SIENDO VÁLIDA
      if (currentSearchIdRef.current !== searchId) {
        console.log(`❌ Search cancelled: ${searchQuery} (búsqueda obsoleta)`);
        return;
      }
      
      setSearchResults(results);
      
      console.log(`✅ Hybrid search completed: ${results.length} total results`);
      
      // 🔥 CARGAR IMÁGENES CON SISTEMA DE CANCELACIÓN
      if (results.length > 0) {
        const firstPageResults = results.slice(0, RESULTS_PER_PAGE);
        loadImagesForProductsWithCancellation(firstPageResults, setSearchResults, searchId);
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
      // Solo actualizar si esta búsqueda sigue siendo válida
      if (currentSearchIdRef.current === searchId) {
        setSearchResults([]);
      }
    } finally {
      // Solo actualizar loading si esta búsqueda sigue siendo válida
      if (currentSearchIdRef.current === searchId) {
        setSearchLoading(false);
      }
    }
  };

  const handleProductPress = async (product: ProductWithImageAndEmoji) => {
    // Agregar producto al sistema integrado si no existe
    const existingProduct = findProductInData(product.code);
    if (!existingProduct) {
      const productWithImageUrl = product as Product & ProductWithImageAndEmoji;
      addProductsToData([{
        code: product.code,
        product_name: product.product_name,
        brands: product.brands,
        ingredients_text: product.ingredients_text,
        image_url: productWithImageUrl.image_url || undefined
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

  // Funciones de paginación
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
        const searchId = currentSearchIdRef.current || generateSearchId();
        loadImagesForProductsWithCancellation(productsNeedingImages, setSearchResults, searchId);
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
            // 🔥 CANCELAR OPERACIONES AL LIMPIAR TEXTO
            if (!text.trim()) {
              clearAllImageTimeouts();
              currentSearchIdRef.current = '';
              setHasSearched(false);
              setSearchResults([]);
            }
          }}
          onFocus={() => {
            setIsInputFocused(true);
            onFocusChange(true);
          }}
          onBlur={() => {
            setIsInputFocused(false);
            if (!searchText) {
              onFocusChange(false);
            }
          }}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        
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
        
        {(isInputFocused || searchText) && !searchLoading ? (
          <TouchableOpacity
            style={searchStyles.clearButton}
            onPress={() => {
              // 🔥 CANCELAR TODO AL LIMPIAR
              clearAllImageTimeouts();
              currentSearchIdRef.current = '';
              
              setSearchText('');
              setSearchResults([]);
              setCurrentPage(1);
              setHasSearched(false);
              setIsInputFocused(false);
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