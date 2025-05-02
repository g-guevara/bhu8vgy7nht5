// app/screens/ProductInfoScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  SafeAreaView, 
  ScrollView, 
  View, 
  ActivityIndicator,
  TouchableOpacity,
  Text
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../data/productData';
import { styles } from '../styles/ProductInfoStyles';

// Import components
import ProductHeader from '../components/ProductInfo/ProductHeader';
import ProductDetails from '../components/ProductInfo/ProductDetails';
import ProductReactions from '../components/ProductInfo/ProductReactions';
import ProductNotes from '../components/ProductInfo/ProductNotes';
import ProductActions from '../components/ProductInfo/ProductActions';

export default function ProductInfoScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedReaction, setSelectedReaction] = useState<'Critic' | 'Sensitive' | 'Safe' | null>(null);
  const [notes, setNotes] = useState('');
  
  // Load the product from AsyncStorage when the component mounts
  useEffect(() => {
    const loadProduct = async () => {
      try {
        const productJson = await AsyncStorage.getItem('selectedProduct');
        if (productJson) {
          const loadedProduct = JSON.parse(productJson);
          setProduct(loadedProduct);
        }
      } catch (error) {
        console.error('Error loading product from AsyncStorage:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, []);

  const handleBack = () => {
    // Clean up AsyncStorage and go back
    AsyncStorage.removeItem('selectedProduct').then(() => {
      router.back();
    });
  };

  // Show loading indicator while fetching the product
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#007AFF" />
            <Text style={styles.backText}>Home</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Information</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
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
            <Ionicons name="chevron-back" size={28} color="#007AFF" />
            <Text style={styles.backText}>Home</Text>
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
          <Ionicons name="chevron-back" size={28} color="#007AFF" />
          <Text style={styles.backText}>Home</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Information</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.productInfoContainer}>
          {/* Component 1: Product Header (Image and Name) */}
          <ProductHeader product={product} />
          
          <View style={styles.divider} />
          
          {/* Component 2: Product Details (Brand and Ingredients) */}
          <ProductDetails product={product} />
          
          <View style={styles.divider} />
          
          {/* Component 3: Product Reactions */}
          <ProductReactions 
            selectedReaction={selectedReaction} 
            setSelectedReaction={setSelectedReaction} 
          />
          
          <View style={styles.divider} />
          
          {/* Component 4: Product Notes */}
          <ProductNotes 
            notes={notes} 
            setNotes={setNotes} 
          />
          
          {/* Component 5: Product Actions (Wishlist and Test buttons) */}
          <ProductActions />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}