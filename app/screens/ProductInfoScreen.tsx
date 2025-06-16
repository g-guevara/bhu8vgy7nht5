// app/screens/ProductInfoScreen.tsx
// Version: 3.0.0 - Con sistema de cache inteligente

import React, { useState, useEffect, useRef } from 'react';
import { 
  SafeAreaView, 
  ScrollView, 
  View, 
  ActivityIndicator,
  TouchableOpacity,
  Text,
  BackHandler
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../data/productData';
import { styles } from '../styles/ProductInfoStyles';
import { ApiService } from '../services/api';
import { useToast } from '../utils/ToastContext';
import { ProductCacheAPI, CachedProduct } from '../utils/productCacheUtils';

// Import components
import ProductHeader from '../components/ProductInfo/ProductHeader';
import ProductDetails from '../components/ProductInfo/ProductDetails';
import ProductReactions from '../components/ProductInfo/ProductReactions';
import ProductNotes from '../components/ProductInfo/ProductNotes';
import ProductActions from '../components/ProductInfo/ProductActions';

// Constants
const AUTO_SAVE_DELAY = 3000; // 3 seconds
const NOTES_CHARACTER_LIMIT = 500; // Maximum characters for notes

export default function ProductInfoScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedReaction, setSelectedReaction] = useState<'Critic' | 'Sensitive' | 'Safe' | null>(null);
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [existingNote, setExistingNote] = useState<any>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [loadSource, setLoadSource] = useState<'cache' | 'storage' | 'none'>('none');
  
  // References for auto-save functionality
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedNotesRef = useRef<string>('');
  const notesBeforeEditRef = useRef<string>('');
  
  // Load the product when the component mounts
  useEffect(() => {
    const loadProduct = async () => {
      try {
        console.log('🔍 Loading product information...');
        
        // PASO 1: Intentar obtener código del producto de AsyncStorage
        const productJson = await AsyncStorage.getItem('selectedProduct');
        if (!productJson) {
          throw new Error('No product selected');
        }
        
        const tempProduct = JSON.parse(productJson);
        const productCode = tempProduct.code;
        
        if (!productCode) {
          throw new Error('Invalid product code');
        }
        
        console.log(`📦 Loading product: ${productCode}`);
        
        // PASO 2: Intentar cargar desde cache inteligente primero
        const cachedProduct = await ProductCacheAPI.getProduct(productCode);
        
        if (cachedProduct) {
          console.log(`💾 Product loaded from intelligent cache`);
          setProduct(cachedProduct);
          setLoadSource('cache');
          
          // Mostrar toast discreto indicando carga desde cache
          showToast('Loaded from cache', 'success');
          
          // After loading from cache, check if there are existing notes
          fetchExistingNotes(cachedProduct.code);
          setLoading(false);
          return;
        }
        
        // PASO 3: Si no está en cache, usar AsyncStorage como fallback
        console.log(`🗄️ Product not in cache, using fallback from AsyncStorage`);
        setProduct(tempProduct);
        setLoadSource('storage');
        
        // PASO 4: Guardar en cache para próximas veces
        await ProductCacheAPI.setProduct({
          code: tempProduct.code,
          product_name: tempProduct.product_name,
          brands: tempProduct.brands,
          ingredients_text: tempProduct.ingredients_text,
          image_url: tempProduct.image_url
        });
        
        console.log(`💾 Product saved to intelligent cache for future access`);
        
        // After loading product, check if there are existing notes
        fetchExistingNotes(tempProduct.code);
        
      } catch (error) {
        console.error('❌ Error loading product:', error);
        showToast('Failed to load product details', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
    
    // Set up back handler to save notes when user attempts to go back
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        saveNotesIfChanged();
        return false; // Don't prevent default back action
      }
    );
    
    return () => {
      // Clear auto-save timer when component unmounts
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      backHandler.remove();
      
      // Save notes if needed before unmounting
      saveNotesIfChanged();
    };
  }, []);
  
  // Effect for handling auto-save
  useEffect(() => {
    // Skip initial render
    if (loading) return;
    
    // Don't auto-save if notes haven't changed
    if (notes === lastSavedNotesRef.current) return;
    
    // Clear previous timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    // Set new timer for auto-save
    autoSaveTimerRef.current = setTimeout(() => {
      if (notes.trim() && notes !== lastSavedNotesRef.current) {
        saveNotes(notes, true);
      }
    }, AUTO_SAVE_DELAY);
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [notes, loading]);
  
  // Save notes when screen loses focus
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        saveNotesIfChanged();
      };
    }, [notes])
  );
  
  // Check if notes need to be saved before leaving
  const saveNotesIfChanged = () => {
    if (notes.trim() && notes !== lastSavedNotesRef.current) {
      saveNotes(notes, true);
    }
  };
  
  // Fetch existing notes for this product
  const fetchExistingNotes = async (productID: string) => {
    try {
      const allNotes = await ApiService.getProductNotes();
      const productNote = allNotes.find((note: any) => note.productID === productID);
      
      if (productNote) {
        setExistingNote(productNote);
        setNotes(productNote.note);
        lastSavedNotesRef.current = productNote.note;
        notesBeforeEditRef.current = productNote.note;
      }
    } catch (error) {
      console.error('Error fetching product notes:', error);
      // We don't need to show an error toast here as it's not critical
    }
  };
  
  // Handle saving notes with optimistic updates
  const saveNotes = async (noteContent: string, isAutoSave = false) => {
    if (!product || !noteContent.trim()) {
      return;
    }
    
    // Prevent duplicate saves
    if (noteContent === lastSavedNotesRef.current) {
      return;
    }
    
    // Set optimistic UI updates
    if (!isAutoSave) {
      setIsSavingNotes(true);
    } else {
      setAutoSaveStatus('saving');
    }
    
    // Store the note content before making API call
    const noteToSave = noteContent.trim();
    
    // Optimistically update the UI
    notesBeforeEditRef.current = notes;
    
    try {
      let response;
      
      if (existingNote) {
        // Update existing note
        response = await ApiService.updateProductNote(existingNote._id, noteToSave);
      } else {
        // Create new note
        response = await ApiService.addProductNote(product.code, noteToSave);
      }
      
      // Update reference values on success
      lastSavedNotesRef.current = noteToSave;
      setExistingNote(response);
      
      if (!isAutoSave) {
        showToast('Notes saved successfully', 'success');
      } else {
        setAutoSaveStatus('saved');
        
        // Reset the status after a delay
        setTimeout(() => {
          setAutoSaveStatus('idle');
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error saving notes:', error);
      
      // Revert to previous state on error
      setNotes(notesBeforeEditRef.current);
      
      if (!isAutoSave) {
        showToast(error.message || 'Failed to save notes', 'error');
      }
    } finally {
      if (!isAutoSave) {
        setIsSavingNotes(false);
      } else {
        setAutoSaveStatus('idle');
      }
    }
  };
  
  // Handle manual save button press
  const handleSaveNotes = () => {
    saveNotes(notes);
  };

  const handleBack = () => {
    // Save notes if needed before navigating back
    saveNotesIfChanged();
    
    // Clean up AsyncStorage and go back
    AsyncStorage.removeItem('selectedProduct').then(() => {
      router.back();
    });
  };

  // 🆕 Función para mostrar estadísticas del cache (solo en desarrollo)
  const showCacheStats = async () => {
    if (!__DEV__) return;
    
    try {
      const stats = await ProductCacheAPI.getStats();
      console.log('📊 Product Cache Stats:', {
        totalProducts: stats.totalProducts,
        cacheSizeMB: stats.totalSizeMB,
        hitRate: `${stats.cacheHitRate}%`,
        oldestProduct: stats.oldestProductAge,
        mostAccessed: stats.mostAccessedProduct?.product_name
      });
      
      showToast(`Cache: ${stats.totalProducts} products, ${stats.cacheHitRate}% hit rate`, 'success');
    } catch (error) {
      console.error('Error getting cache stats:', error);
    }
  };

  // Show loading indicator while fetching the product
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#000" />
            <Text style={styles.backText}>Home</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Information</Text>
          {/* 🆕 Botón de estadísticas en desarrollo */}
          {__DEV__ && (
            <TouchableOpacity 
              onPress={showCacheStats}
              style={{ position: 'absolute', right: 16, padding: 8 }}
            >
              <Text style={{ fontSize: 16 }}>📊</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={{ marginTop: 15, color: '#666' }}>
            Loading product details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // If no product found, show an error
  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#000" />
            <Text style={styles.backText}>Home</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Information</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Product not found</Text>
          <TouchableOpacity onPress={handleBack} style={styles.errorButton}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#000" />
          <Text style={styles.backText}>Home</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Information</Text>
        
        {/* 🆕 Indicador de fuente de carga y botón de estadísticas en desarrollo */}
        {__DEV__ && (
          <View style={{ position: 'absolute', right: 16, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ 
              fontSize: 12, 
              color: loadSource === 'cache' ? '#34C759' : '#666',
              marginRight: 8,
              fontWeight: '600'
            }}>
              {loadSource === 'cache' ? '💾' : '🗄️'}
            </Text>
            <TouchableOpacity onPress={showCacheStats} style={{ padding: 8 }}>
              <Text style={{ fontSize: 16 }}>📊</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.productInfoContainer}>
          {/* Component 1: Product Header (Image and Name) */}
          <ProductHeader product={product} />
          
          <View style={styles.divider} />
          
          {/* Component 2: Product Details (Brand and Ingredients) */}
          <ProductDetails product={product} />
          
          <View style={styles.divider} />
          
          {/* Component 5: Product Actions (Wishlist and Test buttons) */}
          <ProductActions product={product} />
          
          <View style={styles.divider} />
          
          {/* Component 3: Product Reactions */}
          <ProductReactions 
            selectedReaction={selectedReaction} 
            setSelectedReaction={setSelectedReaction} 
            product={product} 
          />
          
          <View style={styles.divider} />
          
          {/* Component 4: Product Notes with character limit */}
          <ProductNotes 
            notes={notes} 
            setNotes={setNotes}
            onSaveNotes={handleSaveNotes}
            isSaving={isSavingNotes}
            autoSaveStatus={autoSaveStatus}
            characterLimit={NOTES_CHARACTER_LIMIT}
          />
          
          {/* 🆕 Información del cache (solo en desarrollo) */}
          {__DEV__ && (
            <View style={{
              marginTop: 20,
              padding: 12,
              backgroundColor: '#f8f9fa',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#e9ecef'
            }}>
              <Text style={{ fontSize: 12, color: '#666', fontWeight: '600' }}>
                🔧 Development Info
              </Text>
              <Text style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                Loaded from: {loadSource === 'cache' ? 'Intelligent Cache 💾' : 'AsyncStorage 🗄️'}
              </Text>
              <Text style={{ fontSize: 11, color: '#666' }}>
                Product Code: {product.code}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}