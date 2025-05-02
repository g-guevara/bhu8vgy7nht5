// app/components/Home/CategoriesComponent.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { categoryStyles } from '../../styles/HomeComponentStyles';

export default function CategoriesComponent() {
  const categories = [
    { icon: '', text: 'Dairy', color: '#FFCC66' },
    { icon: '', text: 'Fruits', color: '#66CC99' },
    { icon: '', text: 'Grains', color: '#FF8888' },
    { icon: '', text: 'Legumes', color: '#77AAFF' },
    { icon: '', text: 'Meat', color: '#FFAA99' },
    { icon: '', text: 'Nuts', color: '#AAAAAA' },
    { icon: '', text: 'Seafood', color: '#9999FF' },
    { icon: '', text: 'Vegetables', color: '#88DDAA' },
  ];

  return (
    <>
      <Text style={categoryStyles.sectionTitle}>Food Categories</Text>
      <View style={categoryStyles.categoriesContainer}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.text}
            style={[categoryStyles.categoryItem, { backgroundColor: category.color }]}
          >
            <Text style={categoryStyles.categoryIcon}>{category.icon}</Text>
            <Text style={categoryStyles.categoryText}>{category.text}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
}