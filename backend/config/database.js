const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'rayostrenght.clkkmwkg6o6s.us-east-2.rds.amazonaws.com',
  user: process.env.DB_USER || 'rayos',
  password: process.env.DB_PASSWORD || 'rayosth02.',
  database: process.env.DB_NAME || 'rayostrenght',
  port: process.env.DB_PORT || 3306
};


const pool = mysql.createPool({
  ...dbConfig,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  connectionLimit: 10,
  queueLimit: 0,
  waitForConnections: true,
  keepAliveInitialDelay: 10000,
  enableKeepAlive: true
});



const createTables = async () => {
  try {
    const connection = await pool.getConnection();
    
  // Tabla Usuario
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS Usuario (
        id_usuario INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        contraseña VARCHAR(255) NOT NULL,
        fecha_nacimiento DATE NOT NULL,
        sexo ENUM('M', 'F', 'Otro') NOT NULL,
        peso_actual DECIMAL(5,2),
        altura DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Tabla Coach
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS Coach (
        id_coach INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        contraseña VARCHAR(255) NOT NULL,
        fecha_nacimiento DATE,
        sexo ENUM('M', 'F', 'Otro'),
        especialidad VARCHAR(150),
        experiencia VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Tabla Progreso
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS Progreso (
        id_progreso INT AUTO_INCREMENT PRIMARY KEY,
        id_usuario INT NOT NULL,
        fecha DATE NOT NULL,
        rutina VARCHAR(150),
        ejercicio VARCHAR(150),
        peso_realizado DECIMAL(5,2),
        repeticiones_realizadas INT,
        notas TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)
          ON DELETE CASCADE
          ON UPDATE CASCADE
      )
    `);
    
    connection.release();
    console.log('✅ Tablas creadas');
  } catch (error) {
    console.error('❌ Error creando tablas:', error.message);
  }
};

const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conectado a la base de datos MySQL');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Error conectando a MySQL:', error.message);
    return false;
  }
};

module.exports = { pool, createTables, testConnection };