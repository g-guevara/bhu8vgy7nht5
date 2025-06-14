const { User } = require('./models');

// Simple ID-based Authentication Middleware
const authenticateUser = async (req, res, next) => {
  console.log('=========== AUTENTICACIÓN ===========');
  console.log('Headers recibidos:', JSON.stringify(req.headers));
  
  // Intentar obtener el ID de usuario de diferentes formas posibles
  const userId = req.headers['user-id'] || req.headers['User-ID'] || req.headers['userid'] || req.headers['userID'];
  
  console.log('User-ID encontrado:', userId || 'NO ENCONTRADO');
  
  if (!userId) {
    console.log('Error: No se proporcionó User-ID');
    return res.status(401).json({ error: "Authentication required - Missing User-ID" });
  }

  try {
    // Buscar usuario en la base de datos
    console.log('Buscando usuario con ID:', userId);
    const user = await User.findOne({ userID: userId });
    
    // Si no se encuentra por userID, intentar con _id
    if (!user) {
      console.log('Usuario no encontrado por userID, intentando por _id');
      const userById = await User.findOne({ _id: userId });
      
      if (userById) {
        console.log('Usuario encontrado por _id');
        req.user = {
          userID: userById._id.toString(), // Convertir ObjectId a string si es necesario
          email: userById.email,
          name: userById.name
        };
        return next();
      }
      
      console.log('Error: Usuario no encontrado');
      return res.status(403).json({ error: "Invalid user ID" });
    }
    
    // Si llegamos aquí, el usuario se encontró correctamente
    console.log('Usuario autenticado correctamente:', user.name);
    
    // Adjuntar información del usuario a la solicitud
    req.user = {
      userID: user.userID,
      email: user.email,
      name: user.name
    };
    
    console.log('=========== FIN AUTENTICACIÓN ===========');
    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    return res.status(500).json({ 
      error: "Authentication error", 
      details: error.message 
    });
  }
};

module.exports = {
  authenticateUser
};