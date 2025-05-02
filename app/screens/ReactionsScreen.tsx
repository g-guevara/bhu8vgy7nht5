import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity 
} from 'react-native';
import { styles } from '../styles/ReactionStyles'; // Adjust the import path as necessary

type TabName = 'All' | 'Organic' | 'Product' | 'Ing';

export default function ReactionsScreen() {
  const [activeTab, setActiveTab] = useState<TabName>('All');
  
  const handleTabPress = (tabName: TabName): void => {
    setActiveTab(tabName);
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

      <ScrollView style={styles.scrollView}>
        <View style={styles.reactionSection}>
          <View style={styles.reactionHeader}>
            <View style={[styles.reactionIndicator, styles.criticIndicator]} />
            <Text style={styles.reactionType}>Critic</Text>
          </View>
          
          <TouchableOpacity style={styles.foodItem}>
            <View style={styles.foodImagePlaceholder}>
              <Text style={styles.foodEmoji}>🌾</Text>
            </View>
            <View style={styles.foodInfo}>
              <Text style={styles.foodName}>Wheat</Text>
              <Text style={styles.foodCategory}>Grains</Text>
            </View>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.foodItem}>
            <View style={styles.foodImagePlaceholder}>
              <Text style={styles.foodEmoji}>🥣</Text>
            </View>
            <View style={styles.foodInfo}>
              <Text style={styles.foodName}>CrunchBite</Text>
              <Text style={styles.foodCategory}>Golden Bakes</Text>
            </View>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.foodItem}>
            <View style={styles.foodImagePlaceholder}>
              <Text style={styles.foodEmoji}>🥛</Text>
            </View>
            <View style={styles.foodInfo}>
              <Text style={styles.foodName}>Milk</Text>
              <Text style={styles.foodCategory}>Dairy</Text>
            </View>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.reactionSection}>
          <View style={styles.reactionHeader}>
            <View style={[styles.reactionIndicator, styles.sensitivIndicator]} />
            <Text style={styles.reactionType}>Sensitiv</Text>
          </View>
          
          <TouchableOpacity style={styles.foodItem}>
            <View style={styles.foodImagePlaceholder}>
              <Text style={styles.foodEmoji}>🧅</Text>
            </View>
            <View style={styles.foodInfo}>
              <Text style={styles.foodName}>Onion</Text>
              <Text style={styles.foodCategory}>Vegetables</Text>
            </View>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}