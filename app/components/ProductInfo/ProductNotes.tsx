// app/components/ProductInfo/ProductNotes.tsx
import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { styles } from '../../styles/ProductInfoStyles';

interface ProductNotesProps {
  notes: string;
  setNotes: (notes: string) => void;
}

const ProductNotes: React.FC<ProductNotesProps> = ({ notes, setNotes }) => {
  return (
    <>
      <Text style={styles.sectionTitle}>Notes</Text>
      <TextInput
        style={styles.notesInput}
        multiline
        placeholder="Notes"
        value={notes}
        onChangeText={setNotes}
      />
    </>
  );
};

export default ProductNotes;