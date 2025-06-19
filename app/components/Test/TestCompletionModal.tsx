// app/components/Test/TestCompletionModal.tsx
// FIXED: Updated to use integrated cache system from productData.ts

import React, { useState } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  StyleSheet,
  Alert 
} from 'react-native';
import { ApiService } from '../../services/api';
import { useToast } from '../../utils/ToastContext';
// 🆕 IMPORTAR EL NUEVO SISTEMA DE DATOS INTEGRADO
import { 
  findProductInData, 
  addProductToData,
  Product 
} from '../../data/productData';

interface TestCompletionModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
  testId: string;
  productId: string;
}

const TestCompletionModal: React.FC<TestCompletionModalProps> = ({
  visible,
  onClose,
  onComplete,
  testId,
  productId
}) => {
  const [selectedReaction, setSelectedReaction] = useState<'Critic' | 'Sensitive' | 'Safe' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  // 🆕 FUNCIÓN ACTUALIZADA PARA USAR EL SISTEMA INTEGRADO
  const getProductName = (productId: string): string => {
    // Buscar primero en el sistema integrado
    const product = findProductInData(productId);
    if (product) {
      console.log(`💾 [TestModal] Product ${productId} found in integrated data`);
      return product.product_name;
    }
    
    console.log(`❌ [TestModal] Product ${productId} not found in integrated data`);
    return `Product ${productId.substring(0, 8)}...`;
  };

  // 🆕 FUNCIÓN ACTUALIZADA PARA USAR EL SISTEMA INTEGRADO
  const getProduct = (productId: string): Product | null => {
    // Buscar primero en el sistema integrado
    const product = findProductInData(productId);
    if (product) {
      console.log(`💾 [TestModal] Product ${productId} found in integrated data`);
      return product;
    }
    
    console.log(`❌ [TestModal] Product ${productId} not found in integrated data`);
    
    // 🔧 FALLBACK: Si no se encuentra, intentar crear un producto básico
    // Esto puede pasar si el test se creó antes de que el producto fuera agregado al cache
    const fallbackProduct: Product = {
      code: productId,
      product_name: `Product ${productId.substring(0, 8)}`,
      brands: 'Unknown Brand',
      ingredients_text: 'Ingredients not available'
    };
    
    // Agregar al sistema integrado para próximas veces
    addProductToData(fallbackProduct);
    console.log(`💾 [TestModal] Added fallback product ${productId} to integrated data`);
    
    return fallbackProduct;
  };

  // Helper function to get the appropriate selected style for each reaction type
  const getSelectedButtonStyle = (reactionType: 'Critic' | 'Sensitive' | 'Safe') => {
    if (selectedReaction !== reactionType) {
      return [styles.reactionButton];
    }
    
    const baseStyles = [styles.reactionButton, styles.selectedReactionButton];
    
    switch (reactionType) {
      case 'Critic':
        return [...baseStyles, styles.selectedCriticButton];
      case 'Sensitive':
        return [...baseStyles, styles.selectedSensitiveButton];
      case 'Safe':
        return [...baseStyles, styles.selectedSafeButton];
      default:
        return baseStyles;
    }
  };

  // Helper function to get the appropriate text style for each reaction type
  const getSelectedTextStyle = (reactionType: 'Critic' | 'Sensitive' | 'Safe') => {
    if (selectedReaction !== reactionType) {
      return styles.reactionText;
    }
    
    switch (reactionType) {
      case 'Critic':
        return [styles.reactionText, styles.selectedCriticText];
      case 'Sensitive':
        return [styles.reactionText, styles.selectedSensitiveText];
      case 'Safe':
        return [styles.reactionText, styles.selectedSafeText];
      default:
        return [styles.reactionText, styles.selectedReactionText];
    }
  };

  const handleReactionSelect = (reaction: 'Critic' | 'Sensitive' | 'Safe') => {
    setSelectedReaction(reaction);
  };

  const handleCompleteTest = async () => {
    if (!selectedReaction) {
      showToast('Please select a reaction before completing the test', 'error');
      return;
    }

    setIsLoading(true);

    try {
      // 🆕 USAR LA FUNCIÓN ACTUALIZADA
      const product = getProduct(productId);
      
      if (!product) {
        throw new Error('Product information not found');
      }

      console.log(`✅ [TestModal] Completing test for product: ${product.product_name}`);

      // 1. Save product reaction (same as ProductReactions.tsx)
      await ApiService.saveProductReaction(productId, selectedReaction);
      console.log(`✅ [TestModal] Product reaction saved`);
      
      // 2. Parse and save ingredient reactions (same as ProductReactions.tsx)
      if (product.ingredients_text) {
        const ingredients = product.ingredients_text
          .split(',')
          .map(i => i.trim())
          .filter(i => i.length > 0);
          
        console.log(`📝 [TestModal] Saving reactions for ${ingredients.length} ingredients`);
        
        // Save each ingredient with the same reaction
        for (const ingredient of ingredients) {
          await ApiService.saveIngredientReaction(ingredient, selectedReaction);
        }
        
        console.log(`✅ [TestModal] All ingredient reactions saved`);
      }

      // 3. Complete the test with the selected reaction
      await ApiService.completeTest(testId, selectedReaction);
      console.log(`✅ [TestModal] Test completed successfully`);

      showToast('Test completed successfully', 'success');
      onComplete();
      onClose();
      
    } catch (error: any) {
      console.error('❌ [TestModal] Error completing test:', error);
      showToast(error.message || 'Failed to complete test', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel Test Completion",
      "Are you sure you want to cancel? Your test will remain active.",
      [
        {
          text: "Continue Testing",
          style: "cancel"
        },
        {
          text: "Cancel",
          onPress: onClose
        }
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Complete Test</Text>
            <Text style={styles.modalSubtitle}>
              How did you react to {getProductName(productId)}?
            </Text>
          </View>

          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.loadingText}>Saving results...</Text>
            </View>
          )}

          <View style={styles.reactionsContainer}>
            <TouchableOpacity
              style={[
                ...getSelectedButtonStyle('Critic'),
                isLoading && styles.buttonDisabled
              ]}
              onPress={() => handleReactionSelect('Critic')}
              disabled={isLoading}
            >
              <View style={styles.reactionIcon}>
                <View style={[styles.reactionDot, styles.criticDot]} />
              </View>
              <Text style={getSelectedTextStyle('Critic')}>
                Critic
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                ...getSelectedButtonStyle('Sensitive'),
                isLoading && styles.buttonDisabled
              ]}
              onPress={() => handleReactionSelect('Sensitive')}
              disabled={isLoading}
            >
              <View style={styles.reactionIcon}>
                <View style={[styles.reactionDot, styles.sensitiveDot]} />
              </View>
              <Text style={getSelectedTextStyle('Sensitive')}>
                Sensitive
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                ...getSelectedButtonStyle('Safe'),
                isLoading && styles.buttonDisabled
              ]}
              onPress={() => handleReactionSelect('Safe')}
              disabled={isLoading}
            >
              <View style={styles.reactionIcon}>
                <View style={[styles.reactionDot, styles.safeDot]} />
              </View>
              <Text style={getSelectedTextStyle('Safe')}>
                Safe
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancel}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton, 
                styles.completeButton,
                (!selectedReaction || isLoading) && styles.buttonDisabled
              ]}
              onPress={handleCompleteTest}
              disabled={!selectedReaction || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.completeButtonText}>Complete Test</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  reactionsContainer: {
    marginBottom: 24,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: '#F8F9FA',
    marginBottom: 12,
  },
  selectedReactionButton: {
    backgroundColor: '#E6F2FF',
    borderColor: '#007AFF',
  },
  // NEW: Color-specific selected reaction buttons
  selectedCriticButton: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FF3B30',
  },
  selectedSensitiveButton: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFCC00',
  },
  selectedSafeButton: {
    backgroundColor: '#E8F5E8',
    borderColor: '#34C759',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  reactionIcon: {
    marginRight: 12,
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
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  selectedReactionText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  // NEW: Color-specific selected text styles
  selectedCriticText: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  selectedSensitiveText: {
    color: '#FFCC00',
    fontWeight: '600',
  },
  selectedSafeText: {
    color: '#34C759',
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  completeButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default TestCompletionModal;