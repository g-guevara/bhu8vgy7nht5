// app/components/Home/productUtils.tsx - Utilidades de productos y componente de imagen

import React from 'react';
import { View, Text, ActivityIndicator, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { imageCacheUtils } from '../../utils/imageCacheUtils';
import { searchStyles } from '../../styles/HomeComponentStyles';
import { ProductWithImageAndEmoji } from './searchLogic';

// Emoji simplificado: solo devuelve plato y cubiertos para todos
export function generateEmojiForProduct(product: ProductWithImageAndEmoji): string {
  return '🍽️';
}

// Función para cargar imágenes para una lista de productos
export const loadImagesForProducts = async (
  products: ProductWithImageAndEmoji[], 
  setProducts: React.Dispatch<React.SetStateAction<ProductWithImageAndEmoji[]>>
) => {
  console.log(`🖼️ Cargando imágenes para ${products.length} productos...`);
  
  // Procesar productos en paralelo pero con límite
  const processProduct = async (product: ProductWithImageAndEmoji, index: number) => {
    try {
      // Marcar como cargando
      setProducts(prevProducts => 
        prevProducts.map((p, i) => 
          i === index ? { ...p, imageLoading: true, imageError: false } : p
        )
      );

      console.log(`🔍 Buscando imagen para producto: ${product.code}`);
      const imageUri = await imageCacheUtils.getProductImage(product.code);
      
      // Actualizar con la imagen obtenida o error
      setProducts(prevProducts => 
        prevProducts.map((p, i) => 
          i === index ? { 
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
      setProducts(prevProducts => 
        prevProducts.map((p, i) => 
          i === index ? { ...p, imageLoading: false, imageError: true } : p
        )
      );
    }
  };

  // Procesar productos con un pequeño delay para evitar sobrecarga
  for (let i = 0; i < products.length; i++) {
    setTimeout(() => processProduct(products[i], i), i * 100); // 100ms delay entre cada producto
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

  // Fallback al emoji si no hay imagen o hay error
  return (
    <View style={searchStyles.productImageContainer}>
      <Text style={searchStyles.productEmoji}>{product.emoji}</Text>
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

// Función para renderizar un item de producto
export const renderProductItem = (
  product: ProductWithImageAndEmoji,
  onPress: (product: ProductWithImageAndEmoji) => void
) => (
  <View
    key={product.code}
    style={searchStyles.productItem}
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
  </View>
);