// backend/routes.js - VERSIÓN COMPLETA OPTIMIZADA SIN CREACIÓN DE ÍNDICES
const express = require("express");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { authenticateUser } = require('./auth');
const { getModel } = require('./models');

const router = express.Router();

// =================== BÚSQUEDA OPTIMIZADA DE PRODUCTOS ===================

/**
 * Búsqueda optimizada usando los índices pre-creados
 * Ya NO crea/verifica índices en runtime
 */
async function optimizedProductSearch(Product, searchTerm, page, limit) {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  // Crear consulta optimizada usando los índices compound
  const searchQuery = {
    $or: [
      { 
        product_name: { 
          $regex: searchTerm, 
          $options: 'i' 
        } 
      },
      { 
        brands: { 
          $regex: searchTerm, 
          $options: 'i' 
        } 
      }
    ]
  };
  
  console.log(`🔍 Búsqueda: "${searchTerm}" (página ${page})`);
  const startTime = Date.now();
  
  try {
    // Usar Promise.all para paralelizar count y find
    const [products, total] = await Promise.all([
      Product
        .find(searchQuery)
        .skip(skip)
        .limit(parseInt(limit))
        .lean() // Más rápido que objetos Mongoose completos
        .exec(),
      Product.countDocuments(searchQuery).exec()
    ]);
    
    const endTime = Date.now();
    console.log(`⚡ Búsqueda completada en ${endTime - startTime}ms (${total} resultados)`);
    
    return { products, total };
  } catch (error) {
    console.error(`❌ Error en búsqueda optimizada:`, error);
    throw error;
  }
}

/**
 * Búsqueda para productos recientes (sin término de búsqueda)
 */
async function getRecentProducts(Product, page, limit) {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  console.log(`📄 Obteniendo productos recientes (página ${page})`);
  const startTime = Date.now();
  
  try {
    // Usar solo los campos necesarios para mejor rendimiento
    const [products, total] = await Promise.all([
      Product
        .find({})
        .skip(skip)
        .limit(parseInt(limit))
        .lean()
        .exec(),
      Product.estimatedDocumentCount() // Más rápido que countDocuments para totales
    ]);
    
    const endTime = Date.now();
    console.log(`⚡ Productos recientes obtenidos en ${endTime - startTime}ms`);
    
    return { products, total };
  } catch (error) {
    console.error(`❌ Error obteniendo productos recientes:`, error);
    throw error;
  }
}

// =================== RUTAS DE PRODUCTOS OPTIMIZADAS ===================

// Buscar productos - VERSIÓN SÚPER OPTIMIZADA
router.get("/products/search", async (req, res) => {
  try {
    const { q, page = 1, limit = 15 } = req.query;
    const Product = await getModel('Product');
    
    let products = [];
    let total = 0;
    let searchMethod = 'empty';
    
    // Validar parámetros
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit))); // Máximo 50 por página
    
    if (!q || !q.trim()) {
      // Sin término de búsqueda: productos recientes
      const result = await getRecentProducts(Product, pageNum, limitNum);
      products = result.products;
      total = result.total;
      searchMethod = 'recent';
    } else {
      // Con término de búsqueda: usar búsqueda optimizada
      const searchTerm = q.trim();
      const result = await optimizedProductSearch(Product, searchTerm, pageNum, limitNum);
      products = result.products;
      total = result.total;
      searchMethod = 'optimized_search';
    }
    
    // Normalizar datos de manera eficiente
    const normalizedProducts = products.map(product => ({
      code: String(product.code), // Más rápido que toString()
      product_name: product.product_name || '',
      brands: product.brands || '',
      ingredients_text: product.ingredients_text || ''
    }));
    
    res.json({
      products: normalizedProducts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      meta: {
        searchMethod,
        query: q || null,
        resultsCount: normalizedProducts.length,
        cached: false // Para futuras optimizaciones de cache
      }
    });
    
  } catch (error) {
    console.error('💥 Error en búsqueda de productos:', error);
    res.status(500).json({ 
      error: "Error en la búsqueda de productos",
      code: "SEARCH_ERROR",
      message: "La búsqueda falló. Por favor, intenta con términos diferentes."
    });
  }
});

