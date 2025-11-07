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

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token de acceso requerido'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }
    req.user = user;
    next();
  });
};

// REGISTRO DE USUARIO (actualizado para usar edad)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { nombre, apellido, email, contraseña, edad, sexo, peso_actual, altura } = req.body;

    // Validaciones
    if (!nombre || !apellido || !email || !contraseña || !edad || !sexo) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, apellido, email, contraseña, edad y sexo son requeridos'
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

    // Insertar en la tabla Usuario (usando edad)
    const [result] = await pool.execute(
      `INSERT INTO Usuario (nombre, apellido, email, contraseña, edad, sexo, peso_actual, altura) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, apellido, email, hashedPassword, edad, sexo, peso_actual || null, altura || null]
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
        edad,
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

// LOGIN DE USUARIO 
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
        edad: user.edad,
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

const googleSheets = require('./config/googleSheets');
// Endpoint público para probar Google Sheets (sin autenticación)
app.get('/api/test-rutinas/:semana', async (req, res) => {
  try {
    const { semana } = req.params;
    console.log(`🔍 Solicitando rutinas para: ${semana} (test público)`);
    
    const data = await googleSheets.readSheet(semana);
    console.log(`📊 Datos crudos de Google Sheets:`, data);
    
    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron datos en la hoja'
      });
    }
    
    const rutinas = transformSheetDataToRutinas(data);
    console.log(`✅ Rutinas transformadas:`, rutinas);
    
    res.json({
      success: true,
      rutinas: rutinas
    });
    
  } catch (error) {
    console.error('❌ Error detallado obteniendo rutinas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las rutinas',
      error: error.message,
      sheet: req.params.semana
    });
  }
});

// OBTENER RUTINAS DE LA SEMANA
app.get('/api/rutinas/:semana', authenticateToken, async (req, res) => {
  try {
    const { semana } = req.params;
    const data = await googleSheets.readSheet(semana);
    
    
    const rutinas = transformSheetDataToRutinas(data);
    
    res.json({
      success: true,
      rutinas: rutinas
    });
    
  } catch (error) {
    console.error('Error obteniendo rutinas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las rutinas'
    });
  }
});

// MARCAR EJERCICIO COMPLETADO
app.post('/api/rutinas/completar', authenticateToken, async (req, res) => {
  try {
    const { semana, ejercicioId, setsCompletados } = req.body;
    
    await googleSheets.updateRow(semana, ejercicioId, {
      setsCompletados: JSON.stringify(setsCompletados),
      fechaCompletado: new Date().toISOString(),
      usuarioId: req.user.userId
    });
    
    res.json({
      success: true,
      message: 'Ejercicio marcado como completado'
    });
    
  } catch (error) {
    console.error('Error marcando ejercicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el ejercicio'
    });
  }
});

// GUARDAR NOTAS DEL CLIENTE
app.post('/api/rutinas/notas', authenticateToken, async (req, res) => {
  try {
    const { semana, ejercicioId, notasCliente } = req.body;
    
    await googleSheets.updateRow(semana, ejercicioId, {
      notasCliente: notasCliente,
      usuarioId: req.user.userId
    });
    
    res.json({
      success: true,
      message: 'Notas guardadas correctamente'
    });
    
  } catch (error) {
    console.error('Error guardando notas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar las notas'
    });
  }
});


function transformSheetDataToRutinas(sheetData) {
  if (!sheetData || sheetData.length < 2) return [];
  
  const headers = sheetData[0]; 
  const rows = sheetData.slice(1); 
  
  return rows.map((row, index) => {
    const rutina = {};
    headers.forEach((header, i) => {
      switch(header.toLowerCase()) {
        case 'nombre': rutina.nombre = row[i]; break;
        case 'videourl': rutina.videoUrl = row[i]; break;
        case 'series': rutina.series = parseInt(row[i]) || 0; break;
        case 'reps': rutina.reps = row[i]; break;
        case 'tempo': rutina.tempo = row[i]; break;
        case 'rir': rutina.rir = parseInt(row[i]) || 0; break;
        case 'rpe': rutina.rpe = parseInt(row[i]) || 0; break;
        case 'peso': rutina.peso = row[i]; break;
        case 'notacoach': rutina.notaCoach = row[i]; break;
      }
    });
    rutina.id = `ej-${index + 1}`;
    return rutina;
  });
}

// PERFIL DEL USUARIO - OBTENER
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id_usuario, nombre, apellido, email, edad, sexo, peso_actual, altura FROM Usuario WHERE id_usuario = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const user = users[0];
    res.json({
      success: true,
      user: {
        id_usuario: user.id_usuario,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        edad: user.edad,
        sexo: user.sexo,
        peso_actual: user.peso_actual,
        altura: user.altura
      }
    });

  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// PERFIL DEL USUARIO - ACTUALIZAR
app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { nombre, apellido, edad, sexo, peso_actual, altura } = req.body;

    // Validaciones básicas
    if (!nombre || !apellido || !edad || !sexo) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, apellido, edad y sexo son requeridos'
      });
    }

    await pool.execute(
      `UPDATE Usuario 
       SET nombre = ?, apellido = ?, edad = ?, sexo = ?, peso_actual = ?, altura = ?
       WHERE id_usuario = ?`,
      [nombre, apellido, edad, sexo, peso_actual, altura, req.user.userId]
    );

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});


app.post('/api/auth/register-coach', async (req, res) => {
  try {
    const { nombre, apellido, email, contraseña, edad, sexo, especialidad, experiencia } = req.body;

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
      `INSERT INTO Coach (nombre, apellido, email, contraseña, edad, sexo, especialidad, experiencia) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, apellido, email, hashedPassword, edad || null, sexo || null, especialidad, experiencia || null]
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
        edad,
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

app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await testConnection();
    const sheetsHealth = await googleSheets.healthCheck();
    
    res.json({
      message: '🚀 ¡Backend funcionando!',
      database: dbStatus ? 'Conectado' : 'Desconectado',
      google_sheets: sheetsHealth,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      message: '⚠️ Backend con problemas',
      error: error.message
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