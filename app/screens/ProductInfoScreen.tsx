// app/screens/ProductInfoScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../data/productData';
import { styles } from '../styles/ProductInfoStyles';

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

  // Check if it's an organic product
  const isOrganic = product?.code.startsWith('SSS');

  const getDefaultEmoji = (): string => {
    if (!product) return '🍽️';
    
    const name = product.product_name.toLowerCase();
    const ingredients = product.ingredients_text.toLowerCase();

    if (name.includes('peanut') || ingredients.includes('peanut')) return '🥜';
    if (name.includes('hafer') || ingredients.includes('hafer')) return '🌾';

    return '🍽️';
  };

  const handleBack = () => {
    // Clean up AsyncStorage and go back
    AsyncStorage.removeItem('selectedProduct').then(() => {
      router.back();
    });
  };

  const handleReactionSelect = (reaction: 'Critic' | 'Sensitive' | 'Safe') => {
    setSelectedReaction(reaction);
  };

  const handleSaveNotes = async () => {
    // In a real app, you would save the notes and selected reaction to your backend
    console.log('Product code:', product?.code);
    console.log('Saving reaction:', selectedReaction);
    console.log('Saving notes:', notes);

    // Clean up AsyncStorage and go back
    await AsyncStorage.removeItem('selectedProduct');
    router.back();
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

        {/* Product Info */}
        <View style={styles.productInfoContainer}>
          <View style={styles.productNameContainer}>
            <Text style={styles.productName}>
              {product.product_name}
            </Text>
            {isOrganic ? (
              <Text style={styles.organicLabel}>organic</Text>
            ) : (
              <Text style={styles.organicLabel}>product</Text>
            )}

          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Brand:</Text>
            <Text style={styles.infoValue}>{product.brands}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ingredients:</Text>
            <Text style={styles.infoValue}>{product.ingredients_text}</Text>
          </View>

          <View style={styles.divider} />

          {/* Select Reaction Section */}
         {/* Select Reaction Section */}
<View style={styles.sectionHeaderRow}>
  <Text style={styles.sectionTitle}>Select Reaction</Text>
  <TouchableOpacity 
    style={styles.clearButton}
    onPress={() => setSelectedReaction(null)}
  >
    <Text style={styles.clearButtonText}>Clear</Text>
  </TouchableOpacity>
</View>
          
          <View style={styles.reactionsContainer}>
            <TouchableOpacity
              style={[
                styles.reactionButton,
                selectedReaction === 'Critic' && styles.selectedReactionButton
              ]}
              onPress={() => handleReactionSelect('Critic')}
            >
              <View style={styles.reactionIcon}>
                <View style={[styles.reactionDot, styles.criticDot]} />
              </View>
              <Text style={styles.reactionText}>Critic</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.reactionButton,
                selectedReaction === 'Sensitive' && styles.selectedReactionButton
              ]}
              onPress={() => handleReactionSelect('Sensitive')}
            >
              <View style={styles.reactionIcon}>
                <View style={[styles.reactionDot, styles.sensitiveDot]} />
              </View>
              <Text style={styles.reactionText}>Sensitive</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.reactionButton,
                selectedReaction === 'Safe' && styles.selectedReactionButton
              ]}
              onPress={() => handleReactionSelect('Safe')}
            >
              <View style={styles.reactionIcon}>
                <View style={[styles.reactionDot, styles.safeDot]} />
              </View>
              <Text style={styles.reactionText}>Safe</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Notes Section */}
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={styles.notesInput}
            multiline
            placeholder="Notes"
            value={notes}
            onChangeText={setNotes}
          />

          {/* Save Button */}

          <View style={styles.buttonsRow}>
            <TouchableOpacity style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Add to Wishlist</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Start Test</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
