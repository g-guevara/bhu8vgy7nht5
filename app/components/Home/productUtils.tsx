// app/components/Home/productUtils.tsx - Utilidades de productos y componente de imagen

import React from 'react';
import { View, Text, ActivityIndicator, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { imageCacheUtils } from '../../utils/imageCacheUtils';
import { searchStyles } from '../../styles/HomeComponentStyles';
import { ProductWithImageAndEmoji } from './searchLogic';

// Componente de placeholder de imagen
const ImagePlaceholder: React.FC = () => (
  <View style={{
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0'
  }}>
    <MaterialCommunityIcons 
      name="image" 
      size={32} 
      color="#c0c0c0" 
    />
  </View>
);

// Función para cargar imágenes para una lista de productos
export const loadImagesForProducts = async (
  products: ProductWithImageAndEmoji[], 
  setProducts: React.Dispatch<React.SetStateAction<ProductWithImageAndEmoji[]>>
) => {
  console.log(`🖼️ Cargando imágenes para ${products.length} productos...`);
  
  // Procesar productos en paralelo pero con límite
  const processProduct = async (product: ProductWithImageAndEmoji) => {
    try {
      // Marcar como cargando en el estado global
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p.code === product.code ? { ...p, imageLoading: true, imageError: false } : p
        )
      );

      console.log(`🔍 Buscando imagen para producto: ${product.code}`);
      
      // ⏱️ TIMEOUT DE 30 SEGUNDOS
      const timeoutPromise = new Promise<string | null>((_, reject) => {
        setTimeout(() => reject(new Error('Image API timeout after 30 seconds')), 30000);
      });
      
      const imagePromise = imageCacheUtils.getProductImage(product.code);
      
      // Race entre la imagen y el timeout
      const imageUri = await Promise.race([imagePromise, timeoutPromise]);
      
      // Actualizar con la imagen obtenida o error en el estado global
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
        console.log(`✅ Imagen cargada para producto: ${product.code}`);
      } else {
        console.log(`❌ No se encontró imagen para producto: ${product.code}`);
      }
    } catch (error) {
      console.error(`❌ Error cargando imagen para producto ${product.code}:`, error);
      
      // Si es timeout, mostrar mensaje específico
      if (error instanceof Error && error.message.includes('timeout')) {
        console.log(`⏱️ Timeout de 30s alcanzado para producto: ${product.code}, usando fallback`);
      }
      
      // Actualizar estado global con error
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p.code === product.code ? { ...p, imageLoading: false, imageError: true } : p
        )
      );
    }
  };

  // Procesar productos con un pequeño delay para evitar sobrecarga
  for (let i = 0; i < products.length; i++) {
    setTimeout(() => processProduct(products[i]), i * 100); // 100ms delay entre cada producto
  }
};

// Componente de imagen del producto
export const ProductImage: React.FC<{ product: ProductWithImageAndEmoji }> = ({ product }) => {
  if (product.imageLoading) {
    return (
      <View style={[searchStyles.productImageContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  }

  if (product.imageUri && !product.imageError) {
    return (
      <View style={searchStyles.productImageContainer}>
        <Image
          source={{ uri: product.imageUri }}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 12,
          }}
          resizeMode="cover"
          onError={() => {
            console.log(`❌ Error cargando imagen para ${product.code}`);
          }}
        />
      </View>
    );
  }

  // Fallback al placeholder si no hay imagen o hay error
  return (
    <View style={searchStyles.productImageContainer}>
      <ImagePlaceholder />
    </View>
  );
};

// Función para manejar la navegación a detalles de producto
export const handleProductPress = async (
  product: ProductWithImageAndEmoji,
  router: any
) => {
  try {
    await AsyncStorage.setItem('selectedProduct', JSON.stringify(product));
    router.push('/screens/ProductInfoScreen');
  } catch (error) {
    console.error('Error storing product:', error);
  }
};