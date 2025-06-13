// backend/routes.js - Actualizado con endpoints de productos y múltiples DBs
const express = require("express");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { authenticateUser } = require('./auth');
const { getModel } = require('./models');

const router = express.Router();

// =================== RUTAS DE PRODUCTOS (DB PRODUCTOS) ===================

// Endpoint para listar colecciones en la base de datos de productos
router.get("/products/list-collections", async (req, res) => {
  console.log("📋 Listando colecciones en base de datos de productos...");
  
  try {
    const { getProductsConnection } = require('./mongoConnections');
    const connection = getProductsConnection();
    
    if (!connection || connection.readyState !== 1) {
      return res.status(503).json({
        error: "Products database not connected",
        message: "No hay conexión activa a la base de datos de productos"
      });
    }
    
    // Listar colecciones
    console.log("🔍 Obteniendo lista de colecciones...");
    const collections = await connection.db.listCollections().toArray();
    console.log(`📚 Colecciones encontradas: ${collections.length}`);
    
    const collectionNames = collections.map(col => ({
      name: col.name,
      type: col.type
    }));
    
    console.log("📋 Nombres de colecciones:", collectionNames.map(c => c.name));
    
    res.json({
      status: "✅ Colecciones listadas",
      database: connection.db.databaseName,
      collections: collectionNames,
      totalCollections: collections.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("❌ Error listando colecciones:", error);
    res.status(500).json({
      error: "Failed to list collections",
      message: error.message,
      type: error.constructor.name
    });
  }
});

// Endpoint de prueba para verificar conexión a productos
router.get("/products/test-connection", async (req, res) => {
  console.log("🧪 Probando conexión a base de datos de productos...");
  
  try {
    const { getConnectionStatus } = require('./mongoConnections');
    const status = getConnectionStatus();
    
    console.log("📊 Estado de conexiones:", status);
    
    if (status.products.status !== 'connected') {
      return res.status(503).json({
        error: "Products database not connected",
        status: status.products,
        message: `Base de datos de productos en estado: ${status.products.status}`
      });
    }
    
    // Intentar obtener el modelo
    console.log("🔄 Obteniendo modelo Product...");
    const Product = await getModel('Product');
    console.log("✅ Modelo Product obtenido");
    
    // Intentar contar documentos
    console.log("📊 Contando productos...");
    const count = await Product.countDocuments();
    console.log(`📦 Total de productos: ${count}`);
    
    // Intentar obtener un producto de muestra
    console.log("🔍 Obteniendo producto de muestra...");
    const sampleProduct = await Product.findOne().lean();
    console.log("✅ Producto de muestra obtenido");
    
    res.json({
      status: "✅ Conexión exitosa",
      database: status.products,
      totalProducts: count,
      sampleProduct: sampleProduct ? {
        code: sampleProduct.code,
        product_name: sampleProduct.product_name,
        brands: sampleProduct.brands
      } : null,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("❌ Error en test de conexión:", error);
    res.status(500).json({
      error: "Connection test failed",
      message: error.message,
      type: error.constructor.name,
      timestamp: new Date().toISOString()
    });
  }
});

// Buscar productos - Endpoint principal para el SearchComponent
router.get("/products/search", async (req, res) => {
  console.log("🔍 Iniciando búsqueda de productos");
  console.log("📝 Query params:", req.query);
  
  try {
    const { q, page = 1, limit = 15 } = req.query;
    
    console.log("🔄 Obteniendo modelo Product...");
    const Product = await getModel('Product');
    console.log("✅ Modelo Product obtenido");
    
    let query = {};
    
    // Si hay término de búsqueda, usar texto completo
    if (q && q.trim()) {
      console.log(`🔎 Búsqueda con término: "${q}"`);
      query = {
        $text: { 
          $search: q.trim(),
          $caseSensitive: false
        }
      };
    } else {
      console.log("📋 Búsqueda sin término (todos los productos)");
    }
    
    // Calcular skip para paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);
    console.log(`📄 Paginación: página ${page}, límite ${limit}, skip ${skip}`);
    
    // Ejecutar búsqueda con paginación
    console.log("🔍 Ejecutando consulta a MongoDB...");
    const [products, total] = await Promise.all([
      Product.find(query)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(), // Usar lean() para mejor performance
      Product.countDocuments(query)
    ]);
    
    console.log(`📊 Resultados: ${products.length} productos encontrados de ${total} total`);
    
    // Normalizar los datos (convertir code a string si es necesario)
    const normalizedProducts = products.map(product => ({
      code: product.code.toString(),
      product_name: product.product_name || '',
      brands: product.brands || '',
      ingredients_text: product.ingredients_text || ''
    }));
    
    console.log("✅ Búsqueda completada exitosamente");
    
    res.json({
      products: normalizedProducts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Error searching products:', error);
    console.error('📋 Stack trace:', error.stack);
    res.status(500).json({ 
      error: error.message,
      type: error.constructor.name,
      details: "Error al buscar productos en la base de datos"
    });
  }
});

// Obtener producto por código
router.get("/products/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const Product = await getModel('Product');
    
    // Buscar por code (puede ser string o number)
    const product = await Product.findOne({
      $or: [
        { code: code },
        { code: parseInt(code) }
      ]
    }).lean();
    
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    
    // Normalizar los datos
    const normalizedProduct = {
      code: product.code.toString(),
      product_name: product.product_name || '',
      brands: product.brands || '',
      ingredients_text: product.ingredients_text || ''
    };
    
    res.json(normalizedProduct);
  } catch (error) {
    console.error('Error getting product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener productos por categoría/marca (para CategoryListScreen)
router.get("/products/category/:brand", async (req, res) => {
  try {
    const { brand } = req.params;
    const { organic = false } = req.query;
    const Product = await getModel('Product');
    
    let query = {
      brands: new RegExp(brand, 'i') // Case insensitive
    };
    
    // Si se solicitan productos orgánicos, filtrar por código que empiece con "SSS"
    if (organic === 'true') {
      query.code = /^SSS/;
    }
    
    const products = await Product.find(query)
      .limit(100) // Limitar resultados
      .lean();
    
    // Normalizar los datos
    const normalizedProducts = products.map(product => ({
      code: product.code.toString(),
      product_name: product.product_name || '',
      brands: product.brands || '',
      ingredients_text: product.ingredients_text || ''
    }));
    
    res.json(normalizedProducts);
  } catch (error) {
    console.error('Error getting products by category:', error);
    res.status(500).json({ error: error.message });
  }
});

// Estadísticas de productos
router.get("/products/stats", async (req, res) => {
  try {
    const Product = await getModel('Product');
    
    const [total, organic, withIngredients] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ code: /^SSS/ }),
      Product.countDocuments({ ingredients_text: { $exists: true, $ne: '' } })
    ]);
    
    res.json({
      total,
      organic,
      withIngredients,
      regular: total - organic
    });
  } catch (error) {
    console.error('Error getting product stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// =================== RUTAS EXISTENTES ACTUALIZADAS ===================

// Ruta de prueba para POST
router.post("/test", (req, res) => {
  console.log("Recibido POST en /test:", req.body);
  res.json({ 
    message: "POST recibido correctamente",
    body: req.body 
  });
});

// Rutas de Usuarios
router.get("/users", authenticateUser, async (req, res) => {
  try {
    const User = await getModel('User');
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// REGISTRO DE USUARIO - VERSIÓN MEJORADA
router.post("/users", async (req, res) => {
  try {
    const { name, email, password, language } = req.body;
    const User = await getModel('User');
    
    // Validaciones de entrada
    if (!name || !email || !password) {
      return res.status(400).json({ 
        error: "MISSING_REQUIRED_FIELDS",
        message: "Todos los campos son requeridos"
      });
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: "INVALID_EMAIL_FORMAT",
        message: "El formato del email no es válido"
      });
    }
    
    // Validar longitud de contraseña
    if (password.length < 8) {
      return res.status(400).json({ 
        error: "PASSWORD_TOO_SHORT",
        message: "La contraseña debe tener al menos 8 caracteres"
      });
    }
    
    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ 
        error: "EMAIL_ALREADY_EXISTS",
        message: "Este email ya está registrado. ¿Ya tienes una cuenta?"
      });
    }
    
    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Crear usuario
    const user = new User({
      userID: new mongoose.Types.ObjectId().toString(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      language: language || "es"
    });
    
    await user.save();
    
    // Remover contraseña de la respuesta
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.status(201).json({
      message: "Usuario registrado exitosamente",
      user: userResponse
    });
  } catch (error) {
    console.error("Error en registro:", error);
    
    if (error.code === 11000) {
      return res.status(409).json({ 
        error: "EMAIL_ALREADY_EXISTS",
        message: "Este email ya está registrado. ¿Ya tienes una cuenta?"
      });
    }
    
    res.status(500).json({ 
      error: "INTERNAL_SERVER_ERROR",
      message: "Error interno del servidor. Por favor, intenta más tarde."
    });
  }
});

// LOGIN DE USUARIO
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const User = await getModel('User');
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: "MISSING_CREDENTIALS",
        message: "Email y contraseña son requeridos"
      });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ 
        error: "INVALID_CREDENTIALS",
        message: "Email o contraseña incorrectos"
      });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ 
        error: "INVALID_CREDENTIALS",
        message: "Email o contraseña incorrectos"
      });
    }
    
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json({ 
      message: "Login exitoso",
      user: userResponse
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ 
      error: "INTERNAL_SERVER_ERROR",
      message: "Error interno del servidor. Por favor, intenta más tarde."
    });
  }
});

