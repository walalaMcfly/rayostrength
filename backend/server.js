const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { pool, createTables, testConnection } = require('./config/database');
const googleSheets = require('./config/googleSheets');

const app = express();
const PORT = process.env.PORT || 3000;

const safeSQLValue = (value) => {
  if (value === undefined || value === null) return null;
  if (value === '') return null;
  return value;
};

app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({ 
    message: '🚀 ¡Backend funcionando!',
    database: dbStatus ? 'Conectado' : 'Desconectado',
    timestamp: new Date().toISOString()
  });
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token de acceso requerido'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log('❌ JWT Verification Error:', err);
      return res.status(403).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }
    
    console.log('🔐 JWT Decoded:', decoded);
    
    if (decoded.role === 'coach') {
      req.user = {
        coachId: decoded.coachId,
        email: decoded.email,
        role: decoded.role
      };
    } else {
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };
    }
    
    console.log('👤 User object final:', req.user);
    next();
  });
};

// AUTH ENDPOINTS
app.post('/api/auth/register', async (req, res) => {
  try {
    const { nombre, apellido, email, contraseña, edad, sexo, peso_actual, altura } = req.body;

    if (!nombre || !apellido || !email || !contraseña || !edad || !sexo) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, apellido, email, contraseña, edad y sexo son requeridos'
      });
    }

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

    const hashedPassword = await bcrypt.hash(contraseña, 10);

    const [result] = await pool.execute(
      `INSERT INTO Usuario (nombre, apellido, email, contraseña, edad, sexo, peso_actual, altura) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, apellido, email, hashedPassword, edad, sexo, peso_actual || null, altura || null]
    );

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

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, contraseña } = req.body;

    if (!email || !contraseña) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña requeridos'
      });
    }

    let user = null;
    let role = 'user';

    console.log('🔐 Intentando login para:', email);

    const [coaches] = await pool.execute(
      'SELECT * FROM Coach WHERE email = ?',
      [email]
    );

    if (coaches.length > 0) {
      console.log('✅ Coach encontrado:', coaches[0].email);
      user = coaches[0];
      role = 'coach';
    } else {
      const [users] = await pool.execute(
        'SELECT * FROM Usuario WHERE email = ?',
        [email]
      );

      if (users.length > 0) {
        console.log('✅ Usuario encontrado:', users[0].email);
        user = users[0];
        role = 'user';
      }
    }

    if (!user) {
      console.log('❌ Usuario no encontrado:', email);
      return res.status(401).json({
        success: false,
        message: 'Email o contraseña incorrectos'
      });
    }

    const validPassword = await bcrypt.compare(contraseña, user.contraseña);
    if (!validPassword) {
      console.log('❌ Contraseña incorrecta para:', email);
      return res.status(401).json({
        success: false,
        message: 'Email o contraseña incorrectos'
      });
    }

    console.log('✅ Contraseña válida para:', email);

    let tokenPayload;
    if (role === 'user') {
      tokenPayload = { 
        userId: user.id_usuario, 
        email: user.email, 
        role: 'user' 
      };
    } else {
      tokenPayload = { 
        coachId: user.id_coach,
        email: user.email, 
        role: 'coach' 
      };
    }

    console.log('🎫 Token payload creado:', tokenPayload);

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    if (role === 'user') {
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
          altura: user.altura,
          role: 'user'
        }
      });
    } else {
      res.json({
        success: true,
        message: 'Login exitoso',
        token,
        user: {
          id_coach: user.id_coach,
          nombre: user.nombre,
          apellido: user.apellido,
          email: user.email,
          fecha_nacimiento: user.fecha_nacimiento,
          sexo: user.sexo,
          especialidad: user.especialidad,
          experiencia: user.experiencia,
          role: 'coach'
        }
      });
    }

  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// COACH ENDPOINTS
app.get('/api/coach/clientes', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'coach') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Solo para coaches.'
      });
    }

    const [clientes] = await pool.execute(
      `SELECT 
        u.id_usuario, 
        u.nombre, 
        u.apellido, 
        u.email,
        u.edad,
        u.sexo,
        u.peso_actual,
        u.altura,
        (SELECT COUNT(*) FROM SesionesEntrenamiento se WHERE se.id_usuario = u.id_usuario AND se.completada = true) as rutinas_completadas,
        (SELECT MAX(fecha) FROM SesionesEntrenamiento se WHERE se.id_usuario = u.id_usuario) as ultima_sesion
       FROM Usuario u
       LIMIT 20`
    );

    res.json({
      success: true,
      clientes: clientes,
      estadisticas: {
        totalClientes: clientes.length,
        clientesActivos: clientes.length,
        rutinasCompletadas: clientes.reduce((sum, cliente) => sum + (cliente.rutinas_completadas || 0), 0)
      }
    });

  } catch (error) {
    console.error('Error obteniendo clientes del coach:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// ✅ ENDPOINT CORREGIDO - SIN fecha_registro Y SIN DUPLICADOS
app.get('/api/coach/cliente/:idCliente', authenticateToken, async (req, res) => {
  try {
    const { idCliente } = req.params;

    if (req.user.role !== 'coach') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Solo para coaches.'
      });
    }

    const [clienteData] = await pool.execute(
      `SELECT 
        id_usuario, 
        nombre, 
        apellido, 
        email,
        edad,
        sexo,
        peso_actual,
        altura
       FROM Usuario 
       WHERE id_usuario = ?`,
      [idCliente]
    );

    if (clienteData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    const cliente = clienteData[0];

    const [estadisticasRutinas] = await pool.execute(
      `SELECT 
        COUNT(*) as total_sesiones,
        SUM(CASE WHEN completada = true THEN 1 ELSE 0 END) as sesiones_completadas,
        AVG(CASE WHEN completada = true THEN porcentaje_completitud ELSE 0 END) as porcentaje_promedio,
        MAX(fecha) as ultima_sesion
       FROM SesionesEntrenamiento 
       WHERE id_usuario = ?`,
      [idCliente]
    );

    const today = new Date().toISOString().split('T')[0];
    const [wellnessHoy] = await pool.execute(
      `SELECT energia, sueno, estres, dolor_muscular, motivacion, apetito
       FROM Wellness 
       WHERE id_usuario = ? AND fecha = ?`,
      [idCliente, today]
    );

    const [pesosMaximos] = await pool.execute(
      `SELECT 
        nombre_ejercicio,
        MAX(CAST(REPLACE(REPLACE(peso_utilizado, 'kg', ''), ' ', '') AS DECIMAL)) as peso_maximo,
        MAX(fecha) as fecha_ultimo
       FROM ProgresoRutinas 
       WHERE id_usuario = ? 
         AND peso_utilizado IS NOT NULL 
         AND peso_utilizado != ''
         AND peso_utilizado != '0'
       GROUP BY nombre_ejercicio
       ORDER BY peso_maximo DESC
       LIMIT 6`,
      [idCliente]
    );

    const [ejerciciosRecientes] = await pool.execute(
      `SELECT 
        nombre_ejercicio,
        peso_utilizado,
        reps_logradas,
        fecha
       FROM ProgresoRutinas 
       WHERE id_usuario = ? 
         AND fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       ORDER BY fecha DESC
       LIMIT 5`,
      [idCliente]
    );

    const [asistenciaMensual] = await pool.execute(
      `SELECT 
        COUNT(DISTINCT DATE(fecha)) as dias_entrenados
       FROM SesionesEntrenamiento 
       WHERE id_usuario = ? 
         AND fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
         AND completada = true`,
      [idCliente]
    );

    const diasEntrenados = asistenciaMensual[0]?.dias_entrenados || 0;
    const consistencia = Math.round((diasEntrenados / 30) * 100);

    const datosCliente = {
      ...cliente,
      rutinas_completadas: estadisticasRutinas[0]?.sesiones_completadas || 0,
      total_sesiones: estadisticasRutinas[0]?.total_sesiones || 0,
      porcentaje_completitud: Math.round(estadisticasRutinas[0]?.porcentaje_promedio || 0),
      ultima_sesion: estadisticasRutinas[0]?.ultima_sesion,
      wellness_hoy: wellnessHoy.length > 0 ? wellnessHoy[0] : null,
      pesos_maximos: pesosMaximos,
      ejercicios_recientes: ejerciciosRecientes,
      consistencia: consistencia,
      dias_entrenados_mes: diasEntrenados,
      estado: diasEntrenados === 0 ? 'nuevo' : 
              consistencia >= 70 ? 'activo' : 
              consistencia >= 30 ? 'irregular' : 'inactivo'
    };

    res.json({
      success: true,
      cliente: datosCliente
    });

  } catch (error) {
    console.error('Error obteniendo datos del cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor: ' + error.message
    });
  }
});

// RUTINAS ENDPOINTS
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

// WELLNESS ENDPOINTS
app.post('/api/wellness/registrar', authenticateToken, async (req, res) => {
  try {
    const { energia, sueno, estres, dolor_muscular, motivacion, apetito } = req.body;
    const userId = req.user.userId;

    const safeValue = (value) => {
      if (value === undefined || value === null) return null;
      return parseInt(value) || 0;
    };

    if (energia === undefined || sueno === undefined || estres === undefined || 
        dolor_muscular === undefined || motivacion === undefined) {
      return res.status(400).json({ 
        success: false,
        error: 'Todos los campos son requeridos' 
      });
    }

    const fecha = new Date().toISOString().split('T')[0];

    const [existing] = await pool.execute(
      'SELECT id_wellness FROM Wellness WHERE id_usuario = ? AND fecha = ?',
      [userId, fecha]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya completaste la encuesta wellness para hoy'
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO Wellness (id_usuario, fecha, energia, sueno, estres, dolor_muscular, motivacion, apetito) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, 
        fecha,
        safeValue(energia),
        safeValue(sueno), 
        safeValue(estres),
        safeValue(dolor_muscular),
        safeValue(motivacion),
        safeValue(apetito)
      ]
    );

    res.json({ 
      success: true, 
      message: 'Encuesta wellness guardada correctamente',
      id: result.insertId 
    });

  } catch (error) {
    console.error('Error en wellness:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// PROGRESO ENDPOINTS
app.post('/api/progreso/registrar-sesion', authenticateToken, async (req, res) => {
  try {
    const { 
      semana_rutina, 
      total_ejercicios, 
      ejercicios_completados, 
      duracion_total_minutos,
      volumen_total,
      rpe_promedio,
      rir_promedio,
      notas_usuario 
    } = req.body;
    
    const userId = req.user.userId;

    const porcentaje_completitud = (ejercicios_completados / total_ejercicios) * 100;

    const [result] = await pool.execute(
      `INSERT INTO SesionesEntrenamiento 
       (id_usuario, fecha, semana_rutina, total_ejercicios, ejercicios_completados, 
        porcentaje_completitud, duracion_total_minutos, volumen_total, rpe_promedio, 
        rir_promedio, notas_usuario, completada)
       VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        userId, 
        semana_rutina, 
        total_ejercicios, 
        ejercicios_completados, 
        porcentaje_completitud, 
        duracion_total_minutos || null, 
        volumen_total || null, 
        rpe_promedio || null, 
        rir_promedio || null, 
        notas_usuario || 'Sesión completada'
      ]
    );

    res.json({
      success: true,
      message: 'Sesión de entrenamiento registrada correctamente',
      id_sesion: result.insertId
    });

  } catch (error) {
    console.error('Error registrando sesión:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar la sesión: ' + error.message
    });
  }
});

