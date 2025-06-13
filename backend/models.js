// backend/models.js - Versión corregida con mejor manejo de índices
const mongoose = require("mongoose");
const { getMainConnection, getProductsConnection } = require('./mongoConnections');

// =================== SCHEMAS PRINCIPALES ===================

// User Schema (DB Principal)
const UserSchema = new mongoose.Schema({
  userID: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  language: { type: String, default: "en" },
  trialPeriodDays: { type: Number, default: 5 },
  googleId: { type: String, sparse: true },
  authProvider: { type: String, default: 'local' }
}, { timestamps: true });

// Articles Schema (DB Principal)
const ArticleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: String },
  category: { type: String },
  tags: [String],
  publishedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// History Schema (DB Principal)
const HistorySchema = new mongoose.Schema({
  userID: { type: String, required: true },
  itemID: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

// Product Ingredients Schema (DB Principal)
const ProductIngredientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  category: { type: String },
  properties: { type: Object },
  safetyLevel: { type: String }
}, { timestamps: true });

// Product Notes Schema (DB Principal)
const ProductNoteSchema = new mongoose.Schema({
  productID: { type: String, required: true },
  userID: { type: String, required: true },
  note: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5 }
}, { timestamps: true });

// Wishlist Schema (DB Principal)
const WishlistSchema = new mongoose.Schema({
  userID: { type: String, required: true },
  productID: { type: String, required: true },
  addedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Test Schema (DB Principal)
const TestSchema = new mongoose.Schema({
  userID: { type: String, required: true },
  itemID: { type: String, required: true },
  startDate: { type: Date, default: Date.now },
  finishDate: { type: Date, required: true },
  completed: { type: Boolean, default: false },
  result: { type: String, enum: ['Critic', 'Sensitive', 'Safe', null], default: null }
}, { timestamps: true });

// Product Reaction Schema (DB Principal)
const ProductReactionSchema = new mongoose.Schema({
  userID: { type: String, required: true },
  productID: { type: String, required: true },
  reaction: { type: String, enum: ['Critic', 'Sensitive', 'Safe'], required: true }
}, { timestamps: true });

// Ingredient Reaction Schema (DB Principal)
const IngredientReactionSchema = new mongoose.Schema({
  userID: { type: String, required: true },
  ingredientName: { type: String, required: true },
  reaction: { type: String, enum: ['Critic', 'Sensitive', 'Safe'], required: true }
}, { timestamps: true });

// =================== SCHEMAS DE PRODUCTOS (DB PRODUCTOS) ===================

// Product Schema (DB Productos) - Versión mejorada
const ProductSchema = new mongoose.Schema({
  code: { 
    type: mongoose.Schema.Types.Mixed, // Puede ser String o Number 
    required: true,
    index: true 
  },
  product_name: { 
    type: String, 
    required: true,
    index: true // Índice simple adicional para queries directas
  },
  brands: { 
    type: String, 
    required: true,
    index: true // Índice simple adicional para queries directas
  },
  ingredients_text: { 
    type: String, 
    required: true 
  }
}, { 
  timestamps: false, // Los datos vienen de OpenFoodFacts, no necesitamos timestamps
  collection: 'opff1' // Especificar la colección exacta que usaste
});

// =================== ÍNDICES MEJORADOS ===================

// Índice único en el código del producto
ProductSchema.index({ code: 1 }, { unique: true });

// Índices simples para búsquedas básicas (fallback)
ProductSchema.index({ product_name: 1 });
ProductSchema.index({ brands: 1 });

// ⚠️ IMPORTANTE: No definir el índice de texto aquí
// El índice de texto se crea dinámicamente en routes.js
// Esto es porque los índices definidos en schemas no siempre se crean automáticamente
// y pueden causar problemas de sincronización

// =================== FUNCIONES DE INICIALIZACIÓN ===================

let modelsInitialized = false;
let models = {};

/**
 * Verifica y crea índices básicos necesarios
 */
async function ensureBasicIndexes() {
  try {
    console.log("🔧 Verificando índices básicos...");
    
    const productsConnection = getProductsConnection();
    if (!productsConnection) {
      console.log("⚠️ Conexión de productos no disponible para crear índices");
      return false;
    }
    
    // Obtener la colección directamente
    const collection = productsConnection.collection('opff1');
    
    // Verificar índices existentes
    const existingIndexes = await collection.getIndexes();
    console.log("📋 Índices existentes:", Object.keys(existingIndexes));
    
    // Lista de índices básicos que necesitamos
    const requiredIndexes = [
      { key: { code: 1 }, name: 'code_1', unique: true },
      { key: { product_name: 1 }, name: 'product_name_1' },
      { key: { brands: 1 }, name: 'brands_1' }
    ];
    
    // Crear índices faltantes
    for (const indexDef of requiredIndexes) {
      if (!existingIndexes[indexDef.name]) {
        try {
          console.log(`🔨 Creando índice: ${indexDef.name}`);
          await collection.createIndex(indexDef.key, {
            name: indexDef.name,
            unique: indexDef.unique || false,
            background: true // Crear en background para no bloquear
          });
          console.log(`✅ Índice creado: ${indexDef.name}`);
        } catch (indexError) {
          console.error(`❌ Error creando índice ${indexDef.name}:`, indexError.message);
        }
      }
    }
    
    console.log("✅ Verificación de índices básicos completada");
    return true;
  } catch (error) {
    console.error("❌ Error en verificación de índices básicos:", error);
    return false;
  }
}

/**
 * Inicializa todos los modelos con sus respectivas conexiones
 */
async function initializeModels() {
  if (modelsInitialized) {
    return models;
  }

  try {
    // Obtener conexiones
    const mainConnection = getMainConnection();
    const productsConnection = getProductsConnection();

    if (!mainConnection || !productsConnection) {
      throw new Error("Las conexiones de base de datos no están inicializadas");
    }

    console.log("🔧 Inicializando modelos...");

    // =================== MODELOS DB PRINCIPAL ===================
    models.User = mainConnection.model("User", UserSchema, "user");
    models.Article = mainConnection.model("Article", ArticleSchema, "articles");
    models.History = mainConnection.model("History", HistorySchema, "history");
    models.ProductIngredient = mainConnection.model("ProductIngredient", ProductIngredientSchema, "productingredients");
    models.ProductNote = mainConnection.model("ProductNote", ProductNoteSchema, "productnotes");
    models.Wishlist = mainConnection.model("Wishlist", WishlistSchema, "wishlist");
    models.Test = mainConnection.model("Test", TestSchema, "tests");
    models.ProductReaction = mainConnection.model("ProductReaction", ProductReactionSchema, "productreactions");
    models.IngredientReaction = mainConnection.model("IngredientReaction", IngredientReactionSchema, "ingredientreactions");

    // =================== MODELOS DB PRODUCTOS ===================
    models.Product = productsConnection.model("Product", ProductSchema, "opff1");

    console.log("✅ Modelos inicializados correctamente");

    // =================== CREAR ÍNDICES BÁSICOS ===================
    await ensureBasicIndexes();

    modelsInitialized = true;
    return models;
  } catch (error) {
    console.error("❌ Error inicializando modelos:", error);
    throw error;
  }
}

/**
 * Obtiene los modelos (los inicializa si es necesario)
 */
async function getModels() {
  if (!modelsInitialized) {
    await initializeModels();
  }
  return models;
}

/**
 * Obtiene un modelo específico
 */
async function getModel(modelName) {
  const allModels = await getModels();
  if (!allModels[modelName]) {
    throw new Error(`Modelo '${modelName}' no encontrado`);
  }
  return allModels[modelName];
}

/**
 * Función de utilidad para obtener información de índices
 */
async function getIndexInfo() {
  try {
    const Product = await getModel('Product');
    const indexes = await Product.collection.getIndexes();
    
    return {
      count: Object.keys(indexes).length,
      indexes: Object.keys(indexes),
      hasTextIndex: Object.values(indexes).some(index => 
        index.key && index.key._fts === 'text'
      ),
      details: indexes
    };
  } catch (error) {
    console.error("Error obteniendo información de índices:", error);
    return { error: error.message };
  }
}

// =================== EXPORTS ===================

module.exports = {
  // Funciones de inicialización
  initializeModels,
  getModels,
  getModel,
  
  // Nuevas funciones de utilidad
  ensureBasicIndexes,
  getIndexInfo,
  
  // Schemas para referencia (si necesitas crear modelos dinámicamente)
  schemas: {
    UserSchema,
    ArticleSchema,
    HistorySchema,
    ProductIngredientSchema,
    ProductNoteSchema,
    WishlistSchema,
    TestSchema,
    ProductReactionSchema,
    IngredientReactionSchema,
    ProductSchema
  },

  // Funciones de acceso directo (para compatibilidad)
  User: () => getModel('User'),
  Article: () => getModel('Article'),
  History: () => getModel('History'),
  ProductIngredient: () => getModel('ProductIngredient'),
  ProductNote: () => getModel('ProductNote'),
  Wishlist: () => getModel('Wishlist'),
  Test: () => getModel('Test'),
  ProductReaction: () => getModel('ProductReaction'),
  IngredientReaction: () => getModel('IngredientReaction'),
  Product: () => getModel('Product')
};