// app/components/Home/CategoriesComponent.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { categoryStyles } from '../../styles/HomeComponentStyles';

const { width } = Dimensions.get('window');

export default function CategoriesComponent() {
  const router = useRouter();
  
  // Detectar si es tablet (iPad)
  const isTablet = width >= 768;
  
  const categories = [
    { icon: '', text: 'Dairy', color: '#FFCC66', brand: 'Dairy' },
    { icon: '', text: 'Fruits', color: '#66CC99', brand: 'Fruit' },
    { icon: '', text: 'Grains', color: '#FF8888', brand: 'Grain' },
    { icon: '', text: 'Legumes', color: '#77AAFF', brand: 'Legume' },
    { icon: '', text: 'Meat', color: '#FFAA99', brand: 'Meat' },
    { icon: '', text: 'Nuts', color: '#AAAAAA', brand: 'Nut' },
    { icon: '', text: 'Seafood', color: '#9999FF', brand: 'Seafood' },
    { icon: '', text: 'Vegetables', color: '#88DDAA', brand: 'Vegetable' },
  ];
  
  const handleCategoryPress = (categoryName: string, brand: string) => {
    router.push(`/screens/CategoryListScreen?category=${categoryName}&brand=${brand}`);
  };

  return (
    <>
      <Text style={categoryStyles.sectionTitle}>Food Categories</Text>
      <View style={[
        categoryStyles.categoriesContainer, 
        isTablet && categoryStyles.categoriesContainerTablet
      ]}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.text}
            style={[
              categoryStyles.categoryItem, 
              { backgroundColor: category.color },
              isTablet && categoryStyles.categoryItemTablet
            ]}
            onPress={() => handleCategoryPress(category.text, category.brand)}
          >
            <Text style={categoryStyles.categoryIcon}>{category.icon}</Text>
            <Text style={[
              categoryStyles.categoryText,
              isTablet && categoryStyles.categoryTextTablet
            ]}>
              {category.text}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
}