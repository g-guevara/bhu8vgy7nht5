// create_indexes_simple.js - VERSIÓN SÚPER SIMPLIFICADA
require("dotenv").config();
const mongoose = require("mongoose");

const PRODUCTS_URI = "mongodb+srv://frituMA3wuxUBrLXl1re:11lBr2phenuwrebopher@cluster0.sz3esol.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function createSimpleIndexes() {
  let connection;
  
  try {
    console.log("🔄 Conectando a la base de datos de productos...");
    connection = await mongoose.createConnection(PRODUCTS_URI, {
      dbName: "mi_database"
    });
    
    const collection = connection.collection('opff1');
    
    console.log("🗑️ Eliminando índices antiguos...");
    
    // Obtener índices existentes
    const existingIndexes = await collection.getIndexes();
    console.log("📋 Índices existentes:", Object.keys(existingIndexes));
    
    // Eliminar índices problemáticos (excepto _id)
    for (const indexName of Object.keys(existingIndexes)) {
      if (indexName !== '_id_') {
        try {
          await collection.dropIndex(indexName);
          console.log(`🗑️ Eliminado: ${indexName}`);
        } catch (error) {
          console.log(`⚠️ No se pudo eliminar ${indexName}`);
        }
      }
    }
    
    console.log("🔨 Creando índices optimizados (sin verificar duplicados)...");
    
    // 1. Índice para code (NO único)
    try {
      await collection.createIndex(
        { code: 1 },
        { 
          name: 'code_idx',
          background: true
        }
      );
      console.log("✅ Índice para 'code' creado");
    } catch (error) {
      console.log("⚠️ Error creando índice de code:", error.message);
    }
    
    // 2. Índice compound para búsquedas
    try {
      await collection.createIndex(
        { 
          product_name: 1, 
          brands: 1 
        },
        { 
          name: 'product_search_compound_idx',
          background: true
        }
      );
      console.log("✅ Índice compound para búsquedas creado");
    } catch (error) {
      console.log("⚠️ Error creando índice compound:", error.message);
    }
    
    // 3. Índice para brands
    try {
      await collection.createIndex(
        { brands: 1 },
        { 
          name: 'brands_idx',
          background: true
        }
      );
      console.log("✅ Índice para brands creado");
    } catch (error) {
      console.log("⚠️ Error creando índice de brands:", error.message);
    }
    
    // 4. Índice para product_name
    try {
      await collection.createIndex(
        { product_name: 1 },
        { 
          name: 'product_name_idx',
          background: true
        }
      );
      console.log("✅ Índice para product_name creado");
    } catch (error) {
      console.log("⚠️ Error creando índice de product_name:", error.message);
    }
    
    console.log("⏳ Esperando que los índices se construyan...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verificar índices finales
    const finalIndexes = await collection.getIndexes();
    console.log("🎉 Índices finales:");
    Object.keys(finalIndexes).forEach(name => {
      console.log(`  ✓ ${name}`);
    });
    
    // Estadísticas básicas
    try {
      const totalDocs = await collection.countDocuments();
      console.log(`📊 Total de productos: ${totalDocs.toLocaleString()}`);
    } catch (error) {
      console.log("⚠️ No se pudieron obtener estadísticas");
    }
    
    console.log("✅ ¡Proceso completado! Los índices están listos para acelerar las búsquedas.");
    
  } catch (error) {
    console.error("❌ Error en el proceso:", error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.close();
      console.log("🔌 Conexión cerrada");
    }
  }
}

// Función para verificar qué índices tienes
async function checkIndexes() {
  let connection;
  
  try {
    console.log("🔍 Verificando índices existentes...");
    connection = await mongoose.createConnection(PRODUCTS_URI, {
      dbName: "mi_database"
    });
    
    const collection = connection.collection('opff1');
    const indexes = await collection.getIndexes();
    
    console.log("📋 Índices actuales:");
    Object.keys(indexes).forEach(name => {
      const index = indexes[name];
      console.log(`  - ${name}: ${JSON.stringify(index.key)}`);
    });
    
  } catch (error) {
    console.error("❌ Error verificando índices:", error.message);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

// Ejecutar según parámetros
const args = process.argv.slice(2);

if (args.includes('--check')) {
  // Solo verificar índices existentes
  checkIndexes()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  // Crear índices
  createSimpleIndexes()
    .then(() => {
      console.log("🎉 ¡Índices creados exitosamente!");
      console.log("💡 Ejecuta 'node create_indexes_simple.js --check' para verificar");
      process.exit(0);
    })
    .catch(error => {
      console.error("💥 Error fatal:", error.message);
      process.exit(1);
    });
}