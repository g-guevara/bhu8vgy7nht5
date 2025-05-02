// app/components/ProductInfo/ProductActions.tsx
import React, { useState, useEffect } from 'react';
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
  const [isInWishlist, setIsInWishlist] = useState(false);
  const { showToast } = useToast();

  // Check if product is already in wishlist on component mount
  useEffect(() => {
    const checkWishlistStatus = async () => {
      if (!product.code) return;
      
      try {
        setLoading(true);
        const wishlist = await ApiService.getWishlist();
        const inWishlist = wishlist.some((item: any) => item.productID === product.code);
        setIsInWishlist(inWishlist);
      } catch (error: any) {
        console.error('Error checking wishlist status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkWishlistStatus();
  }, [product.code]);

  const handleAddToWishlist = async () => {
    if (!product.code) {
      showToast('Product code is missing', 'error');
      return;
    }

    setLoading(true);
    try {
      await ApiService.addToWishlist(product.code);
      setIsInWishlist(true);
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
        style={[
          styles.secondaryButton, 
          loading && styles.buttonDisabled,
          isInWishlist && styles.buttonDisabled
        ]} 
        onPress={handleAddToWishlist}
        disabled={loading || isInWishlist}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <Text style={styles.secondaryButtonText}>
            {isInWishlist ? 'Added to Wishlist' : 'Add to Wishlist'}
          </Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>Start Test</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ProductActions;