// backend/server.js - Actualizado para múltiples bases de datos
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const { 
  initializeConnections, 
  getConnectionStatus,
  setupConnectionHandlers 
} = require('./mongoConnections');
const { initializeModels } = require('./models');

const app = express();

// =================== MIDDLEWARE ===================

// Configuración detallada de CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'User-ID'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =================== INICIALIZACIÓN DE BASES DE DATOS ===================

let dbInitialized = false;

/**
 * Inicializa todas las conexiones y modelos
 */
async function initializeDatabases() {
  if (dbInitialized) {
    return true;
  }

  try {
    console.log("🚀 Inicializando conexiones a las bases de datos...");
    
    // 1. Conectar a ambas bases de datos
    await initializeConnections();
    
    // 2. Configurar handlers de eventos
    setupConnectionHandlers();
    
    // 3. Inicializar modelos
    await initializeModels();
    
    dbInitialized = true;
    console.log("✅ Todas las bases de datos y modelos inicializados correctamente");
    
    return true;
  } catch (error) {
    console.error("💥 Error inicializando bases de datos:", error);
    throw error;
  }
}

// =================== MIDDLEWARE DE VERIFICACIÓN DE CONEXIÓN ===================

app.use(async (req, res, next) => {
  // Skip database check for health and root routes
  if (req.path === '/' || req.path === '/health') {
    return next();
  }
  
  try {
    // Initialize databases if not already done
    if (!dbInitialized) {
      console.log("🔄 Inicializando bases de datos en middleware...");
      await initializeDatabases();
    }
    
    // Check connection status
    const status = getConnectionStatus();
    
    // Verificar que al menos una conexión esté activa
    const mainConnected = status.main.status === 'connected';
    const productsConnected = status.products.status === 'connected';
    
    // Para rutas de productos, necesitamos la DB de productos
    if (req.path.includes('/products') && !productsConnected) {
      console.error("❌ DB de productos no conectada para ruta:", req.path);
      return res.status(503).json({ 
        error: "Products database unavailable",
        message: "La base de datos de productos no está disponible temporalmente"
      });
    }
    
    // Para otras rutas, necesitamos la DB principal
    if (!req.path.includes('/products') && !mainConnected) {
      console.error("❌ DB principal no conectada para ruta:", req.path);
      return res.status(503).json({ 
        error: "Main database unavailable",
        message: "La base de datos principal no está disponible temporalmente"
      });
    }
    
    next();
  } catch (error) {
    console.error("💥 Error en middleware de DB:", error);
    return res.status(500).json({ 
      error: "Database initialization error",
      message: "Error al conectar con las bases de datos"
    });
  }
});

// =================== RUTAS DE SALUD Y DIAGNÓSTICO ===================

// Health check mejorado
app.get("/health", (req, res) => {
  const status = getConnectionStatus();
  
  res.json({
    status: "ok",
    timestamp: new Date(),
    uptime: process.uptime(),
    databases: status,
    dbInitialized: dbInitialized
  });
});

// Ruta de diagnóstico extendida
app.get("/diagnostico", async (req, res) => {
  try {
    const status = getConnectionStatus();
    const { getModels } = require('./models');
    
    let counts = {};
    let error = null;
    
    try {
      // Solo intentar contar si las DBs están conectadas
      const models = await getModels();
      
      if (status.main.status === 'connected') {
        counts.usuarios = await models.User.countDocuments();
        counts.tests = await models.Test.countDocuments();
        counts.wishlists = await models.Wishlist.countDocuments();
      }
      
      if (status.products.status === 'connected') {
        counts.productos = await models.Product.countDocuments();
      }
    } catch (countError) {
      error = countError.message;
      console.error("Error contando documentos:", countError);
    }
    
    res.json({
      servidor: {
        tiempo: new Date().toISOString(),
        uptime: process.uptime(),
        nodeVersion: process.version,
        dbInitialized
      },
      basesdatos: status,
      contadores: counts,
      error: error
    });
  } catch (error) {
    res.status(500).json({ 
      error: "Error en diagnóstico",
      message: error.message 
    });
  }
});

// Ruta de prueba
app.get("/", (req, res) => {
  res.json({ 
    message: "🚀 Servidor con múltiples bases de datos funcionando correctamente",
    timestamp: new Date(),
    databases: getConnectionStatus()
  });
});

// =================== RUTAS PRINCIPALES ===================

// Use routes
app.use(routes);

// =================== MANEJO DE ERRORES ===================

app.use((err, req, res, next) => {
  console.error("💥 Error en el servidor:", err);
  
  // Error de validación de Mongoose
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Los datos proporcionados no son válidos",
      details: Object.values(err.errors).map(e => e.message)
    });
  }
  
  // Error de duplicado en MongoDB
  if (err.code === 11000) {
    return res.status(409).json({
      error: "DUPLICATE_ENTRY",
      message: "Ya existe un registro con estos datos"
    });
  }
  
  // Error de conexión a la base de datos
  if (err.name === 'MongoError' || err.name === 'MongooseError') {
    return res.status(503).json({
      error: "DATABASE_ERROR",
      message: "Problema temporal con la base de datos. Intenta más tarde."
    });
  }
  
  // Error genérico
  res.status(500).json({ 
    error: "INTERNAL_SERVER_ERROR",
    message: "Error interno del servidor. Por favor, intenta más tarde."
  });
});

// Middleware para asegurar que todas las respuestas sean JSON
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function(body) {
    if (typeof body === 'string' && !res.get('Content-Type')?.includes('json')) {
      res.set('Content-Type', 'application/json');
      body = JSON.stringify({ message: body });
    }
    return originalSend.call(this, body);
  };
  next();
});

// =================== INICIALIZACIÓN DEL SERVIDOR ===================

// Inicializar bases de datos al arrancar
initializeDatabases()
  .then(() => {
    console.log("🎉 Servidor listo para recibir peticiones");
  })
  .catch(error => {
    console.error("💥 Error fatal inicializando el servidor:", error);
    process.exit(1);
  });

// Exportar para Vercel
module.exports = app;

// Iniciar servidor si no está en Vercel
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log(`🌐 Servidor corriendo en http://localhost:${PORT}`);
    console.log("📊 Sistema de múltiples bases de datos activo");
    console.log("🔗 Base datos principal: Usuarios, tests, etc.");
    console.log("🛒 Base datos productos: OpenFoodFacts data");
  });
}