// Obtener producto por código - OPTIMIZADO
router.get("/products/:code", async (req, res) => {
  try {
    const { code } = req.params;
    
    if (!code || code.trim() === '') {
      return res.status(400).json({ 
        error: "Código de producto requerido",
        code: "MISSING_CODE"
      });
    }
    
    const Product = await getModel('Product');
    
    console.log(`🔍 Buscando producto: ${code}`);
    const startTime = Date.now();
    
    // Usar el índice único de code
    const product = await Product
      .findOne({ code: code })
      .lean()
      .exec();
    
    const endTime = Date.now();
    console.log(`⚡ Búsqueda por código completada en ${endTime - startTime}ms`);
    
    if (!product) {
      return res.status(404).json({ 
        error: "Producto no encontrado",
        code: "PRODUCT_NOT_FOUND"
      });
    }
    
    // Normalizar producto
    const normalizedProduct = {
      code: String(product.code),
      product_name: product.product_name || '',
      brands: product.brands || '',
      ingredients_text: product.ingredients_text || ''
    };
    
    res.json(normalizedProduct);
    
  } catch (error) {
    console.error('❌ Error obteniendo producto por código:', error);
    res.status(500).json({ 
      error: "Error obteniendo el producto",
      code: "GET_PRODUCT_ERROR"
    });
  }
});

// Productos por categoría - OPTIMIZADO
router.get("/products/category/:brand", async (req, res) => {
  try {
    const { brand } = req.params;
    const { organic = false } = req.query;
    
    if (!brand || brand.trim() === '') {
      return res.status(400).json({ 
        error: "Marca/categoría requerida",
        code: "MISSING_BRAND"
      });
    }
    
    const Product = await getModel('Product');
    
    console.log(`🏷️ Buscando productos de marca: ${brand} (organic: ${organic})`);
    const startTime = Date.now();
    
    // Construir query optimizada
    let query = {
      brands: new RegExp(brand, 'i')
    };
    
    // Si se solicitan orgánicos, usar el índice partial
    if (organic === 'true') {
      query.code = /^SSS/;
    }
    
    const products = await Product
      .find(query)
      .limit(100) // Límite razonable
      .lean()
      .exec();
    
    const endTime = Date.now();
    console.log(`⚡ Productos por categoría obtenidos en ${endTime - startTime}ms (${products.length} resultados)`);
    
    // Normalizar productos
    const normalizedProducts = products.map(product => ({
      code: String(product.code),
      product_name: product.product_name || '',
      brands: product.brands || '',
      ingredients_text: product.ingredients_text || ''
    }));
    
    res.json(normalizedProducts);
    
  } catch (error) {
    console.error('❌ Error obteniendo productos por categoría:', error);
    res.status(500).json({ 
      error: "Error obteniendo productos por categoría",
      code: "CATEGORY_ERROR"
    });
  }
});

