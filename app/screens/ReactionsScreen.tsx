// app/screens/ReactionsScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity,
  Image,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../styles/ReactionStyles';
import { ApiService } from '../services/api';
import { sampleProducts } from '../data/productData';
import { useToast } from '../utils/ToastContext';

type TabName = 'All' | 'Organic' | 'Product' | 'Ing';

interface ProductReaction {
  _id: string;
  userID: string;
  productID: string;
  reaction: 'Critic' | 'Sensitive' | 'Safe';
  createdAt: string;
  updatedAt: string;
}

interface IngredientReaction {
  _id: string;
  userID: string;
  ingredientName: string;
  reaction: 'Critic' | 'Sensitive' | 'Safe';
  createdAt: string;
  updatedAt: string;
}

interface Product {
  code: string;
  product_name: string;
  brands: string;
  ingredients_text: string;
  image_url?: string;
}

interface ProductWithReaction extends Product {
  reaction: 'Critic' | 'Sensitive' | 'Safe';
  isOrganic: boolean;
}

// For grouping ingredients by first letter
interface AlphabeticalGroup {
  letter: string;
  items: IngredientReaction[];
}

// Define local styles for reaction dots since they don't exist in the imported styles
const localStyles = StyleSheet.create({
  reactionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
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
  // Additional styles for ingredient dictionary
  dictionaryContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  ingredientScrollView: {
    flex: 1,
    paddingRight: 30, // Make room for alphabet sidebar
  },
  letterGroup: {
    marginBottom: 15,
  },
  letterHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    backgroundColor: '#f5f7f9',
    paddingVertical: 5,
    paddingHorizontal: 15,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  ingredientName: {
    fontSize: 16,
    marginLeft: 15,
  },
  alphabetSidebar: {
    position: 'absolute',
    right: 5,
    top: 0,
    bottom: 0,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 10,
  },
  alphabetItem: {
    padding: 2,
  },
  alphabetLetter: {
    fontSize: 12,
    color: '#bbb',
  },
  alphabetLetterActive: {
    color: '#4285F4',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default function ReactionsScreen() {
  const [activeTab, setActiveTab] = useState<TabName>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productReactions, setProductReactions] = useState<ProductWithReaction[]>([]);
  const [ingredientReactions, setIngredientReactions] = useState<IngredientReaction[]>([]);
  const [groupedIngredients, setGroupedIngredients] = useState<AlphabeticalGroup[]>([]);
  const { showToast } = useToast();
  const router = useRouter();
  
  // Fetch reactions when component mounts
  useEffect(() => {
    fetchReactions();
  }, []);

  // Group ingredients alphabetically whenever ingredient reactions change
  useEffect(() => {
    if (ingredientReactions.length > 0) {
      groupIngredientsByFirstLetter();
    }
  }, [ingredientReactions]);


  const fetchReactions = async () => {
    setLoading(true);
    setError(null);
    try {
      // First fetch product reactions
      let productReactionsData = [];
      try {
        productReactionsData = await ApiService.getProductReactions();
        console.log('Product reactions fetched successfully:', productReactionsData.length);
      } catch (productError) {
        console.error('Error fetching product reactions:', productError);
        showToast('Failed to load product reactions', 'error');
      }
      
      // Process product reactions
      const productsWithReactions: ProductWithReaction[] = [];
      
      for (const reaction of productReactionsData) {
        const product = sampleProducts.find(p => p.code === reaction.productID);
        
        if (product) {
          productsWithReactions.push({
            ...product,
            reaction: reaction.reaction,
            isOrganic: product.code.startsWith('SSS')
          });
        }
      }
      
      setProductReactions(productsWithReactions);
      
      // Now fetch ingredient reactions separately
      if (activeTab === 'Ing') {
        showToast('Loading ingredient reactions...', 'success');
      }
      
      try {
        const ingredients = await ApiService.getIngredientReactions();
        console.log('Successfully fetched ingredients data:', ingredients.length);
        setIngredientReactions(ingredients);
        
        // Force grouping after data is set
        setTimeout(() => {
          groupIngredientsByFirstLetter();
        }, 100);
      } catch (ingredientError) {
        console.error('Error fetching ingredient reactions:', ingredientError);
        setIngredientReactions([]);
        
        if (activeTab === 'Ing') {
          showToast('Could not load ingredient reactions', 'error');
        }
      }
    } catch (error: any) {
      console.error('Error in main reactions fetch flow:', error);
      setError(error.message || 'Failed to load reactions');
      showToast('Failed to load reactions', 'error');
    } finally {
      setLoading(false);
    }
  };
  // Update the groupIngredientsByFirstLetter function to be more robust
  const groupIngredientsByFirstLetter = () => {
    console.log('Grouping ingredients, count:', ingredientReactions.length);
    if (!ingredientReactions || ingredientReactions.length === 0) {
      console.log('No ingredients to group');
      setGroupedIngredients([]);
      return;
    }
    
    // Sort ingredients alphabetically
    const sortedIngredients = [...ingredientReactions].sort((a, b) => 
      a.ingredientName.localeCompare(b.ingredientName)
    );
    
    // Group by first letter
    const groups: AlphabeticalGroup[] = [];
    let currentLetter = '';
    let currentGroup: IngredientReaction[] = [];
    
    sortedIngredients.forEach(ingredient => {
      if (!ingredient.ingredientName) {
        console.warn('Ingredient without name found:', ingredient);
        return;
      }
      
      const firstLetter = ingredient.ingredientName.charAt(0).toUpperCase();
      
      if (firstLetter !== currentLetter) {
        if (currentGroup.length > 0) {
          groups.push({ letter: currentLetter, items: currentGroup });
        }
        currentLetter = firstLetter;
        currentGroup = [ingredient];
      } else {
        currentGroup.push(ingredient);
      }
    });
    
    // Add last group
    if (currentGroup.length > 0) {
      groups.push({ letter: currentLetter, items: currentGroup });
    }
    
    console.log('Grouped ingredients into', groups.length, 'letter groups');
    setGroupedIngredients(groups);
  };

  const handleTabPress = (tabName: TabName): void => {
    setActiveTab(tabName);
  };

  const getFilteredProducts = (): ProductWithReaction[] => {
    switch (activeTab) {
      case 'Organic':
        return productReactions.filter(product => product.isOrganic);
      case 'Product':
        return productReactions.filter(product => !product.isOrganic);
      default: // 'All'
        return productReactions;
    }
  };

  const handleProductPress = async (product: Product) => {
    try {
      await AsyncStorage.setItem('selectedProduct', JSON.stringify(product));
      router.push('/screens/ProductInfoScreen');
    } catch (error) {
      console.error('Error navigating to product:', error);
      showToast('Error opening product details', 'error');
    }
  };

  const getDefaultEmoji = (product: ProductWithReaction): string => {
    const name = product.product_name.toLowerCase();
    const ingredients = product.ingredients_text.toLowerCase();

    if (name.includes('peanut') || ingredients.includes('peanut')) return '🥜';
    if (name.includes('hafer') || ingredients.includes('hafer')) return '🌾';
    if (name.includes('milk') || name.includes('dairy')) return '🥛';
    if (name.includes('fruit') || name.includes('apple')) return '🍎';
    if (name.includes('vegetable') || name.includes('carrot')) return '🥦';

    return '🍽️';
  };

  const groupProductsByReaction = (products: ProductWithReaction[]) => {
    const grouped = {
      Critic: [] as ProductWithReaction[],
      Sensitive: [] as ProductWithReaction[],
      Safe: [] as ProductWithReaction[]
    };
    
    products.forEach(product => {
      if (product.reaction in grouped) {
        grouped[product.reaction].push(product);
      }
    });
    
    return grouped;
  };

  // Get color for reaction dot
  const getReactionDotStyle = (reaction: 'Critic' | 'Sensitive' | 'Safe') => {
    switch (reaction) {
      case 'Critic':
        return localStyles.criticDot;
      case 'Sensitive':
        return localStyles.sensitiveDot;
      case 'Safe':
        return localStyles.safeDot;
      default:
        return {};
    }
  };

  // Render ingredient item for the ingredients dictionary
  const renderIngredientItem = (ingredient: IngredientReaction) => (
    <View key={ingredient._id} style={localStyles.ingredientItem}>
      <View style={[localStyles.reactionDot, getReactionDotStyle(ingredient.reaction)]} />
      <Text style={localStyles.ingredientName}>{ingredient.ingredientName}</Text>
    </View>
  );

  // Render letter group for ingredients dictionary
  const renderLetterGroup = (group: AlphabeticalGroup) => (
    <View key={group.letter} style={localStyles.letterGroup}>
      <Text style={localStyles.letterHeader}>{group.letter}</Text>
      {group.items.map(ingredient => renderIngredientItem(ingredient))}
    </View>
  );

  const filteredProducts = getFilteredProducts();
  const groupedProducts = groupProductsByReaction(filteredProducts);

  // Render the alphabet sidebar for ingredients
  const renderAlphabetSidebar = () => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    return (
      <View style={localStyles.alphabetSidebar}>
        {alphabet.map(letter => (
          <TouchableOpacity 
            key={letter}
            style={localStyles.alphabetItem}
            // You could add onPress to scroll to that letter if needed
          >
            <Text 
              style={[
                localStyles.alphabetLetter,
                // Highlight letters that have ingredients
                groupedIngredients.some(g => g.letter === letter) ? localStyles.alphabetLetterActive : {}
              ]}
            >
              {letter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Render the main content based on the active tab
  const renderContent = () => {
    if (loading) {
      return (
        <View style={localStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      );
    }
    
    if (error) {
      return (
        <View style={localStyles.errorContainer}>
          <Text style={localStyles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={localStyles.retryButton}
            onPress={fetchReactions}
          >
            <Text style={localStyles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Ingredients tab
    if (activeTab === 'Ing') {
      if (ingredientReactions.length === 0) {
        return (
          <View style={localStyles.emptyContainer}>
            <Text style={localStyles.emptyText}>No ingredient reactions found</Text>
            <Text style={localStyles.emptySubtext}>
              Ingredients you mark as Critic, Sensitive, or Safe will appear here
            </Text>
          </View>
        );
      }

      return (
        <View style={localStyles.dictionaryContainer}>
          <ScrollView style={localStyles.ingredientScrollView}>
            {groupedIngredients.map(group => renderLetterGroup(group))}
          </ScrollView>
          {renderAlphabetSidebar()}
        </View>
      );
    }

    // Product tabs (All, Organic, Product)
    return (
      <ScrollView style={styles.scrollView}>
        {/* Critic Section */}
        {groupedProducts.Critic.length > 0 && (
          <View style={styles.reactionSection}>
            <View style={styles.reactionHeader}>
              <View style={[styles.reactionIndicator, styles.criticIndicator]} />
              <Text style={styles.reactionType}>Critic</Text>
            </View>
            
            {groupedProducts.Critic.map((product) => (
              <TouchableOpacity 
                key={product.code} 
                style={styles.foodItem}
                onPress={() => handleProductPress(product)}
              >
                <View style={styles.foodImagePlaceholder}>
                  {product.image_url ? (
                    <Image
                      source={{ uri: product.image_url }}
                      style={{ width: '100%', height: '100%', borderRadius: 10 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.foodEmoji}>{getDefaultEmoji(product)}</Text>
                  )}
                </View>
                <View style={styles.foodInfo}>
                  <Text style={styles.foodName}>{product.product_name}</Text>
                  <Text style={styles.foodCategory}>{product.brands}</Text>
                </View>
                <Text style={styles.arrowIcon}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        {/* Sensitive Section */}
        {groupedProducts.Sensitive.length > 0 && (
          <View style={styles.reactionSection}>
            <View style={styles.reactionHeader}>
              <View style={[styles.reactionIndicator, styles.sensitivIndicator]} />
              <Text style={styles.reactionType}>Sensitiv</Text>
            </View>
            
            {groupedProducts.Sensitive.map((product) => (
              <TouchableOpacity 
                key={product.code}
                style={styles.foodItem}
                onPress={() => handleProductPress(product)}
              >
                <View style={styles.foodImagePlaceholder}>
                  {product.image_url ? (
                    <Image
                      source={{ uri: product.image_url }}
                      style={{ width: '100%', height: '100%', borderRadius: 10 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.foodEmoji}>{getDefaultEmoji(product)}</Text>
                  )}
                </View>
                <View style={styles.foodInfo}>
                  <Text style={styles.foodName}>{product.product_name}</Text>
                  <Text style={styles.foodCategory}>{product.brands}</Text>
                </View>
                <Text style={styles.arrowIcon}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        {/* Safe Section */}
        {groupedProducts.Safe.length > 0 && (
          <View style={styles.reactionSection}>
            <View style={styles.reactionHeader}>
            <View style={[styles.reactionIndicator, localStyles.safeDot]} />
              <Text style={styles.reactionType}>Safe</Text>
            </View>
            
            {groupedProducts.Safe.map((product) => (
              <TouchableOpacity 
                key={product.code}
                style={styles.foodItem}
                onPress={() => handleProductPress(product)}
              >
                <View style={styles.foodImagePlaceholder}>
                  {product.image_url ? (
                    <Image
                      source={{ uri: product.image_url }}
                      style={{ width: '100%', height: '100%', borderRadius: 10 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.foodEmoji}>{getDefaultEmoji(product)}</Text>
                  )}
                </View>
                <View style={styles.foodInfo}>
                  <Text style={styles.foodName}>{product.product_name}</Text>
                  <Text style={styles.foodCategory}>{product.brands}</Text>
                </View>
                <Text style={styles.arrowIcon}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        {filteredProducts.length === 0 && (
          <View style={localStyles.emptyContainer}>
            <Text style={localStyles.emptyText}>No reactions found</Text>
            <Text style={localStyles.emptySubtext}>
              Products you mark as Critic, Sensitive, or Safe will appear here
            </Text>
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerText}>Reactions</Text>
      
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[
            styles.tabButton, 
            activeTab === 'All' && styles.activeTabButton
          ]}
          onPress={() => handleTabPress('All')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'All' && styles.activeTabText
          ]}>All</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.tabButton, 
            activeTab === 'Organic' && styles.activeTabButton
          ]}
          onPress={() => handleTabPress('Organic')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'Organic' && styles.activeTabText
          ]}>Organic</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.tabButton, 
            activeTab === 'Product' && styles.activeTabButton
          ]}
          onPress={() => handleTabPress('Product')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'Product' && styles.activeTabText
          ]}>Product</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.tabButton, 
            activeTab === 'Ing' && styles.activeTabButton
          ]}
          onPress={() => handleTabPress('Ing')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'Ing' && styles.activeTabText
          ]}>Ing</Text>
        </TouchableOpacity>
      </View>

      {renderContent()}
    </SafeAreaView>
  );
}