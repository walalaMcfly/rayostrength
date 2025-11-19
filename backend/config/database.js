const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'rayostrenght.clkkmwkg6o6s.us-east-2.rds.amazonaws.com',
  user: process.env.DB_USER || 'rayos',
  password: process.env.DB_PASSWORD || 'rayosth02.',
  database: process.env.DB_NAME || 'rayostrenght',
  port: process.env.DB_PORT || 3306
};

console.log('Configuracion DB:', {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database
});

const pool = mysql.createPool({
  host: dbConfig.host,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  port: dbConfig.port,
  acquireTimeout: 60000,
  timeout: 60000,
  connectionLimit: 10,
  queueLimit: 0,
  waitForConnections: true,
  keepAliveInitialDelay: 10000,
  enableKeepAlive: true,
  ssl: { rejectUnauthorized: false }
});

const createTables = async () => {
  try {
    const connection = await pool.getConnection();
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS Usuario (
        id_usuario INT NOT NULL AUTO_INCREMENT,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL,
        contraseña VARCHAR(255) NOT NULL,
        edad INT NULL DEFAULT NULL,
        sexo ENUM('M','F','Otro') NOT NULL,
        peso_actual DECIMAL(5,2) NULL DEFAULT NULL,
        altura DECIMAL(5,2) NULL DEFAULT NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id_usuario),
        UNIQUE INDEX email (email)
      ) ENGINE=InnoDB
    `);
   
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS Coach (
        id_coach INT NOT NULL AUTO_INCREMENT,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL,
        contraseña VARCHAR(255) NOT NULL,
        fecha_nacimiento DATE NULL DEFAULT NULL,
        sexo ENUM('M','F','Otro') NULL DEFAULT NULL,
        especialidad VARCHAR(150) NULL DEFAULT NULL,
        experiencia VARCHAR(255) NULL DEFAULT NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id_coach),
        UNIQUE INDEX email (email)
      ) ENGINE=InnoDB
    `);
    
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
      ) ENGINE=InnoDB
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS Wellness (
        id_wellness INT AUTO_INCREMENT PRIMARY KEY,
        id_usuario INT NOT NULL,
        fecha DATE NOT NULL,
        energia INT NOT NULL,
        sueno INT NOT NULL,
        estres INT NOT NULL,
        dolor_muscular INT NOT NULL,
        motivacion INT NOT NULL,
        apetito INT NULL,
        notas TEXT NULL,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE CASCADE,
        UNIQUE KEY unique_wellness_daily (id_usuario, fecha)
      ) ENGINE=InnoDB
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ProgresoRutinas (
        id_progreso_rutina INT AUTO_INCREMENT PRIMARY KEY,
        id_usuario INT NOT NULL,
        id_ejercicio VARCHAR(100) NOT NULL,
        nombre_ejercicio VARCHAR(255) NOT NULL,
        fecha DATE NOT NULL,
        sets_completados INT DEFAULT 0,
        reps_logradas VARCHAR(50) NULL,
        peso_utilizado VARCHAR(100) NULL,
        rir_final INT NULL,
        rpe_final INT NULL,
        notas TEXT NULL,
        duracion_minutos INT NULL,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS CoachUsuario (
        id_relacion INT AUTO_INCREMENT PRIMARY KEY,
        id_coach INT NOT NULL,
        id_usuario INT NOT NULL,
        fecha_inicio DATE NOT NULL,
        fecha_fin DATE NULL,
        activo BOOLEAN DEFAULT TRUE,
        notas TEXT NULL,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_coach) REFERENCES Coach(id_coach) ON DELETE CASCADE,
        FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE CASCADE,
        UNIQUE KEY unique_coach_usuario (id_coach, id_usuario)
      ) ENGINE=InnoDB
    `);
   
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS SesionesEntrenamiento (
        id_sesion INT AUTO_INCREMENT PRIMARY KEY,
        id_usuario INT NOT NULL,
        fecha DATE NOT NULL,
        semana_rutina VARCHAR(50) NOT NULL,
        total_ejercicios INT DEFAULT 0,
        ejercicios_completados INT DEFAULT 0,
        porcentaje_completitud DECIMAL(5,2) DEFAULT 0,
        duracion_total_minutos INT NULL,
        volumen_total DECIMAL(10,2) NULL,
        rpe_promedio DECIMAL(3,1) NULL,
        rir_promedio DECIMAL(3,1) NULL,
        notas_usuario TEXT NULL,
        notas_coach TEXT NULL,
        completada BOOLEAN DEFAULT FALSE,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    console.log('Todas las tablas creadas/verificadas correctamente');
    
    connection.release();
  } catch (error) {
    console.error('Error creando tablas:', error.message);
    throw error;
  }
};

const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Conectado a la base de datos MySQL');
    connection.release();
    return true;
  } catch (error) {
    console.error('Error conectando a MySQL:', error.message);
    return false;
  }
};

module.exports = { pool, createTables, testConnection };