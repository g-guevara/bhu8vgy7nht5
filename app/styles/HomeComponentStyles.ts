// app/styles/HomeComponentStyles.ts - Estilos actualizados con soporte para iPad
import { StyleSheet } from 'react-native';

// Main HomeScreen Styles
export const homeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 50,
    marginBottom: 20,
  },
  profileButton: {
    marginTop: 7,
    padding: 8,
  },
  profileButtonText: {
    color: '#007BFF',
    fontWeight: '600',
    fontSize: 16,
  },
});

// Search Component Styles - ACTUALIZADOS CON BOTÓN SEARCH
export const searchStyles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f7',
    borderRadius: 10,
    paddingLeft: 15,
    paddingRight: 5,
    marginBottom: 17,
    height: 50,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingRight: 10,
  },
  
  // NUEVO: Botón de búsqueda
  searchButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 5,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  clearButton: {
    padding: 8,
    marginLeft: 5,
  },
  clearButtonText: {
    fontSize: 18,
    color: '#999',
  },
  resultsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 10,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productImageContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  productEmoji: {
    fontSize: 24,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  productBrand: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  productIngredients: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  arrowIcon: {
    fontSize: 18,
    color: '#999',
  },
  noResultsContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f2f2f7',
    borderRadius: 10,
    marginTop: 10,
  },
  noResultsText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  noResultsSubtext: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    marginTop: 8,
  },
  
  // =================== ESTILOS DE PAGINACIÓN CORREGIDOS ===================
  paginationContainer: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingHorizontal: 5,
  },
  
  // Información de paginación
  paginationInfo: {
    alignItems: 'center',
    marginBottom: 15,
  },
  paginationInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  
  // Controles de paginación - Layout mejorado
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  
  // Botones Anterior/Siguiente - Solo flechas
  paginationButton: {
    width: 40,
    height: 40,
    backgroundColor: '#000',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  paginationButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  paginationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  paginationButtonTextDisabled: {
    color: '#999',
  },
  
  // Números de página - Contenedor centrado
  paginationPageNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 15,
    minHeight: 40,
  },
  paginationPageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3,
    backgroundColor: '#f0f0f0',
  },
  paginationPageButtonActive: {
    backgroundColor: '#000',
  },
  paginationPageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  paginationPageButtonTextActive: {
    color: '#fff',
  },
});

// Categories Component Styles - ACTUALIZADOS CON SOPORTE PARA iPAD
export const categoryStyles = StyleSheet.create({
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 15,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 80,
  },
  // 🆕 NUEVO: Contenedor para tablets - una columna
  categoriesContainerTablet: {
    flexDirection: 'column',
    flexWrap: 'nowrap',

  },
  categoryItem: {
    width: '48%',
    height: 120,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  // 🆕 NUEVO: Categoría para tablets - ancho completo
  categoryItemTablet: {
    width: '100%',
    height: 80, // Altura menor para no ocupar demasiado espacio
    flexDirection: 'row',

    paddingHorizontal: 30,
    marginBottom: 12,
  },
  categoryIcon: {
    fontSize: 24,
    color: 'white',
    marginBottom: 10,
  },
  categoryText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  // 🆕 NUEVO: Texto para tablets - sin margen bottom
  categoryTextTablet: {
    marginLeft: 20, // Espacio entre icono y texto en layout horizontal
    marginBottom: 0, // Quitar margen bottom en layout horizontal
    fontSize: 28, // Texto un poco más grande para tablets
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
});