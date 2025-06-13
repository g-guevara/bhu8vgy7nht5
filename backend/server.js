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

  console.log("🚀 Inicializando conexiones a las bases de datos...");
  
  let mainConnected = false;
  let productsConnected = false;
  
  try {
    // 1. Intentar conectar a la base de datos principal
    try {
      await initializeConnections();
      
      // 2. Configurar handlers de eventos
      setupConnectionHandlers();
      
      // 3. Verificar estados de conexión
      const status = getConnectionStatus();
      mainConnected = status.main.status === 'connected';
      productsConnected = status.products.status === 'connected';
      
      console.log(`📊 Estado después de conexión inicial:`, status);
      
      if (mainConnected || productsConnected) {
        // 4. Inicializar modelos solo si al menos una conexión funciona
        await initializeModels();
        
        dbInitialized = true;
        console.log(`✅ Inicialización completada. Principal: ${mainConnected ? '✅' : '❌'}, Productos: ${productsConnected ? '✅' : '❌'}`);
        
        return true;
      } else {
        throw new Error("Ninguna base de datos se pudo conectar");
      }
    } catch (connectionError) {
      console.error("❌ Error en conexiones:", connectionError);
      
      // Si hay error de conexión, intentar inicializar modelos con conexiones parciales
      try {
        const status = getConnectionStatus();
        console.log("🔄 Intentando inicializar modelos con conexiones parciales:", status);
        
        if (status.main.status === 'connected' || status.products.status === 'connected') {
          await initializeModels();
          dbInitialized = true;
          console.log("⚠️ Inicialización parcial completada");
          return true;
        }
      } catch (modelError) {
        console.error("❌ Error inicializando modelos:", modelError);
      }
      
      throw connectionError;
    }
  } catch (error) {
    console.error("💥 Error fatal inicializando bases de datos:", error);
    
    // Marcar como inicializado para evitar reintentos constantes
    dbInitialized = true;
    
    // No lanzar error, permitir que el servidor continúe
    console.log("⚠️ Servidor continuará con funcionalidad limitada");
    return false;
  }
}

// =================== MIDDLEWARE DE VERIFICACIÓN DE CONEXIÓN ===================

app.use(async (req, res, next) => {
  // Skip database check for health and root routes
  if (req.path === '/' || req.path === '/health' || req.path === '/diagnostico') {
    return next();
  }
  
  try {
    // Initialize databases if not already done
    if (!dbInitialized) {
      console.log("🔄 Inicializando bases de datos en middleware...");
      try {
        await initializeDatabases();
      } catch (initError) {
        console.error("❌ Error inicializando DBs en middleware:", initError);
        // No bloquear completamente, continuar con conexiones parciales
      }
    }
    
    // Check connection status
    const status = getConnectionStatus();
    console.log(`📊 Estado de conexiones para ${req.path}:`, status);
    
    // Para rutas de productos, verificar DB de productos
    if (req.path.includes('/products')) {
      const productsConnected = status.products.status === 'connected';
      
      if (!productsConnected) {
        console.error(`❌ DB de productos no disponible para ${req.path}`);
        console.log("🔄 Intentando reconectar a DB de productos...");
        
        // Intentar reconectar una vez más
        try {
          await initializeDatabases();
          const newStatus = getConnectionStatus();
          if (newStatus.products.status !== 'connected') {
            return res.status(503).json({ 
              error: "Products database unavailable",
              message: "La base de datos de productos no está disponible temporalmente",
              status: newStatus.products.status,
              suggestion: "Por favor, intenta nuevamente en unos momentos"
            });
          }
        } catch (retryError) {
          console.error("❌ Error en reintento de conexión:", retryError);
          return res.status(503).json({ 
            error: "Products database unavailable",
            message: "No se puede conectar a la base de datos de productos",
            details: retryError.message
          });
        }
      }
    }
    
    // Para otras rutas, verificar DB principal (pero ser más permisivo)
    if (!req.path.includes('/products')) {
      const mainConnected = status.main.status === 'connected';
      
      if (!mainConnected) {
        console.warn(`⚠️ DB principal no conectada para ${req.path}, intentando continuar...`);
        
        // Solo bloquear si la ruta requiere autenticación y la DB está completamente desconectada
        if (status.main.status === 'disconnected') {
          return res.status(503).json({ 
            error: "Main database unavailable",
            message: "La base de datos principal no está disponible temporalmente"
          });
        }
        // Si está "connecting", permitir continuar
      }
    }
    
    next();
  } catch (error) {
    console.error("💥 Error en middleware de DB:", error);
    
    // Si es un error crítico, responder con error, sino continuar
    if (error.message.includes('timeout') || error.message.includes('connection')) {
      return res.status(503).json({ 
        error: "Database connection error",
        message: "Error temporal de conexión a la base de datos"
      });
    }
    
    // Para otros errores, continuar y que la ruta maneje el error
    next();
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