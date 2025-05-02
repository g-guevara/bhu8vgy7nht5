// app/components/ProductInfo/ProductActions.tsx
import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { styles } from '../../styles/ProductInfoStyles';

const ProductActions: React.FC = () => {
  return (
    <View style={styles.buttonsRow}>
      <TouchableOpacity style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>Add to Wishlist</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>Start Test</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ProductActions;