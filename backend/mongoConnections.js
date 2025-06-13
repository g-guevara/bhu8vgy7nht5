// backend/mongoConnections.js
const mongoose = require("mongoose");

// Cache para las conexiones
let mainDbConnection = null;
let productsDbConnection = null;

// Configuración de las bases de datos
const DB_CONFIGS = {
  // Base de datos principal (usuarios, tests, etc.)
  main: {
    uri: process.env.MONGODB_URI, // mongodb+srv://db:db@g4.qjjm4pj.mongodb.net/...
    dbName: "sensitivv",
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    }
  },
  
  // Base de datos de productos (OpenFoodFacts)
  products: {
    uri: "mongodb+srv://frituMA3wuxUBrLXl1re:11lBr2phenuwrebopher@cluster0.sz3esol.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
    dbName: "test", // Ajusta según el nombre real de tu DB
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    }
  }
};

/**
 * Conecta a la base de datos principal
 */
async function connectToMainDB() {
  if (mainDbConnection && mainDbConnection.readyState === 1) {
    return mainDbConnection;
  }

  try {
    console.log("🔄 Conectando a la base de datos principal...");
    mainDbConnection = await mongoose.createConnection(
      DB_CONFIGS.main.uri, 
      {
        ...DB_CONFIGS.main.options,
        dbName: DB_CONFIGS.main.dbName
      }
    );
    
    console.log("✅ Conectado a la base de datos principal");
    return mainDbConnection;
  } catch (error) {
    console.error("❌ Error conectando a la base de datos principal:", error);
    throw error;
  }
}

/**
 * Conecta a la base de datos de productos
 */
async function connectToProductsDB() {
  if (productsDbConnection && productsDbConnection.readyState === 1) {
    return productsDbConnection;
  }

  try {
    console.log("🔄 Conectando a la base de datos de productos...");
    productsDbConnection = await mongoose.createConnection(
      DB_CONFIGS.products.uri,
      {
        ...DB_CONFIGS.products.options,
        dbName: DB_CONFIGS.products.dbName
      }
    );
    
    console.log("✅ Conectado a la base de datos de productos");
    return productsDbConnection;
  } catch (error) {
    console.error("❌ Error conectando a la base de datos de productos:", error);
    throw error;
  }
}

/**
 * Inicializa ambas conexiones
 */
async function initializeConnections() {
  try {
    await Promise.all([
      connectToMainDB(),
      connectToProductsDB()
    ]);
    console.log("🚀 Todas las bases de datos conectadas exitosamente");
  } catch (error) {
    console.error("💥 Error inicializando las conexiones:", error);
    throw error;
  }
}

/**
 * Verifica el estado de las conexiones
 */
function getConnectionStatus() {
  const mainStatus = mainDbConnection ? mainDbConnection.readyState : 0;
  const productsStatus = productsDbConnection ? productsDbConnection.readyState : 0;
  
  const statusMap = {
    0: "disconnected",
    1: "connected", 
    2: "connecting",
    3: "disconnecting"
  };
  
  return {
    main: {
      status: statusMap[mainStatus] || "unknown",
      dbName: DB_CONFIGS.main.dbName
    },
    products: {
      status: statusMap[productsStatus] || "unknown", 
      dbName: DB_CONFIGS.products.dbName
    }
  };
}

/**
 * Manejo de errores y reconexión
 */
function setupConnectionHandlers() {
  // Handlers para la DB principal
  if (mainDbConnection) {
    mainDbConnection.on('error', (err) => {
      console.error('❌ Error en DB principal:', err);
    });
    
    mainDbConnection.on('disconnected', () => {
      console.log('⚠️ DB principal desconectada, reintentando...');
      setTimeout(connectToMainDB, 5000);
    });
  }
  
  // Handlers para la DB de productos
  if (productsDbConnection) {
    productsDbConnection.on('error', (err) => {
      console.error('❌ Error en DB de productos:', err);
    });
    
    productsDbConnection.on('disconnected', () => {
      console.log('⚠️ DB de productos desconectada, reintentando...');
      setTimeout(connectToProductsDB, 5000);
    });
  }
}

module.exports = {
  connectToMainDB,
  connectToProductsDB,
  initializeConnections,
  getConnectionStatus,
  setupConnectionHandlers,
  getMainConnection: () => mainDbConnection,
  getProductsConnection: () => productsDbConnection
};