// USER PROFILE ENDPOINTS
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

app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { nombre, apellido, edad, sexo, peso_actual, altura } = req.body;

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

// GOOGLE SHEETS INTEGRATION
app.post('/api/coach/cliente/vincular-hoja', authenticateToken, async (req, res) => {
  let connection;
  try {
    console.log('🔐 User object recibido:', req.user);
    
    if (req.user.role !== 'coach') {
      return res.status(403).json({ 
        success: false, 
        message: 'Acceso denegado. Solo para coaches.' 
      });
    }

    const { idCliente, sheetUrl } = req.body;
    const idCoach = req.user.coachId;

    console.log('📥 Datos recibidos:', { idCliente, sheetUrl, idCoach });

    if (!idCoach || isNaN(idCoach)) {
      console.log('❌ CoachId inválido:', idCoach);
      return res.status(400).json({ 
        success: false, 
        message: 'ID de coach inválido. El coach no está correctamente autenticado.' 
      });
    }

    const [coachExists] = await pool.execute(
      'SELECT id_coach, nombre, apellido FROM Coach WHERE id_coach = ?',
      [idCoach]
    );
    
    if (coachExists.length === 0) {
      console.log('❌ Coach no encontrado en BD con id:', idCoach);
      return res.status(404).json({
        success: false,
        message: 'Coach no encontrado en la base de datos'
      });
    }

    console.log('✅ Coach verificado:', coachExists[0]);

    if (!idCliente || !sheetUrl) {
      return res.status(400).json({ 
        success: false, 
        message: 'idCliente y sheetUrl son requeridos' 
      });
    }

    const sheetId = extraerSheetId(sheetUrl);
    if (!sheetId) {
      return res.status(400).json({ 
        success: false, 
        message: 'URL de Google Sheets no válida' 
      });
    }

    console.log('🔄 Iniciando vinculación para:', {
      coach: coachExists[0].nombre + ' ' + coachExists[0].apellido,
      cliente: idCliente,
      hoja: sheetId
    });

    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const health = await googleSheets.healthCheck();
      console.log('🔍 Google Sheets health:', health);
      
      if (!health.healthy) {
        await connection.rollback();
        return res.status(500).json({
          success: false,
          message: `Problema con Google Sheets: ${health.message}`
        });
      }

      console.log('📊 Leyendo hoja de Google Sheets...');
      const rawData = await googleSheets.readAnySheet(sheetId, '4 semanas');
      console.log('✅ Datos crudos leídos, filas:', rawData.length);
      
      if (!rawData || rawData.length === 0) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false, 
          message: 'No se encontraron datos en la pestaña "4 semanas".' 
        });
      }

      const rutinaProcesada = procesarRutinaColumnasFijas(rawData);
      console.log('✅ Ejercicios procesados:', rutinaProcesada.ejercicios.length);
      
      if (rutinaProcesada.ejercicios.length === 0) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false, 
          message: 'No se encontraron ejercicios. Verifica que las columnas C-I tengan datos.' 
        });
      }

      const safeIdCliente = parseInt(idCliente);
      const safeIdCoach = parseInt(idCoach);
      const safeSheetId = sheetId;
      const safeNombreHoja = `Hoja_${idCliente}`;

      console.log('💾 Parámetros para guardar:', {
        idCliente: safeIdCliente,
        idCoach: safeIdCoach,
        sheetId: safeSheetId,
        nombreHoja: safeNombreHoja
      });

      console.log('💾 Guardando en HojasClientes...');
      const [result] = await connection.execute(
        `INSERT INTO HojasClientes (id_cliente, id_coach, id_hoja_google, nombre_hoja) 
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         id_hoja_google = VALUES(id_hoja_google),
         nombre_hoja = VALUES(nombre_hoja),
         activa = TRUE,
         ultima_sincronizacion = NOW()`,
        [safeIdCliente, safeIdCoach, safeSheetId, safeNombreHoja]
      );

      console.log('✅ Guardado en HojasClientes, resultado:', result);

      const datosRutinaJSON = JSON.stringify(rutinaProcesada);
      console.log('💾 Guardando en CacheRutinas...');
      
      const [cacheResult] = await connection.execute(
        `INSERT INTO CacheRutinas (id_cliente, datos_rutina) 
         VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE 
         datos_rutina = VALUES(datos_rutina), 
         fecha_actualizacion = NOW()`,
        [safeIdCliente, datosRutinaJSON]
      );

      console.log('✅ Guardado en CacheRutinas');

      await connection.commit();

      res.json({ 
        success: true, 
        message: '✅ Hoja vinculada correctamente', 
        coach: coachExists[0],
        detalles: {
          cliente: idCliente,
          ejerciciosProcesados: rutinaProcesada.ejercicios.length,
          sheetId: sheetId,
          gruposMusculares: rutinaProcesada.metadata.gruposMusculares
        }
      });

    } catch (googleError) {
      await connection.rollback();
      console.error('❌ Error en procesamiento:', googleError);
      
      let errorMessage = `Error: ${googleError.message}`;
      
      if (googleError.message.includes('PERMISSION_DENIED')) {
        errorMessage += `\n\n🔧 SOLUCIÓN: Comparte la hoja con: rayostrength-sheets@rayostrength-434a7.iam.gserviceaccount.com`;
      } else if (googleError.message.includes('NOT_FOUND')) {
        errorMessage += '\n\n🔧 SOLUCIÓN: Verifica que exista la pestaña "4 semanas"';
      }
      
      return res.status(500).json({ 
        success: false, 
        message: errorMessage
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }

  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error('❌ Error general vinculando hoja:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor: ' + error.message 
    });
  }
});

