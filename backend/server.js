require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const routes = require("./routes");

// Connection pooling implementation
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  // Connection options optimized for serverless
  const options = {
    dbName: "sensitivv",
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10, // Adjust based on your needs
    serverSelectionTimeoutMS: 30000, // 30 seconds
    socketTimeoutMS: 45000, // 45 seconds
  };

  // Connect to the database
  const client = await mongoose.connect(process.env.MONGODB_URI, options);
  console.log("Connected to MongoDB");
  
  cachedDb = client;
  return client;
}

const app = express();

// Configuración detallada de CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'User-ID'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connection status check middleware
app.use(async (req, res, next) => {
  // Skip connection check for non-DB routes
  if (req.path === '/' || req.path === '/health') {
    return next();
  }
  
  try {
    // Check if we're connected, reconnect if needed
    if (mongoose.connection.readyState !== 1) {
      console.log("MongoDB not connected, reconnecting...");
      await connectToDatabase();
    }
    next();
  } catch (error) {
    console.error("Database connection error in middleware:", error);
    return res.status(500).json({ error: "Database connection error" });
  }
});

// Initialize database connection
connectToDatabase()
  .then(() => console.log("Database connection ready"))
  .catch(err => console.error("MongoDB connection error:", err));

// Connection error handling
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected, attempting to reconnect...');
  connectToDatabase();
});

// Health check endpoint
app.get("/health", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStateMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting"
  };
  
  res.json({
    status: "ok",
    dbState: dbStateMap[dbState] || "unknown",
    uptime: process.uptime(),
    timestamp: new Date()
  });
});

// Ruta de prueba
app.get("/", (req, res) => {
  res.json({ message: "Servidor funcionando correctamente 🚀" });
});

// Use routes
app.use(routes);

// MIDDLEWARE DE MANEJO DE ERRORES GLOBAL - MEJORADO
app.use((err, req, res, next) => {
  console.error("Error en el servidor:", err);
  
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

// Exportar para Vercel
module.exports = app;

// Iniciar servidor si no está en Vercel
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log("✅ Mejoras de manejo de errores aplicadas");
  });
}