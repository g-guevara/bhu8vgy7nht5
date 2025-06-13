// backend/models.js - VERSIÓN SIMPLIFICADA SIN ÍNDICES DINÁMICOS
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

// =================== PRODUCT SCHEMA SIMPLIFICADO ===================

// Product Schema (DB Productos) - SÚPER SIMPLIFICADO
const ProductSchema = new mongoose.Schema({
  code: { 
    type: mongoose.Schema.Types.Mixed, // String o Number
    required: true
  },
  product_name: { 
    type: String, 
    required: true
  },
  brands: { 
    type: String, 
    required: true
  },
  ingredients_text: { 
    type: String, 
    required: true 
  }
}, { 
  timestamps: false, // No necesitamos timestamps para datos de OpenFoodFacts
  collection: 'opff1', // Nombre exacto de la colección
  strict: false // Permitir campos adicionales sin validación
});

// ❌ YA NO DEFINIMOS ÍNDICES AQUÍ - SE CREAN CON EL SCRIPT

// =================== INICIALIZACIÓN SIMPLIFICADA ===================

let modelsInitialized = false;
let models = {};

/**
 * Inicializa todos los modelos SIN crear índices
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

    console.log("🔧 Inicializando modelos (sin crear índices)...");

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

    // =================== MODELO DB PRODUCTOS ===================
    models.Product = productsConnection.model("Product", ProductSchema, "opff1");

    console.log("✅ Modelos inicializados correctamente (sin overhead de índices)");

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
 * Función de utilidad para obtener información de índices (solo lectura)
 */
async function getIndexInfo() {
  try {
    const Product = await getModel('Product');
    const indexes = await Product.collection.getIndexes();
    
    return {
      count: Object.keys(indexes).length,
      indexes: Object.keys(indexes),
      details: Object.keys(indexes).reduce((acc, name) => {
        acc[name] = {
          key: indexes[name].key,
          unique: indexes[name].unique || false,
          sparse: indexes[name].sparse || false
        };
        return acc;
      }, {})
    };
  } catch (error) {
    console.error("Error obteniendo información de índices:", error);
    return { error: error.message };
  }
}

// =================== EXPORTS SIMPLIFICADOS ===================

module.exports = {
  // Funciones principales
  initializeModels,
  getModels,
  getModel,
  
  // Función de información (solo lectura, no creación)
  getIndexInfo,
  
  // Schemas para referencia
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