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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: '#007AFF',
    fontSize: 17,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 350,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
  productImage: {
    width: '80%',
    height: '80%',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
  placeholderEmoji: {
    fontSize: 100,
  },
  productInfoContainer: {
    padding: 16,
  },
  productNameContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  productName: {
    fontSize: 38,
    fontWeight: 'bold',
  },
  organicLabel: {
    fontSize: 16,
    color: '#666',
    paddingLeft: 8,
    marginBottom: 5,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 17,
    fontWeight: '600',
    marginRight: 8,
  },
  infoValue: {
    fontSize: 17,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 16,
  },
  reactionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#F5F5F5',
  },
  selectedReactionButton: {
    borderColor: '#007AFF',
    backgroundColor: '#E6F2FF',
  },
  reactionIcon: {
    marginRight: 8,
  },
  reactionDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  criticDot: {
    backgroundColor: '#FF3B30',
  },
  sensitiveDot: {
    backgroundColor: '#FFCC00',
  },
  safeDot: {
    backgroundColor: '#34C759',
  },
  reactionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  notesInput: {
    minHeight: 150,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 30,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Add these to your styles object
buttonsRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 30,
},
secondaryButton: {
  backgroundColor: '#F5F5F5',
  paddingVertical: 16,
  paddingHorizontal: 20,
  borderRadius: 10,
  alignItems: 'center',
  flex: 1,
  marginHorizontal: 5,
  borderWidth: 1,
  borderColor: '#E5E5E5',
},
secondaryButtonText: {
  color: '#007AFF',
  fontSize: 16,
  fontWeight: '600',
  
},

sectionHeaderRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 16,
},
clearButton: {
  paddingHorizontal: 12,
  backgroundColor: '#ffffff',
},
clearButtonText: {
  color: '#666',
  fontSize: 14,

}
});