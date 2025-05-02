// app/components/ProductInfo/ProductActions.tsx
import React, { useState } from 'react';
import { View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { styles } from '../../styles/ProductInfoStyles';
import { Product } from '../../data/productData';
import { ApiService } from '../../services/api';
import { useToast } from '../../utils/ToastContext';

interface ProductActionsProps {
  product: Product;
}

const ProductActions: React.FC<ProductActionsProps> = ({ product }) => {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleAddToWishlist = async () => {
    if (!product.code) {
      showToast('Product code is missing', 'error');
      return;
    }

    setLoading(true);
    try {
      await ApiService.addToWishlist(product.code);
      showToast('Product added to wishlist', 'success');
    } catch (error: any) {
      console.error('Error adding to wishlist:', error);
      showToast(error.message || 'Failed to add to wishlist', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.buttonsRow}>
      <TouchableOpacity 
        style={[styles.secondaryButton, loading && styles.buttonDisabled]} 
        onPress={handleAddToWishlist}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <Text style={styles.secondaryButtonText}>Add to Wishlist</Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>Start Test</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ProductActions;