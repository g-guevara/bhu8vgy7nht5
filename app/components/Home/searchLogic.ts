// app/components/Home/searchLogic.ts - Lógica de búsqueda y configuración de API

// Configuración exacta del Python
export const API_CONFIG = {
  DB1_URL: 'https://products-api-database1.vercel.app/',
  DB2_URL: 'https://products-api-database2.vercel.app/',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 2
};

// Mapeo exacto del Python
export const DB1_COLLECTIONS = ['a_b', 'c', 'd_e', 'f_h', 'i_l'];  // A-L
export const DB2_COLLECTIONS = ['m_n', 'o_q', 'r_s', 't_z'];       // M-Z

// Tipos para el mapeo de colecciones
export interface CollectionInfo {
  uri: string;
  collection: string;
  db: number;
}

export interface Product {
  code: string;
  product_name: string;
  brands: string;
  ingredients_text: string;
}

export interface ProductWithImageAndEmoji extends Product {
  emoji?: string;
  relevanceScore: number;
  imageUri?: string | null;
  imageLoading?: boolean;
  imageError?: boolean;
}

// Mapeo de letras a colecciones - EXACTO DEL PYTHON
export const COLLECTION_MAPPING: Record<string, CollectionInfo> = {
  // Base de datos 1 (A-L)
  'a': { uri: API_CONFIG.DB1_URL, collection: 'a_b', db: 1 },
  'b': { uri: API_CONFIG.DB1_URL, collection: 'a_b', db: 1 },
  'c': { uri: API_CONFIG.DB1_URL, collection: 'c', db: 1 },
  'd': { uri: API_CONFIG.DB1_URL, collection: 'd_e', db: 1 },
  'e': { uri: API_CONFIG.DB1_URL, collection: 'd_e', db: 1 },
  'f': { uri: API_CONFIG.DB1_URL, collection: 'f_h', db: 1 },
  'g': { uri: API_CONFIG.DB1_URL, collection: 'f_h', db: 1 },
  'h': { uri: API_CONFIG.DB1_URL, collection: 'f_h', db: 1 },
  'i': { uri: API_CONFIG.DB1_URL, collection: 'i_l', db: 1 },
  'j': { uri: API_CONFIG.DB1_URL, collection: 'i_l', db: 1 },
  'k': { uri: API_CONFIG.DB1_URL, collection: 'i_l', db: 1 },
  'l': { uri: API_CONFIG.DB1_URL, collection: 'i_l', db: 1 },
  // Base de datos 2 (M-Z)
  'm': { uri: API_CONFIG.DB2_URL, collection: 'm_n', db: 2 },
  'n': { uri: API_CONFIG.DB2_URL, collection: 'm_n', db: 2 },
  'o': { uri: API_CONFIG.DB2_URL, collection: 'o_q', db: 2 },
  'p': { uri: API_CONFIG.DB2_URL, collection: 'o_q', db: 2 },
  'q': { uri: API_CONFIG.DB2_URL, collection: 'o_q', db: 2 },
  'r': { uri: API_CONFIG.DB2_URL, collection: 'r_s', db: 2 },
  's': { uri: API_CONFIG.DB2_URL, collection: 'r_s', db: 2 },
  't': { uri: API_CONFIG.DB2_URL, collection: 't_z', db: 2 },
  'u': { uri: API_CONFIG.DB2_URL, collection: 't_z', db: 2 },
  'v': { uri: API_CONFIG.DB2_URL, collection: 't_z', db: 2 },
  'w': { uri: API_CONFIG.DB2_URL, collection: 't_z', db: 2 },
  'x': { uri: API_CONFIG.DB2_URL, collection: 't_z', db: 2 },
  'y': { uri: API_CONFIG.DB2_URL, collection: 't_z', db: 2 },
  'z': { uri: API_CONFIG.DB2_URL, collection: 't_z', db: 2 },
};

// FUNCIÓN EXACTA DEL PYTHON: get_collection_for_search_term
export function getCollectionForSearchTerm(searchTerm: string): CollectionInfo | null {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return null;
  }
  
  const firstLetter = searchTerm.toLowerCase().trim()[0];
  
  return COLLECTION_MAPPING[firstLetter] || null;
}