// Estadísticas - OPTIMIZADO
router.get("/products/stats", async (req, res) => {
  try {
    const Product = await getModel('Product');
    
    console.log("📊 Obteniendo estadísticas de productos...");
    const startTime = Date.now();
    
    // Usar estimatedDocumentCount para el total (más rápido)
    const [total, organic, withIngredients] = await Promise.all([
      Product.estimatedDocumentCount(),
      Product.countDocuments({ code: /^SSS/ }),
      Product.countDocuments({ 
        ingredients_text: { $exists: true, $ne: '' } 
      })
    ]);
    
    const endTime = Date.now();
    console.log(`⚡ Estadísticas obtenidas en ${endTime - startTime}ms`);
    
    res.json({
      total,
      organic,
      withIngredients,
      regular: total - organic,
      generated_at: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({ 
      error: "Error obteniendo estadísticas",
      code: "STATS_ERROR"
    });
  }
});

// Endpoint para verificar índices (solo para debugging)
router.get("/products/index-info", async (req, res) => {
  try {
    const Product = await getModel('Product');
    const indexes = await Product.collection.getIndexes();
    
    const indexInfo = {
      totalIndexes: Object.keys(indexes).length,
      indexes: Object.keys(indexes).map(name => ({
        name,
        key: indexes[name].key,
        unique: indexes[name].unique || false
      }))
    };
    
    res.json(indexInfo);
  } catch (error) {
    console.error('❌ Error obteniendo información de índices:', error);
    res.status(500).json({ 
      error: "Error obteniendo información de índices",
      message: error.message 
    });
  }
});

// =================== RUTAS EXISTENTES (COMPLETAS) ===================

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

// =================== RUTAS DE WISHLIST ===================

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

// =================== RUTAS DE TESTS ===================

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

// =================== RUTAS DE PRODUCT NOTES ===================

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

// =================== RUTAS DE PRODUCT REACTIONS ===================

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

// =================== RUTAS DE INGREDIENT REACTIONS ===================

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

// =================== RUTAS DE UTILIDAD ===================

// Rutas de Articles
router.get("/articles", async (req, res) => {
  try {
    const Article = await getModel('Article');
    const articles = await Article.find();
    res.json(articles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rutas de History
router.get("/history", authenticateUser, async (req, res) => {
  try {
    const History = await getModel('History');
    const history = await History.find({ userID: req.user.userID });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verificación de token
router.get("/verify-token", authenticateUser, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// Perfil de usuario
router.get("/profile", authenticateUser, async (req, res) => {
  try {
    const User = await getModel('User');
    const user = await User.findOne({ userID: req.user.userID }).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cambiar contraseña
router.post("/change-password", authenticateUser, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const User = await getModel('User');
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: "Current password and new password are required" 
      });
    }
    
    const user = await User.findOne({ userID: req.user.userID });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ 
        error: "New password must be at least 8 characters long" 
      });
    }
    
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();
    
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar período de prueba
router.post("/update-trial-period", authenticateUser, async (req, res) => {
  try {
    const { trialDays } = req.body;
    const User = await getModel('User');
    
    if (typeof trialDays !== 'number' || trialDays < 0) {
      return res.status(400).json({ 
        error: "Trial days must be a positive number" 
      });
    }
    
    const user = await User.findOne({ userID: req.user.userID });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    user.trialPeriodDays = trialDays;
    await user.save();
    
    res.json({ 
      message: "Trial period updated successfully",
      trialPeriodDays: trialDays
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =================== DIAGNÓSTICO Y DEBUG ===================

// Diagnóstico mejorado
router.get("/diagnostico", async (req, res) => {
  try {
    const info = {
      serverTime: new Date().toISOString(),
      nodeVersion: process.version
    };
    
    let counts = {};
    let productIndexInfo = {};
    let error = null;
    
    try {
      // Contar documentos en DB principal
      const User = await getModel('User');
      const Test = await getModel('Test');
      const Wishlist = await getModel('Wishlist');
      const ProductReaction = await getModel('ProductReaction');
      const IngredientReaction = await getModel('IngredientReaction');
      
      counts.usuarios = await User.countDocuments();
      counts.tests = await Test.countDocuments();
      counts.wishlists = await Wishlist.countDocuments();
      counts.productReactions = await ProductReaction.countDocuments();
      counts.ingredientReactions = await IngredientReaction.countDocuments();
      
      // Contar productos y obtener info de índices
      const Product = await getModel('Product');
      counts.productos = await Product.countDocuments();
      
      // Información de índices de productos
      try {
        const indexes = await Product.collection.getIndexes();
        productIndexInfo = {
          totalIndexes: Object.keys(indexes).length,
          indexNames: Object.keys(indexes),
          optimized: Object.keys(indexes).includes('product_search_compound_idx'),
          details: Object.keys(indexes).reduce((acc, name) => {
            acc[name] = {
              key: indexes[name].key,
              unique: indexes[name].unique || false
            };
            return acc;
          }, {})
        };
      } catch (indexError) {
        productIndexInfo = { error: indexError.message };
      }
      
    } catch (countError) {
      error = countError.message;
      console.error("Error contando documentos:", countError);
    }
    
    // Últimos usuarios (sin contraseñas)
    let ultimosUsuarios = [];
    try {
      const User = await getModel('User');
      ultimosUsuarios = await User.find()
        .sort({ createdAt: -1 })
        .limit(3)
        .select('-password')
        .lean();
    } catch (userError) {
      console.error("Error obteniendo últimos usuarios:", userError);
    }
    
    res.json({
      info,
      contadores: counts,
      productIndexes: productIndexInfo,
      ultimosUsuarios,
      error: error
    });
  } catch (error) {
    res.status(500).json({ 
      error: "Error en diagnóstico",
      message: error.message 
    });
  }
});

module.exports = router;