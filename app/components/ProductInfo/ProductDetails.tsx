// app/components/ProductInfo/ProductDetails.tsx
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Product } from '../../data/productData';
import { styles } from '../../styles/ProductInfoStyles';

interface ProductDetailsProps {
  product: Product;
}

const ProductDetails: React.FC<ProductDetailsProps> = ({ product }) => {
  return (
    <>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Brand:</Text>
        <Text style={styles.infoValue}>{product.brands}</Text>
      </View>

      <View style={styles.divider} />

      <View>
        <Text style={styles.infoLabel}>Ingredients:</Text>
        <Text style={[styles.infoValue, styles.ingredientsText]}>
          {product.ingredients_text}
        </Text>
      </View>
    </>
  );
};

export default ProductDetails;