// GOOGLE LOGIN
router.post("/google-login", async (req, res) => {
  try {
    const { email, name, googleId } = req.body;
    const User = await getModel('User');
    
    if (!email || !name || !googleId) {
      return res.status(400).json({ 
        error: "MISSING_GOOGLE_DATA",
        message: "Datos de Google incompletos"
      });
    }
    
    let user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      user = new User({
        userID: new mongoose.Types.ObjectId().toString(),
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: await bcrypt.hash(googleId + Date.now(), 10),
        language: "es",
        googleId: googleId,
        authProvider: 'google'
      });
      await user.save();
    } else if (!user.googleId) {
      user.googleId = googleId;
      user.authProvider = 'google';
      await user.save();
    }
    
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json({ 
      message: "Login con Google exitoso",
      user: userResponse
    });
  } catch (error) {
    console.error("Error en Google login:", error);
    res.status(500).json({ 
      error: "GOOGLE_LOGIN_ERROR",
      message: "Error al iniciar sesión con Google. Intenta más tarde."
    });
  }
});

// =================== RESTO DE RUTAS ACTUALIZADAS ===================

// Rutas de Wishlist
router.get("/wishlist", authenticateUser, async (req, res) => {
  try {
    const Wishlist = await getModel('Wishlist');
    const wishlist = await Wishlist.find({ userID: req.user.userID });
    res.json(wishlist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/wishlist", authenticateUser, async (req, res) => {
  try {
    const Wishlist = await getModel('Wishlist');
    const item = new Wishlist({
      ...req.body,
      userID: req.user.userID
    });
    await item.save();
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/wishlist/:id", authenticateUser, async (req, res) => {
  try {
    const Wishlist = await getModel('Wishlist');
    const wishlistItemId = req.params.id;
    
    const wishlistItem = await Wishlist.findOne({ 
      _id: wishlistItemId,
      userID: req.user.userID
    });
    
    if (!wishlistItem) {
      return res.status(404).json({ error: "Wishlist item not found" });
    }
    
    await Wishlist.deleteOne({ _id: wishlistItemId });
    
    res.json({ 
      message: "Item removed from wishlist successfully",
      id: wishlistItemId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rutas de Tests
router.get("/tests", authenticateUser, async (req, res) => {
  try {
    const Test = await getModel('Test');
    const tests = await Test.find({ userID: req.user.userID });
    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/tests", authenticateUser, async (req, res) => {
  try {
    const { itemID } = req.body;
    const Test = await getModel('Test');
    
    if (!itemID) {
      return res.status(400).json({ error: "Product ID is required" });
    }
    
    const existingTest = await Test.findOne({ 
      userID: req.user.userID,
      itemID,
      completed: false
    });
    
    if (existingTest) {
      return res.status(400).json({ error: "Test already in progress for this product" });
    }
    
    const startDate = new Date();
    const finishDate = new Date(startDate);
    finishDate.setDate(finishDate.getDate() + 3);
    
    const test = new Test({
      userID: req.user.userID,
      itemID,
      startDate,
      finishDate,
      completed: false
    });
    
    await test.save();
    res.status(201).json(test);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/tests/:id", authenticateUser, async (req, res) => {
  try {
    const testId = req.params.id;
    const { result } = req.body;
    const Test = await getModel('Test');
    
    const test = await Test.findOne({ 
      _id: testId,
      userID: req.user.userID
    });
    
    if (!test) {
      return res.status(404).json({ error: "Test not found" });
    }
    
    test.completed = true;
    if (result) {
      test.result = result;
    }
    
    await test.save();
    res.json(test);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rutas de Product Notes
router.get("/productnotes", authenticateUser, async (req, res) => {
  try {
    const ProductNote = await getModel('ProductNote');
    const notes = await ProductNote.find({ userID: req.user.userID });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/productnotes", authenticateUser, async (req, res) => {
  try {
    const ProductNote = await getModel('ProductNote');
    const note = new ProductNote({
      ...req.body,
      userID: req.user.userID
    });
    await note.save();
    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/productnotes/:id", authenticateUser, async (req, res) => {
  try {
    const noteId = req.params.id;
    const { note, rating } = req.body;
    const ProductNote = await getModel('ProductNote');
    
    const existingNote = await ProductNote.findOne({ 
      _id: noteId,
      userID: req.user.userID 
    });
    
    if (!existingNote) {
      return res.status(404).json({ error: "Note not found or not authorized to update" });
    }
    
    existingNote.note = note;
    if (rating !== undefined) {
      existingNote.rating = rating;
    }
    
    await existingNote.save();
    res.json(existingNote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rutas de Product Reactions
router.get("/product-reactions", authenticateUser, async (req, res) => {
  try {
    const ProductReaction = await getModel('ProductReaction');
    const reactions = await ProductReaction.find({ userID: req.user.userID });
    res.json(reactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/product-reactions", authenticateUser, async (req, res) => {
  try {
    const { productID, reaction } = req.body;
    const ProductReaction = await getModel('ProductReaction');
    
    let existingReaction = await ProductReaction.findOne({
      userID: req.user.userID,
      productID
    });
    
    if (existingReaction) {
      existingReaction.reaction = reaction;
      await existingReaction.save();
      res.json(existingReaction);
    } else {
      const newReaction = new ProductReaction({
        userID: req.user.userID,
        productID,
        reaction
      });
      
      await newReaction.save();
      res.status(201).json(newReaction);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/product-reactions/:productID", authenticateUser, async (req, res) => {
  try {
    const { productID } = req.params;
    const ProductReaction = await getModel('ProductReaction');
    
    await ProductReaction.deleteOne({
      userID: req.user.userID,
      productID
    });
    
    res.json({ message: "Reaction deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rutas de Ingredient Reactions
router.get("/ingredient-reactions", authenticateUser, async (req, res) => {
  console.log("[DEBUG] Received request for /ingredient-reactions");
  console.log("[DEBUG] User ID:", req.user.userID);
  
  try {
    const IngredientReaction = await getModel('IngredientReaction');
    const reactions = await IngredientReaction.find({ userID: req.user.userID });
    console.log("[DEBUG] Found ingredient reactions:", reactions.length);
    
    res.setHeader('Content-Type', 'application/json');
    res.json(reactions);
  } catch (error) {
    console.error("[ERROR] Failed to fetch ingredient reactions:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/ingredient-reactions", authenticateUser, async (req, res) => {
  try {
    const { ingredientName, reaction } = req.body;
    const IngredientReaction = await getModel('IngredientReaction');
    
    let existingReaction = await IngredientReaction.findOne({
      userID: req.user.userID,
      ingredientName
    });
    
    if (existingReaction) {
      existingReaction.reaction = reaction;
      await existingReaction.save();
      res.json(existingReaction);
    } else {
      const newReaction = new IngredientReaction({
        userID: req.user.userID,
        ingredientName,
        reaction
      });
      
      await newReaction.save();
      res.status(201).json(newReaction);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/ingredient-reactions/:ingredientName", authenticateUser, async (req, res) => {
  try {
    const { ingredientName } = req.params;
    const IngredientReaction = await getModel('IngredientReaction');
    
    await IngredientReaction.deleteOne({
      userID: req.user.userID,
      ingredientName
    });
    
    res.json({ message: "Ingredient reaction deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Otras rutas...
router.get("/verify-token", authenticateUser, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// Diagnóstico mejorado
router.get("/diagnostico", async (req, res) => {
  try {
    const info = {
      serverTime: new Date().toISOString(),
      nodeVersion: process.version
    };
    
    const User = await getModel('User');
    const Test = await getModel('Test');
    const Wishlist = await getModel('Wishlist');
    const Product = await getModel('Product');
    
    const [usuarios, tests, wishlists, productos] = await Promise.all([
      User.countDocuments(),
      Test.countDocuments(),
      Wishlist.countDocuments(),
      Product.countDocuments()
    ]);
    
    const ultimosUsuarios = await User.find().sort({ createdAt: -1 }).limit(3).select('-password');
    
    res.json({
      info,
      contadores: {
        usuarios,
        tests,
        wishlists,
        productos
      },
      ultimosUsuarios
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;