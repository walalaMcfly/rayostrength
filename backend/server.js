const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { pool, createTables, testConnection } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({ 
    message: '🚀 ¡Backend funcionando!',
    database: dbStatus ? 'Conectado' : 'Desconectado',
    timestamp: new Date().toISOString()
  });
});

// REGISTRO DE USUARIO (actualizado para tabla Usuario)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { nombre, apellido, email, contraseña, fecha_nacimiento, sexo, peso_actual, altura } = req.body;

    // Validaciones
    if (!nombre || !apellido || !email || !contraseña || !fecha_nacimiento || !sexo) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, apellido, email, contraseña, fecha_nacimiento y sexo son requeridos'
      });
    }

    // Verificar si el email ya existe
    const [existingUsers] = await pool.execute(
      'SELECT id_usuario FROM Usuario WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(contraseña, 10);

    // Insertar en la tabla Usuario
    const [result] = await pool.execute(
      `INSERT INTO Usuario (nombre, apellido, email, contraseña, fecha_nacimiento, sexo, peso_actual, altura) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, apellido, email, hashedPassword, fecha_nacimiento, sexo, peso_actual || null, altura || null]
    );

    // Generar token
    const token = jwt.sign(
      { userId: result.insertId, email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        id_usuario: result.insertId,
        nombre,
        apellido,
        email,
        fecha_nacimiento,
        sexo,
        peso_actual,
        altura
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// LOGIN DE USUARIO (actualizado)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, contraseña } = req.body;

    if (!email || !contraseña) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña requeridos'
      });
    }

    // Buscar usuario por email
    const [users] = await pool.execute(
      'SELECT * FROM Usuario WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Email o contraseña incorrectos'
      });
    }

    const user = users[0];

    // Verificar contraseña
    const validPassword = await bcrypt.compare(contraseña, user.contraseña);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Email o contraseña incorrectos'
      });
    }

    // Generar token
    const token = jwt.sign(
      { userId: user.id_usuario, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login exitoso',
      token,
      user: {
        id_usuario: user.id_usuario,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        fecha_nacimiento: user.fecha_nacimiento,
        sexo: user.sexo,
        peso_actual: user.peso_actual,
        altura: user.altura
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// REGISTRO DE COACH (nuevo endpoint)
app.post('/api/auth/register-coach', async (req, res) => {
  try {
    const { nombre, apellido, email, contraseña, fecha_nacimiento, sexo, especialidad, experiencia } = req.body;

    if (!nombre || !apellido || !email || !contraseña || !especialidad) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, apellido, email, contraseña y especialidad son requeridos'
      });
    }

    // Verificar si el email ya existe
    const [existingCoaches] = await pool.execute(
      'SELECT id_coach FROM Coach WHERE email = ?',
      [email]
    );

    if (existingCoaches.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado como coach'
      });
    }

    const hashedPassword = await bcrypt.hash(contraseña, 10);

    const [result] = await pool.execute(
      `INSERT INTO Coach (nombre, apellido, email, contraseña, fecha_nacimiento, sexo, especialidad, experiencia) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, apellido, email, hashedPassword, fecha_nacimiento || null, sexo || null, especialidad, experiencia || null]
    );

    const token = jwt.sign(
      { coachId: result.insertId, email, role: 'coach' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Coach registrado exitosamente',
      token,
      coach: {
        id_coach: result.insertId,
        nombre,
        apellido,
        email,
        especialidad,
        experiencia
      }
    });

  } catch (error) {
    console.error('Error en registro coach:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Iniciar servidor
const startServer = async () => {
  try {
    await createTables();
    app.listen(PORT, () => {
      console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
  }
};

startServer();