// FUNCIÓN EXACTA DEL PYTHON: calculate_relevance_score
export function calculateRelevanceScore(product: Product, searchTerm: string): number {
  const name = product.product_name.toLowerCase();
  const brands = product.brands.toLowerCase();
  const searchLower = searchTerm.toLowerCase();
  
  let score = 0;
  
  // Máxima puntuación: nombre empieza exactamente con el término
  if (name.startsWith(searchLower)) {
    score += 1000;
  }
  
  // Alta puntuación: nombre contiene el término al inicio de una palabra
  else if (name.includes(` ${searchLower}`) || name.includes(`-${searchLower}`)) {
    score += 800;
  }
  
  // Puntuación media-alta: marca empieza con el término
  else if (brands.startsWith(searchLower)) {
    score += 600;
  }
  
  // Puntuación media: marca contiene el término al inicio de una palabra
  else if (brands.includes(` ${searchLower}`) || brands.includes(`-${searchLower}`)) {
    score += 400;
  }
  
  // Puntuación baja: nombre contiene el término en cualquier parte
  else if (name.includes(searchLower)) {
    score += 200;
  }
  
  // Puntuación muy baja: marca contiene el término en cualquier parte
  else if (brands.includes(searchLower)) {
    score += 100;
  }
  
  // Bonificación por longitud del nombre
  if (name.length < 50) {
    score += 50;
  }
  
  // Bonificación si el nombre es similar en longitud al término buscado
  const nameWords = name.split(' ');
  if (nameWords.length <= 3) {
    score += 30;
  }
  
  return score;
}

// FUNCIÓN CORREGIDA: Con noScoring=true para evitar doble scoring
export async function searchInSpecificCollection(searchTerm: string): Promise<ProductWithImageAndEmoji[]> {
  const collectionInfo = getCollectionForSearchTerm(searchTerm);
  
  if (!collectionInfo) {
    console.log(`❌ No se pudo determinar colección para: "${searchTerm}"`);
    return [];
  }
  
  const { uri, collection, db } = collectionInfo;
  const dbName = db === 1 ? "1 (A-L)" : "2 (M-Z)";
  
  console.log(`🎯 Buscando "${searchTerm}" en DB${db}, colección ${collection}`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
    
    // IMPORTANTE: Usar noScoring=true para desactivar el scoring de la API
    const response = await fetch(`${uri}/api/search?q=${encodeURIComponent(searchTerm)}&type=name&limit=500&debug=false&noScoring=true`, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ DB${db} respondió: ${data.results?.length || 0} productos`);
    
    if (!data.results || data.results.length === 0) {
      return [];
    }
    
    // IMPORTANTE: Aplicar NUESTRO sistema de scoring (el de Python)
    // ignorando cualquier scoring que venga de la API
    const resultsWithScores = data.results.map((product: Product): ProductWithImageAndEmoji => {
      const relevanceScore = calculateRelevanceScore(product, searchTerm);
      return {
        ...product,
        relevanceScore,
        imageUri: null,
        imageLoading: false,
        imageError: false
      };
    });
    
    // Ordenar por NUESTRO score de relevancia (descendente)
    const sortedResults = resultsWithScores
      .filter((product: ProductWithImageAndEmoji) => product.relevanceScore > 0)
      .sort((a: ProductWithImageAndEmoji, b: ProductWithImageAndEmoji) => b.relevanceScore - a.relevanceScore);
    
    console.log(`📊 Resultados finales: ${sortedResults.length} con relevancia > 0`);
    
    // Log top 3 para debugging
    if (__DEV__ && sortedResults.length > 0) {
      console.log('🏆 Top 3 resultados:');
      sortedResults.slice(0, 3).forEach((r: ProductWithImageAndEmoji, i: number) => {
        console.log(`${i+1}. "${r.product_name}" (${r.brands}) - Score: ${r.relevanceScore}`);
      });
    }
    
    return sortedResults;
    
  } catch (error) {
    console.error(`❌ Error en DB${db}:`, error);
    throw error;
  }
}