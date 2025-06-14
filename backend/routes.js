const express = require("express");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { authenticateUser } = require('./auth');
const {
  User,
  Article,
  History,
  ProductIngredient,
  ProductNote,
  Wishlist,
  Test,
  ProductReaction,
  IngredientReaction
} = require('./models');

const router = express.Router();

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
    const users = await User.find().select('-password'); // Excluir contraseñas
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// REGISTRO DE USUARIO - VERSIÓN MEJORADA
router.post("/users", async (req, res) => {
  try {
    const { name, email, password, language } = req.body;
    
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
    
    // Verificar si el usuario ya existe - MENSAJE ESPECÍFICO
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
    
    // Manejo específico de errores de MongoDB
    if (error.code === 11000) {
      return res.status(409).json({ 
        error: "EMAIL_ALREADY_EXISTS",
        message: "Este email ya está registrado. ¿Ya tienes una cuenta?"
      });
    }
    
    // Error genérico del servidor
    res.status(500).json({ 
      error: "INTERNAL_SERVER_ERROR",
      message: "Error interno del servidor. Por favor, intenta más tarde."
    });
  }
});

// LOGIN DE USUARIO - VERSIÓN MEJORADA
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validaciones de entrada
    if (!email || !password) {
      return res.status(400).json({ 
        error: "MISSING_CREDENTIALS",
        message: "Email y contraseña son requeridos"
      });
    }
    
    // Buscar usuario (case insensitive)
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ 
        error: "INVALID_CREDENTIALS",
        message: "Email o contraseña incorrectos"
      });
    }
    
    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ 
        error: "INVALID_CREDENTIALS",
        message: "Email o contraseña incorrectos"
      });
    }
    
    // Remover contraseña de la respuesta
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

