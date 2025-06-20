// app/components/onboarding/OnboardingPageOne.tsx
import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface OnboardingPageOneProps {
  isTablet?: boolean;
}

export default function OnboardingPageOne({ isTablet = false }: OnboardingPageOneProps) {
  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        {/* Logo principal del app */}
        <View style={styles.logoSection}>
          <Image 
            source={require('../../../assets/images/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Textos de bienvenida */}
        <View style={styles.textSection}>
          <Text style={styles.welcomeText}>Sensitive Foods</Text>
          <Text style={styles.taglineText}>
            No more guessing—understand{'\n'}
            your body's reactions and build{'\n'}
            a diet that supports you
          </Text>
        </View>
      </View>

      {/* Instrucciones */}
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
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  
  // Sección del logo
  logoSection: {
    width: 200,
    height: 200,
    marginBottom: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  
  // Sección de texto
  textSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    width: '100%',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  taglineText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 22,
    letterSpacing: 0.3,
  },
  
  // Instrucciones
  instructionContainer: {
    paddingBottom: 40,
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