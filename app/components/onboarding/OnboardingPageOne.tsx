// app/components/onboarding/OnboardingPageOne.tsx
import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface OnboardingPageOneProps {
  isTablet?: boolean;
}

export default function OnboardingPageOne({ isTablet = false }: OnboardingPageOneProps) {
  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        {/* Logo principal del app */}
        <View style={[styles.imageContainer, { width: isTablet ? 300 : 280 }]}>
          <View style={[styles.logoContainer, styles.topImage]}>
            <Image 
              source={require('../../../assets/images/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Textos de bienvenida */}
        <View style={[styles.imageContainer, { width: isTablet ? 300 : 280 }]}>
          <View style={[styles.welcomeContainer, styles.bottomImage]}>
            <Text style={styles.welcomeText}>Sensitive Foods</Text>
            <Text style={styles.taglineText}>No more guessing—understand your body's reactions and build a diet that supports you</Text>
          </View>
        </View>
      </View>

      <View style={styles.instructionContainer}>
        <View style={styles.instructionRow}>
          <Text style={styles.instructionText}>Swipe left to continue</Text>
          <Text style={styles.chevron}>›</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  imageContainer: {
    marginBottom: 20,
  },
  
  // Contenedor del logo principal
  logoContainer: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: '160%',
    height: '160%',
  },
  
  // Contenedor de bienvenida
  welcomeContainer: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000',
    marginTop:20,
    marginBottom: 16,
    textAlign: 'center',
  },
  taglineText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  // Tamaños de las imágenes
  topImage: {
    height: 200,
  },
  bottomImage: {
    height: 120,
  },
  
  // Instrucciones
  instructionContainer: {
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  instructionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionText: {
    color: '#666',
    fontSize: 16,
    marginRight: 8,
  },
  chevron: {
    color: '#666',
    fontSize: 18,
    fontWeight: '600',
  },
});