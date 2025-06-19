// app/components/Test/TestItem.tsx
// FIXED: Updated to use integrated cache system from productData.ts

import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import { styles } from '../../styles/TestStyles';
// 🆕 IMPORTAR EL NUEVO SISTEMA DE DATOS INTEGRADO
import { 
  findProductInData, 
  addProductToData,
  Product 
} from '../../data/productData';

interface TestItemProps {
  activeTests: any[];
  loading: boolean;
  handleFinishTest: (testId: string) => void;
}

const TestItem: React.FC<TestItemProps> = ({ 
  activeTests, 
  loading, 
  handleFinishTest 
}) => {
  
  const formatRemainingTime = (test: any) => {
    const now = new Date();
    const finishDate = new Date(test.finishDate);
    const diffTime = finishDate.getTime() - now.getTime();
    
    if (diffTime <= 0) return '0 days, 0 hours';
    
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return `${diffDays} days, ${diffHours} hours`;
  };

  // 🆕 FUNCIÓN ACTUALIZADA PARA USAR EL SISTEMA INTEGRADO
  const getProductName = (productId: string) => {
    // Buscar primero en el sistema integrado
    const product = findProductInData(productId);
    if (product) {
      console.log(`💾 [TestItem] Product ${productId} found in integrated data`);
      return product.product_name;
    }
    
    console.log(`❌ [TestItem] Product ${productId} not found in integrated data`);
    
    // 🔧 FALLBACK: Si no se encuentra, crear un producto básico y agregarlo al cache
    const fallbackProduct: Product = {
      code: productId,
      product_name: `Product ${productId.substring(0, 8)}`,
      brands: 'Unknown Brand',
      ingredients_text: 'Ingredients not available'
    };
    
    // Agregar al sistema integrado para próximas veces
    addProductToData(fallbackProduct);
    console.log(`💾 [TestItem] Added fallback product ${productId} to integrated data`);
    
    return fallbackProduct.product_name;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (activeTests.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No active tests</Text>
        <Text style={styles.emptySubtext}>
        ⓘ Conduct a trial by testing your reaction to specific foods. Eat only one food at a time and allow a full digestion cycle to pass (3 to 5 days for an adult) to isolate its effects from other potential factors. If you experience an adverse reaction, it is recommended to wait 6 days before starting a new trial.
        </Text>
      </View>
    );
  }

  return (
    <>
      {activeTests.map((test) => (
        <View key={test._id} style={styles.currentTestContainer}>
          <Text style={styles.currentTestTitle}>
            Finish on {new Date(test.finishDate).toLocaleDateString()}
          </Text>
          <Text style={styles.currentTestSubtitle}>
            {formatRemainingTime(test)} remain
          </Text>
          <Text style={styles.productName}>
            Product: {getProductName(test.itemID)}
          </Text>
          <TouchableOpacity 
            style={styles.finishButton}
            onPress={() => handleFinishTest(test._id)}
          >
            <Text style={styles.finishButtonText}>Finish →</Text>
          </TouchableOpacity>
        </View>
      ))}
      
      {/* New notification about one test at a time */}
      <View style={styles.testLimitNotification}>
        <Text style={styles.testLimitText}>
          ⓘ Only one test can be performed at a time
        </Text>
      </View>
    </>
  );
};

export default TestItem;