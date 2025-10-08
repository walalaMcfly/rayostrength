const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
  console.log('🔍 Probando conexión a MySQL...');
  console.log('Host:', process.env.DB_HOST);
  console.log('User:', process.env.DB_USER);
  console.log('Database:', process.env.DB_NAME);
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'fitness_app',
      port: process.env.DB_PORT || 3306
    });

    console.log('✅ CONEXIÓN EXITOSA a MySQL!');
    
    // Consulta de prueba
    const [rows] = await connection.execute('SELECT 1 + 1 as result');
    console.log('✅ Consulta de prueba:', rows[0].result);
    
    await connection.end();
    return true;
    
  } catch (error) {
    console.log('❌ ERROR de conexión:');
    console.log('Código:', error.code);
    console.log('Mensaje:', error.message);
    
    // Sugerencias basadas en el error
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('🔑 Revisa el usuario y password de MySQL en el archivo .env');
      console.log('💡 Password actual en .env:', process.env.DB_PASSWORD ? '***' : 'NO CONFIGURADO');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('🗄️ La base de datos no existe. Créala con:');
      console.log('   CREATE DATABASE fitness_app;');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('🖥️ MySQL no está corriendo. Inicia el servicio MySQL');
      console.log('   Windows: net start mysql');
      console.log('   macOS: brew services start mysql');
      console.log('   Linux: sudo systemctl start mysql');
    } else if (error.code === 'ENOTFOUND') {
      console.log('🌐 No se puede encontrar el host. Revisa DB_HOST en .env');
    }
    
    return false;
  }
}

// Ejecutar la prueba
testConnection().then(success => {
  if (success) {
    console.log('🎉 ¡Todo listo! Ahora ejecuta: npm run dev');
  } else {
    console.log('💡 Revisa los errores arriba y corrige la configuración');
  }
});