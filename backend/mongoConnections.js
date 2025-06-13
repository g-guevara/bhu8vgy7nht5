// backend/mongoConnections.js - Versión con mejor debug
const mongoose = require("mongoose");

// Cache para las conexiones
let mainDbConnection = null;
let productsDbConnection = null;

// Configuración de las bases de datos
const DB_CONFIGS = {
  // Base de datos principal (usuarios, tests, etc.)
  main: {
    uri: process.env.MONGODB_URI,
    dbName: "sensitivv",
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000, // Aumentado para Vercel
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      bufferCommands: false,
      family: 4 // Forzar IPv4
    }
  },
  
  // Base de datos de productos (OpenFoodFacts)
  products: {
    uri: process.env.PRODUCTS_MONGODB_URI || "mongodb+srv://frituMA3wuxUBrLXl1re:11lBr2phenuwrebopher@cluster0.sz3esol.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0",
    dbName: "test",
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 10000, // Aumentado para Vercel
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      bufferCommands: false,
      family: 4 // Forzar IPv4
    }
  }
};

/**
 * Conecta a la base de datos principal
 */
async function connectToMainDB() {
  if (mainDbConnection && mainDbConnection.readyState === 1) {
    console.log("✅ Reutilizando conexión principal existente");
    return mainDbConnection;
  }

  try {
    console.log("🔄 Conectando a la base de datos principal...");
    
    // Verificar que la URI existe
    if (!DB_CONFIGS.main.uri) {
      throw new Error("MONGODB_URI no está definida en las variables de entorno");
    }
    
    // Log parcial de la URI (por seguridad)
    const uriParts = DB_CONFIGS.main.uri.split('@');
    console.log("📍 Conectando a:", uriParts.length > 1 ? `***@${uriParts[1]}` : 'URI inválida');
    
    mainDbConnection = await mongoose.createConnection(
      DB_CONFIGS.main.uri, 
      DB_CONFIGS.main.options
    );
    
    // Configurar eventos
    mainDbConnection.on('connected', () => {
      console.log("✅ Base de datos principal conectada exitosamente");
    });
    
    mainDbConnection.on('error', (err) => {
      console.error("❌ Error en conexión principal:", err.message);
      console.error("Detalles:", err);
    });
    
    mainDbConnection.on('disconnected', () => {
      console.log("⚠️ Base de datos principal desconectada");
    });
    
    // Esperar a que la conexión se establezca
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout conectando a DB principal (10s)'));
      }, 10000);
      
      mainDbConnection.once('connected', () => {
        clearTimeout(timeout);
        resolve(true);
      });
      
      mainDbConnection.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
    
    console.log("✅ Conexión principal establecida");
    return mainDbConnection;
    
  } catch (error) {
    console.error("❌ Error conectando a la base de datos principal:");
    console.error("Tipo:", error.constructor.name);
    console.error("Mensaje:", error.message);
    console.error("Stack:", error.stack);
    
    // Información adicional de debug
    if (error.message.includes('ENOTFOUND')) {
      console.error("🔍 El servidor MongoDB no se puede encontrar. Verifica la URI.");
    } else if (error.message.includes('authentication')) {
      console.error("🔐 Error de autenticación. Verifica usuario y contraseña.");
    } else if (error.message.includes('timeout')) {
      console.error("⏱️ Timeout de conexión. El servidor puede estar inaccesible.");
    }
    
    mainDbConnection = null;
    throw error;
  }
}

/**
 * Conecta a la base de datos de productos
 */
async function connectToProductsDB() {
  if (productsDbConnection && productsDbConnection.readyState === 1) {
    console.log("✅ Reutilizando conexión de productos existente");
    return productsDbConnection;
  }

  try {
    console.log("🔄 Conectando a la base de datos de productos...");
    
    // Log parcial de la URI
    const uriParts = DB_CONFIGS.products.uri.split('@');
    console.log("📍 Conectando a productos:", uriParts.length > 1 ? `***@${uriParts[1]}` : 'URI inválida');
    
    productsDbConnection = await mongoose.createConnection(
      DB_CONFIGS.products.uri,
      DB_CONFIGS.products.options
    );
    
    // Configurar eventos
    productsDbConnection.on('connected', () => {
      console.log("✅ Base de datos de productos conectada exitosamente");
    });
    
    productsDbConnection.on('error', (err) => {
      console.error("❌ Error en conexión de productos:", err.message);
    });
    
    productsDbConnection.on('disconnected', () => {
      console.log("⚠️ Base de datos de productos desconectada");
    });
    
    // Esperar a que la conexión se establezca
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout conectando a DB de productos (10s)'));
      }, 10000);
      
      productsDbConnection.once('connected', () => {
        clearTimeout(timeout);
        resolve(true);
      });
      
      productsDbConnection.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
    
    console.log("✅ Conexión de productos establecida");
    return productsDbConnection;
    
  } catch (error) {
    console.error("❌ Error conectando a la base de datos de productos:");
    console.error("Tipo:", error.constructor.name);
    console.error("Mensaje:", error.message);
    
    productsDbConnection = null;
    throw error;
  }
}

/**
 * Inicializa ambas conexiones
 */
async function initializeConnections() {
  console.log("🚀 Iniciando conexiones a MongoDB...");
  console.log("📍 Entorno:", process.env.NODE_ENV || 'development');
  console.log("📍 Variables de entorno disponibles:", Object.keys(process.env).filter(k => k.includes('MONGO')));
  
  const results = {
    main: { success: false, error: null },
    products: { success: false, error: null }
  };
  
  // Intentar conectar a la DB principal
  try {
    await connectToMainDB();
    results.main.success = true;
  } catch (error) {
    results.main.error = error.message;
    console.error("⚠️ No se pudo conectar a la DB principal, continuando...");
  }
  
  // Intentar conectar a la DB de productos
  try {
    await connectToProductsDB();
    results.products.success = true;
  } catch (error) {
    results.products.error = error.message;
    console.error("⚠️ No se pudo conectar a la DB de productos, continuando...");
  }
  
  // Resumen de conexiones
  console.log("\n📊 Resumen de conexiones:");
  console.log("Principal:", results.main.success ? "✅ Conectada" : `❌ Error: ${results.main.error}`);
  console.log("Productos:", results.products.success ? "✅ Conectada" : `❌ Error: ${results.products.error}`);
  
  if (!results.main.success && !results.products.success) {
    throw new Error("No se pudo conectar a ninguna base de datos");
  }
  
  console.log("\n🎉 Conexiones inicializadas (parcial o completamente)");
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
      dbName: DB_CONFIGS.main.dbName,
      readyState: mainStatus
    },
    products: {
      status: statusMap[productsStatus] || "unknown", 
      dbName: DB_CONFIGS.products.dbName,
      readyState: productsStatus
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
      console.error('❌ Error en DB principal:', err.message);
    });
    
    mainDbConnection.on('disconnected', () => {
      console.log('⚠️ DB principal desconectada');
      mainDbConnection = null; // Limpiar conexión
    });
  }
  
  // Handlers para la DB de productos
  if (productsDbConnection) {
    productsDbConnection.on('error', (err) => {
      console.error('❌ Error en DB de productos:', err.message);
    });
    
    productsDbConnection.on('disconnected', () => {
      console.log('⚠️ DB de productos desconectada');
      productsDbConnection = null; // Limpiar conexión
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