// app/components/onboarding/OnboardingPageTwo.tsx
import React from 'react';
import { View, Text, StyleSheet, Dimensions, Image, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// Detectar si es iPad
const isIPad = Platform.OS === 'ios' && Platform.isPad || 
              (width >= 768 && height >= 1024) || 
              (width >= 1024 && height >= 768);

export default function OnboardingPageTwo() {
  return (
    <View style={[styles.container, isIPad && styles.containerIPad]}>
      <View style={[styles.contentContainer, isIPad && styles.contentContainerIPad]}>
        {/* Imagen del mockup */}
        <View style={styles.imageContainer}>
          <Image 
            source={require('../../../assets/images/onboarding/fullsc.png')}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        {/* Textos separados de la imagen */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>The Food</Text>
          
          <Text style={styles.description}>
            This is the center of the app: where you'll find all the details about a food item. To use the app effectively, follow these steps
          </Text>
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
  containerIPad: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  contentContainerIPad: {
    justifyContent: 'center',
    maxWidth: 600,
    alignSelf: 'center',
  },
  imageContainer: {
    flex: 1.2, // Más espacio para la imagen
    width: width * 0.95, // 95% del ancho de pantalla
    maxHeight: 550, // Altura máxima aumentada
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    maxHeight: 550, // Altura máxima aumentada
  },
  textContainer: {
    alignItems: 'center',
    paddingBottom: 20,
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