// GOOGLE LOGIN - VERSIÓN MEJORADA
router.post("/google-login", async (req, res) => {
  try {
    const { email, name, googleId, idToken, accessToken } = req.body;
    
    if (!email || !name || !googleId) {
      return res.status(400).json({ 
        error: "MISSING_GOOGLE_DATA",
        message: "Datos de Google incompletos"
      });
    }
    
    // Verificar si el usuario ya existe
    let user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // Crear nuevo usuario con Google
      user = new User({
        userID: new mongoose.Types.ObjectId().toString(),
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: await bcrypt.hash(googleId + Date.now(), 10), // Contraseña temporal
        language: "es",
        googleId: googleId,
        authProvider: 'google'
      });
      await user.save();
    } else if (!user.googleId) {
      // Vincular cuenta existente con Google
      user.googleId = googleId;
      user.authProvider = 'google';
      await user.save();
    }
    
    // Remover contraseña de la respuesta
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

// Rutas de Artículos (protegidas)
router.get("/articles", authenticateUser, async (req, res) => {
  try {
    const articles = await Article.find();
    res.json(articles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/articles", authenticateUser, async (req, res) => {
  try {
    const article = new Article(req.body);
    await article.save();
    res.status(201).json(article);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rutas de Historia (protegidas)
router.get("/history", authenticateUser, async (req, res) => {
  try {
    const history = await History.find({ userID: req.user.userID });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/history", authenticateUser, async (req, res) => {
  try {
    const history = new History({
      ...req.body,
      userID: req.user.userID
    });
    await history.save();
    res.status(201).json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rutas de Ingredientes (protegidas)
router.get("/productingredients", authenticateUser, async (req, res) => {
  try {
    const ingredients = await ProductIngredient.find();
    res.json(ingredients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/productingredients", authenticateUser, async (req, res) => {
  try {
    const ingredient = new ProductIngredient(req.body);
    await ingredient.save();
    res.status(201).json(ingredient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rutas de Notas de Producto (protegidas)
router.get("/productnotes", authenticateUser, async (req, res) => {
  try {
    const notes = await ProductNote.find({ userID: req.user.userID });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/productnotes", authenticateUser, async (req, res) => {
  try {
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

// Update an existing product note
router.put("/productnotes/:id", authenticateUser, async (req, res) => {
  try {
    const noteId = req.params.id;
    const { note, rating } = req.body;
    
    // Find the note by ID and ensure it belongs to the authenticated user
    const existingNote = await ProductNote.findOne({ 
      _id: noteId,
      userID: req.user.userID 
    });
    
    if (!existingNote) {
      return res.status(404).json({ error: "Note not found or not authorized to update" });
    }
    
    // Update the note
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

// Rutas de Wishlist (protegidas)
router.get("/wishlist", authenticateUser, async (req, res) => {
  try {
    const wishlist = await Wishlist.find({ userID: req.user.userID });
    res.json(wishlist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/wishlist", authenticateUser, async (req, res) => {
  try {
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

// DELETE wishlist item endpoint
router.delete("/wishlist/:id", authenticateUser, async (req, res) => {
  try {
    const wishlistItemId = req.params.id;
    
    // Find the wishlist item
    const wishlistItem = await Wishlist.findOne({ 
      _id: wishlistItemId,
      userID: req.user.userID // Ensure the item belongs to the authenticated user
    });
    
    if (!wishlistItem) {
      return res.status(404).json({ error: "Wishlist item not found" });
    }
    
    // Delete the item
    await Wishlist.deleteOne({ _id: wishlistItemId });
    
    res.json({ 
      message: "Item removed from wishlist successfully",
      id: wishlistItemId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's active tests
router.get("/tests", authenticateUser, async (req, res) => {
  try {
    const tests = await Test.find({ userID: req.user.userID });
    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start a new test
router.post("/tests", authenticateUser, async (req, res) => {
  try {
    const { itemID } = req.body;
    
    if (!itemID) {
      return res.status(400).json({ error: "Product ID is required" });
    }
    
    // Check if there's already an active test for this product
    const existingTest = await Test.findOne({ 
      userID: req.user.userID,
      itemID,
      completed: false
    });
    
    if (existingTest) {
      return res.status(400).json({ error: "Test already in progress for this product" });
    }
    
    // Create a new test with 3-day duration
    const startDate = new Date();
    const finishDate = new Date(startDate);
    finishDate.setDate(finishDate.getDate() + 3); // 3-day test
    
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

// Complete a test
router.put("/tests/:id", authenticateUser, async (req, res) => {
  try {
    const testId = req.params.id;
    const { result } = req.body;
    
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

// Change password endpoint
router.post("/change-password", authenticateUser, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Find user
    const user = await User.findOne({ userID: req.user.userID });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    user.password = hashedPassword;
    await user.save();
    
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update trial period endpoint
router.post("/update-trial-period", authenticateUser, async (req, res) => {
  try {
    const { trialDays } = req.body;
    
    // Validate trial days
    if (typeof trialDays !== 'number' || trialDays < 0) {
      return res.status(400).json({ error: "Invalid trial days value" });
    }
    
    // Find user and update
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

// Get user profile endpoint
router.get("/profile", authenticateUser, async (req, res) => {
  try {
    const user = await User.findOne({ userID: req.user.userID }).select('-password');
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get product reactions
router.get("/product-reactions", authenticateUser, async (req, res) => {
  try {
    const reactions = await ProductReaction.find({ userID: req.user.userID });
    res.json(reactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save product reaction
router.post("/product-reactions", authenticateUser, async (req, res) => {
  try {
    const { productID, reaction } = req.body;
    
    // Check if reaction already exists for this product
    let existingReaction = await ProductReaction.findOne({
      userID: req.user.userID,
      productID
    });
    
    if (existingReaction) {
      // Update existing reaction
      existingReaction.reaction = reaction;
      await existingReaction.save();
      res.json(existingReaction);
    } else {
      // Create new reaction
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

// Delete product reaction
router.delete("/product-reactions/:productID", authenticateUser, async (req, res) => {
  try {
    const { productID } = req.params;
    
    await ProductReaction.deleteOne({
      userID: req.user.userID,
      productID
    });
    
    res.json({ message: "Reaction deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save ingredient reaction
router.post("/ingredient-reactions", authenticateUser, async (req, res) => {
  try {
    const { ingredientName, reaction } = req.body;
    
    // Check if reaction already exists for this ingredient
    let existingReaction = await IngredientReaction.findOne({
      userID: req.user.userID,
      ingredientName
    });
    
    if (existingReaction) {
      // Update existing reaction
      existingReaction.reaction = reaction;
      await existingReaction.save();
      res.json(existingReaction);
    } else {
      // Create new reaction
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

// Delete ingredient reaction
router.delete("/ingredient-reactions/:ingredientName", authenticateUser, async (req, res) => {
  try {
    const { ingredientName } = req.params;
    
    await IngredientReaction.deleteOne({
      userID: req.user.userID,
      ingredientName
    });
    
    res.json({ message: "Ingredient reaction deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get ingredient reactions
router.get("/ingredient-reactions", authenticateUser, async (req, res) => {
  console.log("[DEBUG] Received request for /ingredient-reactions");
  console.log("[DEBUG] User ID:", req.user.userID);
  
  try {
    // Find all ingredient reactions for this user
    const reactions = await IngredientReaction.find({ userID: req.user.userID });
    console.log("[DEBUG] Found ingredient reactions:", reactions.length);
    
    // Ensure we're sending JSON content type
    res.setHeader('Content-Type', 'application/json');
    res.json(reactions);
  } catch (error) {
    console.error("[ERROR] Failed to fetch ingredient reactions:", error);
    res.status(500).json({ error: error.message });
  }
});

// Verify user (ruta de utilidad)
router.get("/verify-token", authenticateUser, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// Diagnostic endpoint
router.get("/diagnostico", async (req, res) => {
  try {
    // Información del sistema
    const info = {
      serverTime: new Date().toISOString(),
      nodeVersion: process.version,
      mongoConnection: mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado'
    };
    
    // Contar documentos en colecciones principales
    const usuarios = await User.countDocuments();
    const tests = await Test.countDocuments();
    const wishlists = await Wishlist.countDocuments();
    
    // Información adicional
    const ultimosUsuarios = await User.find().sort({ createdAt: -1 }).limit(3).select('-password');
    
    // Devolver resultado
    res.json({
      info,
      contadores: {
        usuarios,
        tests,
        wishlists
      },
      ultimosUsuarios
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;