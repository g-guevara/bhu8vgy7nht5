// app/components/Home/SearchComponent.tsx - Con precarga inteligente de cache
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


import { ProductCacheAPI } from '../../utils/productCacheUtils';

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
  
  // 🆕 Estados para cache
  const [cachingProgress, setCachingProgress] = useState<{
    isActive: boolean;
    processed: number;
    total: number;
  }>({ isActive: false, processed: 0, total: 0 });
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const RESULTS_PER_PAGE = 15;
  
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
            // 🆕 PRIMERO: Intentar cargar desde cache inteligente
            const cachedProduct = await ProductCacheAPI.getProduct(historyItem.code);
            
            if (cachedProduct) {
              console.log(`💾 History item ${historyItem.code} loaded from cache`);
              historyProducts.push({
                ...cachedProduct,
                relevanceScore: 1000,
                imageUri: null,
                imageLoading: false,
                imageError: false
              });
              continue; // Pasar al siguiente item
            }
            
            // FALLBACK: Si no está en cache, usar el método original
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
                  
                  // 🆕 Guardar en cache para próximas veces
                  await ProductCacheAPI.setProduct({
                    code: product.code,
                    product_name: product.product_name,
                    brands: product.brands,
                    ingredients_text: product.ingredients_text,
                    image_url: product.image_url
                  });
                }
              }
            }
          } catch (error) {
            console.error(`Error loading history item ${historyItem.code}:`, error);
          }
        }
        
        setHistoryItems(historyProducts);
        // 🎯 OPTIMIZACIÓN: Cargar imágenes para items del historial (pocos items)
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

  // 🆕 FUNCIÓN PARA PRECARGAR PRODUCTOS EN CACHE
  const preloadProductsToCache = async (products: ProductWithImageAndEmoji[]) => {
    if (products.length === 0) return;
    
    try {
      setCachingProgress({ isActive: true, processed: 0, total: products.length });
      
      console.log(`🚀 Starting to preload ${products.length} products to cache...`);
      
      // Procesar en lotes de 10 para mejor performance
      const batchSize = 10;
      let processed = 0;
      
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);
        
        // Preparar productos para cache
        const productsToCache = batch.map(product => ({
          code: product.code,
          product_name: product.product_name,
          brands: product.brands,
          ingredients_text: product.ingredients_text,
          image_url: product.image_url
        }));
        
        // Precargar lote
        await ProductCacheAPI.preloadProducts(productsToCache);
        
        processed += batch.length;
        setCachingProgress(prev => ({ ...prev, processed }));
        
        // Pequeña pausa para no bloquear la UI
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      console.log(`✅ Successfully preloaded ${processed} products to cache`);
      
      // Mostrar estadísticas en desarrollo
      if (__DEV__) {
        const stats = await ProductCacheAPI.getStats();
        console.log(`📊 Cache now contains ${stats.totalProducts} products (${stats.totalSizeMB}MB)`);
      }
      
    } catch (error) {
      console.error('❌ Error preloading products to cache:', error);
    } finally {
      // Ocultar indicador después de un pequeño delay
      setTimeout(() => {
        setCachingProgress({ isActive: false, processed: 0, total: 0 });
      }, 1000);
    }
  };

  // FUNCIÓN PRINCIPAL DE BÚSQUEDA - ACTUALIZADA CON PRECARGA
  const handleSearch = async () => {
    const searchQuery = searchText.trim();
    
    if (!searchQuery) {
      setSearchResults([]);
      setCurrentPage(1);
      return;
    }

    setSearchLoading(true);
    setCurrentPage(1);
    try {
      console.log(`🔍 Iniciando búsqueda: "${searchQuery}"`);
      
      // Usar la función de búsqueda del archivo searchLogic
      const results = await searchInSpecificCollection(searchQuery);
      
      setSearchResults(results);
      
      console.log(`✅ Búsqueda completada: ${results.length} resultados`);
      
      // 🎯 OPTIMIZACIÓN: Solo cargar imágenes de la primera página
      if (results.length > 0) {
        const firstPageResults = results.slice(0, RESULTS_PER_PAGE);
        loadImagesForProducts(firstPageResults, setSearchResults);
        console.log(`📸 Cargando imágenes solo para los primeros ${firstPageResults.length} productos`);
        
        // 🆕 NUEVA FUNCIONALIDAD: Precargar productos en cache en background
        // Solo precargar si hay más de 5 resultados para que valga la pena
        if (results.length > 5) {
          // Ejecutar en background sin bloquear la UI
          setTimeout(() => {
            preloadProductsToCache(results);
          }, 500); // Delay de 500ms para que la UI se actualice primero
        }
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
    // 🆕 Asegurar que el producto esté en cache antes de navegar
    try {
      await ProductCacheAPI.setProduct({
        code: product.code,
        product_name: product.product_name,
        brands: product.brands,
        ingredients_text: product.ingredients_text,
        image_url: product.image_url
      });
    } catch (error) {
      console.error('Error caching product before navigation:', error);
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
      
      // 🎯 OPTIMIZACIÓN: Cargar imágenes solo de la nueva página
      const startIndex = (page - 1) * RESULTS_PER_PAGE;
      const endIndex = startIndex + RESULTS_PER_PAGE;
      const pageResults = searchResults.slice(startIndex, endIndex);
      
      // Filtrar solo productos que no tienen imagen cargada aún
      const productsNeedingImages = pageResults.filter(product => 
        !product.imageUri && !product.imageLoading && !product.imageError
      );
      
      if (productsNeedingImages.length > 0) {
        console.log(`📸 Página ${page}: Cargando imágenes para ${productsNeedingImages.length} productos nuevos`);
        loadImagesForProducts(productsNeedingImages, setSearchResults);
      } else {
        console.log(`✅ Página ${page}: Todas las imágenes ya están cargadas`);
      }
    }
  };

  const getPageNumbers = () => {
    const totalPages = getTotalPages();
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Ajustar si estamos cerca del final
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
              setCurrentPage(1);
              onFocusChange(false);
            }}
          >
            <Text style={searchStyles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* 🆕 INDICADOR DE PROGRESO DE CACHE */}
      {cachingProgress.isActive && (
        <View style={{
          paddingHorizontal: 20,
          paddingVertical: 8,
          backgroundColor: '#f8f9fa',
          borderBottomWidth: 1,
          borderBottomColor: '#e0e0e0'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 12, color: '#666', fontWeight: '500' }}>
              💾 Caching products for faster access...
            </Text>
            <Text style={{ fontSize: 12, color: '#666' }}>
              {cachingProgress.processed}/{cachingProgress.total}
            </Text>
          </View>
          <View style={{
            height: 2,
            backgroundColor: '#e0e0e0',
            borderRadius: 1,
            marginTop: 4,
            overflow: 'hidden'
          }}>
            <View style={{
              height: '100%',
              backgroundColor: '#007AFF',
              width: `${(cachingProgress.processed / cachingProgress.total) * 100}%`,
              borderRadius: 1
            }} />
          </View>
        </View>
      )}

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
            {/* Resultados de la página actual */}
            {getCurrentPageResults().map(product => renderProductClickable(product))}

            {/* Información y controles de paginación al final */}
            <View style={searchStyles.paginationContainer}>
              <View style={searchStyles.paginationInfo}>
                <Text style={searchStyles.paginationInfoText}>
                  Mostrando {((currentPage - 1) * RESULTS_PER_PAGE) + 1}-{Math.min(currentPage * RESULTS_PER_PAGE, searchResults.length)} de {searchResults.length} resultados
                </Text>
                <Text style={searchStyles.paginationInfoText}>
                  Página {currentPage} de {getTotalPages()}
                </Text>
              </View>

              {/* Controles de paginación */}
              {getTotalPages() > 1 && (
                <View style={searchStyles.paginationControls}>
                  {/* Botón Anterior */}
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

                  {/* Números de página */}
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

                  {/* Botón Siguiente */}
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