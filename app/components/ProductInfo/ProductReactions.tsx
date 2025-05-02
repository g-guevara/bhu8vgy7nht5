// app/components/ProductInfo/ProductReactions.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from '../../styles/ProductInfoStyles';

interface ProductReactionsProps {
  selectedReaction: 'Critic' | 'Sensitive' | 'Safe' | null;
  setSelectedReaction: (reaction: 'Critic' | 'Sensitive' | 'Safe' | null) => void;
}

const ProductReactions: React.FC<ProductReactionsProps> = ({ 
  selectedReaction, 
  setSelectedReaction 
}) => {
  const handleReactionSelect = (reaction: 'Critic' | 'Sensitive' | 'Safe') => {
    setSelectedReaction(reaction);
  };

  return (
    <>
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
    </>
  );
};

export default ProductReactions;