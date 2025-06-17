// app/components/ProductInfo/ProductHeader.tsx - CORREGIDO COMPLETO
import React from 'react';
import { View, Text, Image, ActivityIndicator } from 'react-native';
import { Product } from '../../data/productData';
import { styles } from '../../styles/ProductInfoStyles';

interface ProductHeaderProps {
  product: Product;
  imageUri?: string | null;
  imageLoading?: boolean;
}

const ProductHeader: React.FC<ProductHeaderProps> = ({ 
  product, 
  imageUri, 
  imageLoading = false 
}) => {
  // 🔧 FIX MEJORADO: Verificar que product.code existe Y es un string antes de usar startsWith
  const isOrganic = (product?.code && typeof product.code === 'string' && product.code.startsWith('SSS')) || false;

  const getDefaultEmoji = (): string => {
    // 🔧 FIX: Verificar que las propiedades existen Y son strings antes de usarlas
    const name = (product?.product_name && typeof product.product_name === 'string') 
      ? product.product_name.toLowerCase() 
      : '';
    const ingredients = (product?.ingredients_text && typeof product.ingredients_text === 'string') 
      ? product.ingredients_text.toLowerCase() 
      : '';

    // Emojis específicos basados en el contenido
    if (name.includes('peanut') || ingredients.includes('peanut')) return '🥜';
    if (name.includes('hafer') || ingredients.includes('hafer')) return '🌾';
    if (name.includes('fanta') || name.includes('strawberry')) return '🍓';
    if (name.includes('kiwi')) return '🥝';
    if (name.includes('yogurt') || name.includes('yoghurt')) return '🥛';
    if (name.includes('milk') || name.includes('dairy')) return '🥛';
    if (name.includes('fruit') || name.includes('apple')) return '🍎';
    if (name.includes('vegetable') || name.includes('carrot')) return '🥦';
    if (name.includes('meat') || name.includes('beef')) return '🥩';
    if (name.includes('fish') || name.includes('salmon')) return '🐟';
    if (name.includes('bread') || name.includes('wheat')) return '🍞';
    if (name.includes('cheese')) return '🧀';
    if (name.includes('egg')) return '🥚';

    return '🍽️';
  };

  // 🔧 FIX: Verificar que product existe y tiene las propiedades mínimas
  if (!product || !product.product_name) {
    return (
      <View style={styles.imageContainer}>
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderEmoji}>⚠️</Text>
        </View>
        <View style={styles.productNameContainer}>
          <Text style={styles.productName}>
            Product not found
            <Text style={styles.organicLabel}> error</Text>
          </Text>
        </View>
      </View>
    );
  }

  return (
    <>
      {/* Product Image */}
      <View style={styles.imageContainer}>
        {imageLoading ? (
          // Mostrar loading mientras se carga la imagen desde cache
          <View style={styles.placeholderContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={{ marginTop: 10, fontSize: 12, color: '#666' }}>
              Loading image...
            </Text>
          </View>
        ) : imageUri ? (
          // Mostrar imagen cargada desde cache
          <Image
            source={{ uri: imageUri }}
            style={styles.productImage}
            resizeMode="contain"
            onError={() => {
              console.log(`❌ Error loading cached image for ${product.code}`);
            }}
          />
        ) : product.image_url ? (
          // Fallback: mostrar imagen URL directa si existe
          <Image
            source={{ uri: product.image_url }}
            style={styles.productImage}
            resizeMode="contain"
            onError={() => {
              console.log(`❌ Error loading fallback image for ${product.code}`);
            }}
          />
        ) : (
          // Si no hay imagen, mostrar emoji
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderEmoji}>{getDefaultEmoji()}</Text>
          </View>
        )}
      </View>
      
      {/* Product Name - TEXTO COMBINADO */}
      <View style={styles.productNameContainer}>
        <Text style={styles.productName}>
          {product.product_name || 'Unknown Product'}
          <Text style={styles.organicLabel}>
            {isOrganic ? ' organic' : ' product'}
          </Text>
        </Text>
      </View>
    </>
  );
};

export default ProductHeader;