// app/components/onboarding/OnboardingPageThree.tsx
import React from 'react';

import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';


const { width } = Dimensions.get('window');

export default function OnboardingPageThree() {
  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        {/* Placeholder para la imagen de testing */}
        <View style={styles.imageContainer}>
          <Image 
            source={require('../../../assets/images/onboarding/3.png')}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>1.- Search Food</Text>
        
        <Text style={styles.description}>
            Search and explore a wide range of products in our app and see key details like photos, brand, and ingredients.        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  imageContainer: {
    width: width ,
    height: 400,
    marginBottom: 40,

  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(128, 128, 128, 0.2)',
  },
  placeholderText: {
    fontSize: 60,
    marginBottom: 10,
  },
  placeholderSubtext: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
    image: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 400,
  },
});