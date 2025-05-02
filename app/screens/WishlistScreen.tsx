import React, { useState } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  TextInput,
  FlatList,
  TouchableOpacity,
  Image
} from 'react-native';
import { styles } from '../styles/WishlistStyles';

// Datos de ejemplo para la wishlist
const wishlistData = [
  {
    id: '1',
    name: 'Tuna',
    category: 'Seafood',
    image: '🐟',
    backgroundColor: '#e1f0ff',
  },
  {
    id: '2',
    name: 'Banana',
    category: 'Fruits',
    image: '🍌',
    backgroundColor: '#fff7e6',
  },
  {
    id: '3',
    name: 'FizzUp',
    category: 'Pure Bubbles',
    image: '🥤',
    backgroundColor: '#e6f7f0',
  },
  {
    id: '4',
    name: 'CheezyPizza',
    category: 'Oven Fresh',
    image: '🍕',
    backgroundColor: '#ffefe6',
  },
];

export default function WishlistScreen() {
  const [searchText, setSearchText] = useState('');
  const [filteredData, setFilteredData] = useState(wishlistData);

  const handleSearch = (text: string) => {
    setSearchText(text);
    if (text) {
      const filtered = wishlistData.filter(item => 
        item.name.toLowerCase().includes(text.toLowerCase()) ||
        item.category.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredData(filtered);
    } else {
      setFilteredData(wishlistData);
    }
  };

  const renderItem = ({ item }: { item: typeof wishlistData[0] }) => (
    <TouchableOpacity style={styles.itemContainer}>
      <View style={[styles.imageContainer, { backgroundColor: item.backgroundColor }]}>
        <Text style={styles.itemEmoji}>{item.image}</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemCategory}>{item.category}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerText}>Wishlist</Text>
      
      <View style={styles.searchContainer}>
        <View style={styles.searchIcon}>
          <Text style={styles.searchIconText}>🔍</Text>
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={handleSearch}
        />
      </View>

      <FlatList
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
}