// app/screens/ProductInfoScreen.tsx
// Version: 4.3.0 - FIXED: Actualización automática de ingredientes coloreados

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
import { styles } from '../styles/ProductInfoStyles';
import { ApiService } from '../services/api';
import { useToast } from '../utils/ToastContext';

// 🆕 IMPORTAR EL NUEVO SISTEMA DE DATOS INTEGRADO
import { 
  Product, 
  findProductInData, 
  addProductToData,
  getProductDataStats 
} from '../data/productData';

// 🆕 IMPORTAR EL SISTEMA DE CACHE DE IMÁGENES
import { imageCacheUtils } from '../utils/imageCacheUtils';

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
  
  // 🔥 NUEVO: Estado para forzar recarga de ingredientes
  const [ingredientsKey, setIngredientsKey] = useState(0);
  
  // Estados para el sistema de cache de imágenes
  const [productImageUri, setProductImageUri] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  
  // Estado para información del sistema de datos
  const [dataSource, setDataSource] = useState<'integrated' | 'asyncstorage' | 'none'>('none');
  const [dataStats, setDataStats] = useState<{
    totalProducts: number;
    cachedProducts: number;
    cacheSizeKB: number;
  } | null>(null);
  
  // References for auto-save functionality
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedNotesRef = useRef<string>('');
  const notesBeforeEditRef = useRef<string>('');
  
  // 🔥 NUEVO: Función para forzar recarga de ingredientes
  const forceIngredientsReload = () => {
    console.log('🔄 Forcing ingredients reload...');
    setIngredientsKey(prev => prev + 1);
  };
  
  // 🔥 NUEVO: Función que se llama cuando se guarda una reacción
  const handleReactionSaved = () => {
    console.log('✅ Reaction saved, reloading ingredients...');
    forceIngredientsReload();
  };
  
  // Función para cargar imagen desde cache
  const loadProductImage = async (productCode: string) => {
    setImageLoading(true);
    try {
      console.log(`🖼️ Loading image for product: ${productCode}`);
      const imageUri = await imageCacheUtils.getProductImage(productCode);
      
      if (imageUri) {
        console.log(`✅ Image loaded for product: ${productCode}`);
        setProductImageUri(imageUri);
      } else {
        console.log(`❌ No image found for product: ${productCode}`);
        setProductImageUri(null);
      }
    } catch (error) {
      console.error(`❌ Error loading image for product ${productCode}:`, error);
      setProductImageUri(null);
    } finally {
      setImageLoading(false);
    }
  };
  
  // Load the product when the component mounts
  useEffect(() => {
    /**
     * Valida y normaliza los datos del producto para asegurar que tengan el formato correcto
     */
    const validateAndNormalizeProduct = (rawProduct: any): Product | null => {
      try {
        // Verificar que el objeto básico existe
        if (!rawProduct || typeof rawProduct !== 'object') {
          console.error('❌ Product data is not a valid object:', rawProduct);
          return null;
        }

        // Verificar que code existe y convertirlo a string si es necesario
        if (!rawProduct.code) {
          console.error('❌ Product missing code:', rawProduct);
          return null;
        }

        // Normalizar las propiedades asegurándose de que sean strings
        const normalizedProduct: Product = {
          code: String(rawProduct.code).trim(),
          product_name: String(rawProduct.product_name || 'Unknown Product').trim(),
          brands: String(rawProduct.brands || 'Unknown Brand').trim(),
          ingredients_text: String(rawProduct.ingredients_text || '').trim(),
          image_url: rawProduct.image_url ? String(rawProduct.image_url).trim() : undefined
        };

        // Validar que code no esté vacío después de la normalización
        if (!normalizedProduct.code) {
          console.error('❌ Product code is empty after normalization');
          return null;
        }

        console.log('✅ Product validated and normalized:', {
          code: normalizedProduct.code,
          name: normalizedProduct.product_name,
          hasImage: !!normalizedProduct.image_url
        });

        return normalizedProduct;
      } catch (error) {
        console.error('❌ Error validating product:', error);
        return null;
      }
    };

    const loadProduct = async () => {
      try {
        console.log('🔍 Loading product information...');
        
        // PASO 1: Obtener código del producto de AsyncStorage
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
        
        // PASO 2: Buscar en el sistema de datos integrado
        const integratedProduct = findProductInData(productCode);
        
        if (integratedProduct) {
          console.log(`💾 Product found in integrated data system`);
          
          // Validar producto integrado
          const validatedProduct = validateAndNormalizeProduct(integratedProduct);
          if (validatedProduct) {
            setProduct(validatedProduct);
            setDataSource('integrated');
            
            // Cargar imagen desde cache
            await loadProductImage(validatedProduct.code);
            
            loadDataStats();
            fetchExistingNotes(validatedProduct.code);
            setLoading(false);
            return;
          } else {
            console.log('❌ Integrated product failed validation, falling back to AsyncStorage');
          }
        }
        
        // PASO 3: Si no está en datos integrados, usar AsyncStorage como fallback
        console.log(`🗄️ Product not in integrated data, using AsyncStorage fallback`);
        
        // Validar producto de AsyncStorage
        const validatedProduct = validateAndNormalizeProduct(tempProduct);
        if (!validatedProduct) {
          throw new Error('Invalid product data from AsyncStorage');
        }
        
        setProduct(validatedProduct);
        setDataSource('asyncstorage');
        
        // Cargar imagen desde cache
        await loadProductImage(validatedProduct.code);
        
        // PASO 4: Agregar al sistema integrado para próximas veces
        addProductToData({
          code: validatedProduct.code,
          product_name: validatedProduct.product_name,
          brands: validatedProduct.brands,
          ingredients_text: validatedProduct.ingredients_text,
          image_url: validatedProduct.image_url
        });
        
        console.log(`💾 Product added to integrated data system for future access`);
        
        // Cargar estadísticas y notas
        loadDataStats();
        fetchExistingNotes(validatedProduct.code);
        
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

  // Cargar estadísticas del sistema de datos
  const loadDataStats = async () => {
    try {
      const stats = await getProductDataStats();
      setDataStats({
        totalProducts: stats.totalProducts,
        cachedProducts: stats.cachedProducts,
        cacheSizeKB: stats.cacheSizeKB
      });
    } catch (error) {
      console.error('Error loading data stats:', error);
    }
  };
  
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

  // Función para mostrar estadísticas del sistema (solo en desarrollo)
  const showDataStats = async () => {
    if (!__DEV__) return;
    
    try {
      const stats = await getProductDataStats();
      console.log('📊 Integrated Data Stats:', {
        totalProducts: stats.totalProducts,
        cachedProducts: stats.cachedProducts,
        originalProducts: stats.originalProducts,
        cacheSizeKB: stats.cacheSizeKB,
        mostAccessed: stats.mostAccessedProduct?.product_name
      });
      
      showToast(`Data: ${stats.totalProducts} products, ${stats.cacheSizeKB}KB`, 'success');
    } catch (error) {
      console.error('Error getting data stats:', error);
    }
  };

  // Show loading indicator while fetching the product
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#000" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Information</Text>
          {/* Botón de estadísticas en desarrollo */}
          {__DEV__ && (
            <TouchableOpacity 
              onPress={showDataStats}
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
            <Text style={styles.backText}>Back</Text>
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
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Information</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.productInfoContainer}>
          {/* Component 1: Product Header (Image and Name) */}
          <ProductHeader 
            product={product} 
            imageUri={productImageUri}
            imageLoading={imageLoading}
          />
          
          <View style={styles.divider} />
          
          {/* Component 2: Product Details (Brand and Ingredients) - 🔥 CON KEY PARA FORZAR RECARGA */}
          <ProductDetails 
            key={ingredientsKey} 
            product={product} 
          />
          
          <View style={styles.divider} />
          
          {/* Component 5: Product Actions (Wishlist and Test buttons) */}
          <ProductActions product={product} />
          
          <View style={styles.divider} />
          
          {/* Component 3: Product Reactions - 🔥 CON CALLBACK PARA RECARGAR INGREDIENTES */}
          <ProductReactions 
            selectedReaction={selectedReaction} 
            setSelectedReaction={setSelectedReaction} 
            product={product}
            onReactionSaved={handleReactionSaved}
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}