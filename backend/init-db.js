const { testConnection, createTables } = require('./config/database');

async function initializeDatabase() {
  console.log('🚀 Inicializando base de datos RayosStrength...');
  
  // 1. Probar conexión
  const connected = await testConnection();
  if (!connected) {
    console.log('❌ No se puede continuar sin conexión a la BD');
    return;
  }
  
  // 2. Crear tablas
  await createTables();
  console.log('🎉 Base de datos RayosStrength inicializada correctamente');
}

initializeDatabase();