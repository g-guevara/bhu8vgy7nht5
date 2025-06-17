// app/components/ProductInfo/ProductHeader.tsx - CORREGIDO
import React from 'react';
import { View, Text, Image } from 'react-native';
import { Product } from '../../data/productData';
import { styles } from '../../styles/ProductInfoStyles';

interface ProductHeaderProps {
  product: Product;
}

const ProductHeader: React.FC<ProductHeaderProps> = ({ product }) => {
  // 🔧 FIX: Verificar que product.code existe antes de usar startsWith
  const isOrganic = product?.code?.startsWith('SSS') || false;

  const getDefaultEmoji = (): string => {
    // 🔧 FIX: Verificar que las propiedades existen antes de usarlas
    const name = (product?.product_name || '').toLowerCase();
    const ingredients = (product?.ingredients_text || '').toLowerCase();

    if (name.includes('peanut') || ingredients.includes('peanut')) return '🥜';
    if (name.includes('hafer') || ingredients.includes('hafer')) return '🌾';

    return '🍽️';
  };

  // 🔧 FIX: Verificar que product existe
  if (!product) {
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
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            style={styles.productImage}
            resizeMode="contain"
          />
        ) : (
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