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
  const [wishlistItemId, setWishlistItemId] = useState<string | null>(null);
  const { showToast } = useToast();

  // Check if product is already in wishlist on component mount
  useEffect(() => {
    const checkWishlistStatus = async () => {
      if (!product.code) return;
      
      try {
        setLoading(true);
        const wishlist = await ApiService.getWishlist();
        const wishlistItem = wishlist.find((item: any) => item.productID === product.code);
        if (wishlistItem) {
          setIsInWishlist(true);
          setWishlistItemId(wishlistItem._id);
        } else {
          setIsInWishlist(false);
          setWishlistItemId(null);
        }
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
      
      // Refresh wishlist status to get the new item ID
      const wishlist = await ApiService.getWishlist();
      const wishlistItem = wishlist.find((item: any) => item.productID === product.code);
      if (wishlistItem) {
        setWishlistItemId(wishlistItem._id);
      }
    } catch (error: any) {
      console.error('Error adding to wishlist:', error);
      showToast(error.message || 'Failed to add to wishlist', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromWishlist = async () => {
    if (!wishlistItemId) {
      showToast('Wishlist item ID is missing', 'error');
      return;
    }

    setLoading(true);
    try {
      // Since the API doesn't have a removeFromWishlist method yet,
      // we need to implement it in the ApiService class
      await ApiService.removeFromWishlist(wishlistItemId);
      setIsInWishlist(false);
      setWishlistItemId(null);
      showToast('Product removed from wishlist', 'success');
    } catch (error: any) {
      console.error('Error removing from wishlist:', error);
      showToast(error.message || 'Failed to remove from wishlist', 'error');
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
          isInWishlist && styles.removeButton
        ]} 
        onPress={isInWishlist ? handleRemoveFromWishlist : handleAddToWishlist}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <Text style={[
            styles.secondaryButtonText,
            isInWishlist && styles.removeButtonText
          ]}>
            {isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
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