function procesarRutinaColumnasFijas(rawData) {
  if (!rawData || rawData.length < 2) {
    return { ejercicios: [], metadata: { totalEjercicios: 0 } };
  }

  const ejercicios = [];
  
  console.log('🔍 Procesando con columnas fijas...');
  console.log('📊 Total de filas:', rawData.length);

  let startRow = 1;
  for (let i = 1; i < Math.min(10, rawData.length); i++) {
    const row = rawData[i];
    if (row && row.length >= 4) {
      const grupoMuscular = (row[2] || '').toString().trim();
      const nombreEjercicio = (row[3] || '').toString().trim();
      
      if (grupoMuscular && nombreEjercicio && 
          !grupoMuscular.toLowerCase().includes('grupo') &&
          !nombreEjercicio.toLowerCase().includes('ejercicio')) {
        startRow = i;
        console.log('✅ Datos empiezan en fila:', startRow + 1);
        break;
      }
    }
  }

  for (let i = startRow; i < rawData.length; i++) {
    const row = rawData[i];
    
    if (!row || row.length < 9) continue;

    const grupoMuscular = safeSQLValue(row[2]);
    const nombreEjercicio = safeSQLValue(row[3]);
    const video = safeSQLValue(row[4]);
    const series = safeSQLValue(row[5]);
    const reps = safeSQLValue(row[6]);
    const rir = safeSQLValue(row[7]);
    const descanso = safeSQLValue(row[8]);

    if (!nombreEjercicio || nombreEjercicio.toString().trim() === '') continue;

    const nombreLimpio = nombreEjercicio.toString().trim();
    
    if (nombreLimpio.toUpperCase().includes('EXERCISE') || 
        nombreLimpio.includes('**') ||
        nombreLimpio.toLowerCase().includes('ejercicio') ||
        nombreLimpio === '') {
      continue;
    }

    const ejercicio = {
      grupoMuscular: limpiarGrupoMuscular(grupoMuscular) || 'General',
      nombre: nombreLimpio,
      video: limpiarTexto(video) || '',
      series: parseInt(series) || 0,
      repeticiones: limpiarTexto(reps) || '',
      rir: extraerRIRSimple(rir),
      descanso: limpiarTexto(descanso) || '',
      id: `ej-${i}`
    };

    if (ejercicio.nombre && ejercicio.nombre.length > 2) {
      ejercicios.push(ejercicio);
    }
  }

  console.log(`🎯 Total de ejercicios procesados: ${ejercicios.length}`);
  console.log(`🏷️ Grupos musculares encontrados:`, [...new Set(ejercicios.map(e => e.grupoMuscular))]);

  return {
    ejercicios,
    metadata: {
      totalEjercicios: ejercicios.length,
      gruposMusculares: [...new Set(ejercicios.map(e => e.grupoMuscular))],
      fechaProcesamiento: new Date().toISOString()
    }
  };
}

function limpiarGrupoMuscular(texto) {
  if (!texto) return 'General';
  const textoLimpio = texto.toString().trim();
  if (textoLimpio === '') return 'General';
  return textoLimpio.charAt(0).toUpperCase() + textoLimpio.slice(1).toLowerCase();
}

function limpiarTexto(texto) {
  if (!texto) return '';
  return texto.toString().trim();
}

function extraerRIRSimple(texto) {
  if (!texto) return null;
  const textoStr = texto.toString();
  const match = textoStr.match(/r\((\d+)\)/);
  if (match) return parseInt(match[1]);
  const numberMatch = textoStr.match(/\d+/);
  return numberMatch ? parseInt(numberMatch[0]) : null;
}

function extraerSheetId(url) {
  if (!url) return null;
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

app.get('/api/rutinas-personalizadas/cliente/:idCliente', authenticateToken, async (req, res) => {
  try {
    const { idCliente } = req.params;

    if (req.user.role === 'coach' || (req.user.role === 'user' && req.user.userId == idCliente)) {
      
      const [hojas] = await pool.execute(
        `SELECT hc.*, c.nombre as coach_nombre, c.apellido as coach_apellido 
         FROM HojasClientes hc
         JOIN Coach c ON hc.id_coach = c.id_coach
         WHERE hc.id_cliente = ? AND hc.activa = TRUE`,
        [idCliente]
      );

      if (hojas.length > 0) {
        const sheetId = hojas[0].id_hoja_google;
        
        console.log('🔄 Leyendo directamente de Google Sheets para cliente:', idCliente);
        
        try {
          const rawData = await googleSheets.readAnySheet(sheetId, '4 semanas');
          const rutinaProcesada = procesarRutinaColumnasFijas(rawData);
          
          console.log('✅ Datos actualizados desde Google Sheets. Ejercicios:', rutinaProcesada.ejercicios.length);

          const datosRutinaJSON = JSON.stringify(rutinaProcesada);
          await pool.execute(
            `INSERT INTO CacheRutinas (id_cliente, datos_rutina) 
             VALUES (?, ?) 
             ON DUPLICATE KEY UPDATE 
             datos_rutina = VALUES(datos_rutina), 
             fecha_actualizacion = NOW()`,
            [idCliente, datosRutinaJSON]
          );

          return res.json({
            personalizada: true,
            coach: `${hojas[0].coach_nombre} ${hojas[0].coach_apellido}`,
            hojaVinculada: true,
            ultimaSincronizacion: new Date().toISOString(),
            rutina: rutinaProcesada,
            fuente: 'google_sheets_directo'
          });

        } catch (googleError) {
          console.error('❌ Error leyendo Google Sheets, usando cache:', googleError);
          
          const [cache] = await pool.execute(
            `SELECT datos_rutina FROM CacheRutinas 
             WHERE id_cliente = ? 
             ORDER BY fecha_actualizacion DESC LIMIT 1`,
            [idCliente]
          );

          if (cache.length > 0) {
            let rutinaData;
            try {
              if (typeof cache[0].datos_rutina === 'string') {
                rutinaData = JSON.parse(cache[0].datos_rutina);
              } else {
                rutinaData = cache[0].datos_rutina;
              }
              
              return res.json({
                personalizada: true,
                coach: `${hojas[0].coach_nombre} ${hojas[0].coach_apellido}`,
                hojaVinculada: true,
                ultimaSincronizacion: hojas[0].ultima_sincronizacion,
                rutina: rutinaData,
                fuente: 'cache_fallback'
              });
            } catch (parseError) {
              console.error('❌ Error con cache también:', parseError);
            }
          }
        }
      }

      console.log('🔄 Usando rutina general (fallback)');
      try {
        const data = await googleSheets.readSheet('Rayostrenght');
        const rutinaGeneral = transformSheetDataToRutinas(data);

        res.json({
          personalizada: false,
          hojaVinculada: false,
          rutina: rutinaGeneral,
          fuente: 'rutina_general'
        });
      } catch (sheetError) {
        console.error('Error con rutina general:', sheetError);
        res.json({
          personalizada: false,
          hojaVinculada: false,
          rutina: [],
          fuente: 'vacio'
        });
      }
    } else {
      res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver esta rutina'
      });
    }

  } catch (error) {
    console.error('Error obteniendo rutina personalizada:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la rutina: ' + error.message
    });
  }
});

// START SERVER
const startServer = async () => {
  try {
    await createTables();
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Error iniciando servidor:', error);
  }
};

startServer();