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

app.get('/api/debug/rutinas/:semana', async (req, res) => {
  try {
    const { semana } = req.params;
    console.log(`🔍 [DEBUG] Solicitando rutinas para: ${semana}`);
    console.log(`🔍 [DEBUG] Probando Google Sheets service...`);
    const health = await googleSheets.healthCheck();
    console.log(`🔍 [DEBUG] Health check:`, health);
    console.log(`🔍 [DEBUG] Leyendo hoja: ${semana}`);
    const data = await googleSheets.readSheet(semana);
    console.log(`🔍 [DEBUG] Datos crudos:`, data);
    console.log(`🔍 [DEBUG] Transformando datos...`);
    const rutinas = transformSheetDataToRutinas(data);
    console.log(`🔍 [DEBUG] Rutinas transformadas:`, rutinas);

    res.json({
      success: true,
      message: '✅ DEBUG - Todo funciona correctamente',
      health: health,
      data_raw: data,
      rutinas: rutinas
    });
    
  } catch (error) {
    console.error('❌ [DEBUG] Error completo:', error);
    res.status(500).json({
      success: false,
      message: 'Error en debug',
      error: error.message,
      stack: error.stack
    });
  }
});

const googleSheets = require('./config/googleSheets');
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


// WELLNESS - Registrar encuesta diaria
app.post('/api/wellness/registrar', authenticateToken, async (req, res) => {
  try {
    const { fecha, respuestas } = req.body;
    const userId = req.user.userId;

    // Verificar si ya existe registro para hoy
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

    // Insertar nuevo registro
    await pool.execute(
      `INSERT INTO Wellness (id_usuario, fecha, energia, sueno, estres, dolor_muscular, motivacion, apetito, notas) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, 
        fecha,
        respuestas.energia,
        respuestas.sueno, 
        respuestas.estres,
        respuestas.dolor,
        respuestas.motivacion,
        respuestas.apetito || null,
        respuestas.notas || null
      ]
    );

    res.json({
      success: true,
      message: 'Encuesta wellness guardada correctamente'
    });

  } catch (error) {
    console.error('Error guardando wellness:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar la encuesta wellness'
    });
  }
});

// ✅ ENDPOINT PARA GUARDAR PROGRESO DE RUTINA
app.post('/api/progreso/guardar-ejercicio', authenticateToken, async (req, res) => {
  try {
    const { 
      id_ejercicio, 
      nombre_ejercicio, 
      sets_completados, 
      reps_logradas, 
      peso_utilizado, 
      rir_final, 
      rpe_final, 
      notas 
    } = req.body;
    
    const userId = req.user.userId;

    // Guardar en ProgresoRutinas
    await pool.execute(
      `INSERT INTO ProgresoRutinas 
       (id_usuario, id_ejercicio, nombre_ejercicio, fecha, sets_completados, reps_logradas, peso_utilizado, rir_final, rpe_final, notas)
       VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?)`,
      [userId, id_ejercicio, nombre_ejercicio, sets_completados, reps_logradas, peso_utilizado, rir_final, rpe_final, notas]
    );

    res.json({
      success: true,
      message: 'Progreso del ejercicio guardado correctamente'
    });

  } catch (error) {
    console.error('Error guardando progreso de ejercicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar el progreso'
    });
  }
});

// ✅ ENDPOINT PARA REGISTRAR SESIÓN COMPLETADA
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

    // Guardar en SesionesEntrenamiento
    await pool.execute(
      `INSERT INTO SesionesEntrenamiento 
       (id_usuario, fecha, semana_rutina, total_ejercicios, ejercicios_completados, porcentaje_completitud, duracion_total_minutos, volumen_total, rpe_promedio, rir_promedio, notas_usuario, completada)
       VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [userId, semana_rutina, total_ejercicios, ejercicios_completados, porcentaje_completitud, duracion_total_minutos, volumen_total, rpe_promedio, rir_promedio, notas_usuario]
    );

    res.json({
      success: true,
      message: 'Sesión de entrenamiento registrada correctamente'
    });

  } catch (error) {
    console.error('Error registrando sesión:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar la sesión'
    });
  }
});


app.get('/api/progreso/datos-reales', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Obtener sesiones de las últimas 5 semanas para el gráfico
    const [sesionesSemanales] = await pool.execute(
      `SELECT WEEK(fecha) as semana, COUNT(*) as cantidad
       FROM SesionesEntrenamiento 
       WHERE id_usuario = ? AND fecha >= DATE_SUB(CURDATE(), INTERVAL 5 WEEK)
       GROUP BY WEEK(fecha)
       ORDER BY semana DESC
       LIMIT 5`,
      [userId]
    );

    // Obtener datos de wellness para gráfico
    const [wellnessData] = await pool.execute(
      `SELECT energia, sueno, estres, dolor_muscular, motivacion
       FROM Wellness 
       WHERE id_usuario = ? AND fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       ORDER BY fecha ASC
       LIMIT 7`,
      [userId]
    );

    // Obtener estadísticas generales
    const [estadisticas] = await pool.execute(
      `SELECT 
        COUNT(*) as total_sesiones,
        AVG(porcentaje_completitud) as porcentaje_promedio,
        AVG(rpe_promedio) as rpe_promedio,
        AVG(rir_promedio) as rir_promedio
       FROM SesionesEntrenamiento 
       WHERE id_usuario = ?`,
      [userId]
    );

    // Formatear datos para frontend
    const datosProgreso = {
      rutinasSemanales: sesionesSemanales.map(s => s.cantidad).reverse(),
      wellnessPromedio: wellnessData.map(w => (w.energia + w.sueno + w.motivacion) / 3),
      progresoPesos: [60, 62, 65, 63, 68], // Por implementar con datos reales
      volumenEntrenamiento: [1200, 1350, 1420, 1380, 1500] // Por implementar con datos reales
    };

    const datosEstadisticas = {
      rutinasCompletadas: estadisticas[0]?.total_sesiones || 0,
      totalRutinas: 20, // Esto podría venir de otra tabla
      porcentajeCompletitud: estadisticas[0]?.porcentaje_promedio || 0,
      mejorRPE: 8, // Por implementar con cálculo real
      promedioRIR: estadisticas[0]?.rir_promedio || 0,
      volumenSemanal: 45 // Por implementar con cálculo real
    };

    res.json({
      success: true,
      progressData: datosProgreso,
      estadisticas: datosEstadisticas
    });

  } catch (error) {
    console.error('Error obteniendo datos de progreso:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los datos de progreso'
    });
  }
});


app.get('/api/progreso/datos-reales', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('📊 Solicitando datos reales para usuario:', userId);

  
    const [sesionesSemanales] = await pool.execute(
      `SELECT WEEK(fecha, 1) as semana, COUNT(*) as cantidad
       FROM SesionesEntrenamiento 
       WHERE id_usuario = ? AND fecha >= DATE_SUB(CURDATE(), INTERVAL 5 WEEK)
       GROUP BY WEEK(fecha, 1)
       ORDER BY semana ASC
       LIMIT 5`,
      [userId]
    );


    const [wellnessData] = await pool.execute(
      `SELECT energia, sueno, estres, dolor_muscular, motivacion
       FROM Wellness 
       WHERE id_usuario = ? AND fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       ORDER BY fecha ASC`,
      [userId]
    );


    const [estadisticas] = await pool.execute(
      `SELECT 
        COUNT(*) as total_sesiones,
        AVG(porcentaje_completitud) as porcentaje_promedio,
        AVG(COALESCE(rpe_promedio, 0)) as rpe_promedio,
        AVG(COALESCE(rir_promedio, 0)) as rir_promedio,
        AVG(COALESCE(volumen_total, 0)) as volumen_promedio
       FROM SesionesEntrenamiento 
       WHERE id_usuario = ?`,
      [userId]
    );
    const [mejorRPE] = await pool.execute(
      `SELECT MAX(rpe_promedio) as mejor_rpe
       FROM SesionesEntrenamiento 
       WHERE id_usuario = ? AND rpe_promedio IS NOT NULL`,
      [userId]
    );


    const datosProgreso = {
      rutinasSemanales: sesionesSemanales.map(s => s.cantidad),
      wellnessPromedio: wellnessData.map(w => 
        Math.round((w.energia + w.sueno + w.motivacion) / 3)
      )
    };

    if (wellnessData.length === 0) {
      datosProgreso.wellnessPromedio = [0, 0, 0, 0, 0, 0, 0];
    }

    const datosEstadisticas = {
      rutinasCompletadas: estadisticas[0]?.total_sesiones || 0,
      totalRutinas: 20, 
      porcentajeCompletitud: Math.round(estadisticas[0]?.porcentaje_promedio || 0),
      mejorRPE: Math.round(mejorRPE[0]?.mejor_rpe || 0),
      promedioRIR: Math.round(estadisticas[0]?.rir_promedio || 0),
      volumenSemanal: Math.round(estadisticas[0]?.volumen_promedio || 0)
    };

    console.log('✅ Datos reales enviados:', datosEstadisticas);

    res.json({
      success: true,
      progressData: datosProgreso,
      estadisticas: datosEstadisticas
    });

  } catch (error) {
    console.error('❌ Error obteniendo datos de progreso:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los datos de progreso'
    });
  }
});

app.get('/api/progreso/resumen', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    
    const [sesionesCompletadas] = await pool.execute(
      `SELECT COUNT(*) as total, 
              AVG(porcentaje_completitud) as promedio_completitud,
              AVG(rpe_promedio) as rpe_promedio,
              AVG(rir_promedio) as rir_promedio
       FROM SesionesEntrenamiento 
       WHERE id_usuario = ? AND completada = true`,
      [userId]
    );

 
    const [wellnessPromedio] = await pool.execute(
      `SELECT AVG(energia) as energia, 
              AVG(sueno) as sueno,
              AVG(estres) as estres,
              AVG(dolor_muscular) as dolor_muscular,
              AVG(motivacion) as motivacion
       FROM Wellness 
       WHERE id_usuario = ? AND fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
      [userId]
    );
    const [volumenSemanal] = await pool.execute(
      `SELECT COALESCE(SUM(volumen_total), 0) as volumen_total
       FROM SesionesEntrenamiento 
       WHERE id_usuario = ? AND fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
      [userId]
    );


app.post('/api/progreso/guardar-ejercicio', authenticateToken, async (req, res) => {
  try {
    const { 
      id_ejercicio, 
      nombre_ejercicio, 
      sets_completados, 
      reps_logradas, 
      peso_utilizado, 
      rir_final, 
      rpe_final, 
      notas 
    } = req.body;
    
    const userId = req.user.userId;

    console.log('💪 Guardando progreso de ejercicio:', { id_ejercicio, nombre_ejercicio, sets_completados });

    // Guardar en ProgresoRutinas
    const [result] = await pool.execute(
      `INSERT INTO ProgresoRutinas 
       (id_usuario, id_ejercicio, nombre_ejercicio, fecha, sets_completados, reps_logradas, peso_utilizado, rir_final, rpe_final, notas)
       VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?)`,
      [userId, id_ejercicio, nombre_ejercicio, sets_completados, reps_logradas, peso_utilizado, rir_final, rpe_final, notas]
    );

    console.log('✅ Progreso guardado con ID:', result.insertId);

    res.json({
      success: true,
      message: 'Progreso del ejercicio guardado correctamente',
      id_progreso: result.insertId
    });

  } catch (error) {
    console.error('❌ Error guardando progreso de ejercicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar el progreso del ejercicio'
    });
  }
});

app.post('/api/wellness/registrar', authenticateToken, async (req, res) => {
  try {
    const { fecha, energia, sueno, estres, dolor_muscular, motivacion, apetito, notas } = req.body;
    const userId = req.user.userId;

    console.log('📝 Registrando wellness para usuario:', userId);

    // Verificar si ya existe registro para hoy
    const [existing] = await pool.execute(
      'SELECT id_wellness FROM Wellness WHERE id_usuario = ? AND fecha = ?',
      [userId, fecha || new Date().toISOString().split('T')[0]]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya completaste la encuesta wellness para hoy'
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO Wellness (id_usuario, fecha, energia, sueno, estres, dolor_muscular, motivacion, apetito, notas) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, fecha || new Date().toISOString().split('T')[0], energia, sueno, estres, dolor_muscular, motivacion, apetito, notas]
    );

    console.log('✅ Wellness guardado con ID:', result.insertId);

    res.json({
      success: true,
      message: 'Encuesta wellness guardada correctamente',
      id_wellness: result.insertId
    });

  } catch (error) {
    console.error('❌ Error guardando wellness:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al guardar wellness'
    });
  }
});

    const resumen = {
      rutinasCompletadas: sesionesCompletadas[0]?.total || 0,
      promedioCompletitud: Math.round(sesionesCompletadas[0]?.promedio_completitud || 0),
      rpePromedio: Math.round(sesionesCompletadas[0]?.rpe_promedio || 0),
      rirPromedio: Math.round(sesionesCompletadas[0]?.rir_promedio || 0),
      wellnessPromedio: Math.round(
        (wellnessPromedio[0]?.energia + 
         wellnessPromedio[0]?.sueno + 
         (10 - wellnessPromedio[0]?.estres) + // Invertir estrés
         wellnessPromedio[0]?.motivacion) / 4
      ) || 0,
      volumenSemanal: volumenSemanal[0]?.volumen_total || 0
    };

    res.json({
      success: true,
      resumen: resumen
    });

  } catch (error) {
    console.error('Error obteniendo progreso:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el progreso'
    });
  }
});

app.get('/api/progreso/graficos', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    
    const [rutinasSemanales] = await pool.execute(
      `SELECT YEARWEEK(fecha) as semana, COUNT(*) as cantidad
       FROM SesionesEntrenamiento 
       WHERE id_usuario = ? AND completada = true
       GROUP BY YEARWEEK(fecha)
       ORDER BY semana DESC
       LIMIT 5`,
      [userId]
    );
  
    const [wellnessDiario] = await pool.execute(
      `SELECT fecha, energia, sueno, estres, dolor_muscular, motivacion
       FROM Wellness 
       WHERE id_usuario = ? 
       ORDER BY fecha DESC 
       LIMIT 7`,
      [userId]
    );

    // Datos de progreso de pesos (últimos 30 días)
    const [progresoPesos] = await pool.execute(
      `SELECT fecha, AVG(CAST(REPLACE(peso_utilizado, 'kg', '') AS DECIMAL)) as peso_promedio
       FROM ProgresoRutinas 
       WHERE id_usuario = ? AND peso_utilizado IS NOT NULL
       GROUP BY fecha
       ORDER BY fecha DESC
       LIMIT 30`,
      [userId]
    );

    const datosGraficos = {
      rutinasSemanales: rutinasSemanales.map(r => r.cantidad).reverse(),
      wellnessPromedio: wellnessDiario.map(w => 
        Math.round((w.energia + w.sueno + (10 - w.estres) + w.motivacion) / 4)
      ).reverse(),
      progresoPesos: progresoPesos.map(p => p.peso_promedio || 0).reverse(),
      volumenEntrenamiento: rutinasSemanales.map(r => r.cantidad * 100).reverse() // Ejemplo simplificado
    };

    res.json({
      success: true,
      datos: datosGraficos
    });

  } catch (error) {
    console.error('Error obteniendo datos de gráficos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener datos para gráficos'
    });
  }
});
// PROGRESO - Registrar sesión de entrenamiento completada
app.post('/api/progreso/registrar-sesion', authenticateToken, async (req, res) => {
  try {
    const { fecha, semanaRutina, ejerciciosCompletados, totalEjercicios, duracionMinutos, notas } = req.body;
    const userId = req.user.userId;

    const porcentajeCompletitud = (ejerciciosCompletados / totalEjercicios) * 100;

    await pool.execute(
      `INSERT INTO SesionesEntrenamiento 
       (id_usuario, fecha, semana_rutina, total_ejercicios, ejercicios_completados, porcentaje_completitud, duracion_total_minutos, notas_usuario, completada) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, true)`,
      [userId, fecha, semanaRutina, totalEjercicios, ejerciciosCompletados, porcentajeCompletitud, duracionMinutos, notas]
    );

    res.json({
      success: true,
      message: 'Sesión de entrenamiento registrada correctamente'
    });

  } catch (error) {
    console.error('Error registrando sesión:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar la sesión de entrenamiento'
    });
  }
});

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

app.post('/api/progreso/ejercicio', authenticateToken, async (req, res) => {
  try {
    const { id_ejercicio, nombre_ejercicio, sets_completados, reps_logradas, peso_utilizado, rir_final, rpe_final, notas } = req.body;
    const userId = req.user.userId;

    // Insertar en ProgresoRutinas
    await pool.execute(
      `INSERT INTO ProgresoRutinas (id_usuario, id_ejercicio, nombre_ejercicio, fecha, sets_completados, reps_logradas, peso_utilizado, rir_final, rpe_final, notas)
       VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?)`,
      [userId, id_ejercicio, nombre_ejercicio, sets_completados, reps_logradas, peso_utilizado, rir_final, rpe_final, notas]
    );

    res.json({
      success: true,
      message: 'Progreso del ejercicio guardado'
    });

  } catch (error) {
    console.error('Error guardando progreso de ejercicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar el progreso del ejercicio'
    });
  }
});

// Registrar sesión de entrenamiento
app.post('/api/progreso/sesion', authenticateToken, async (req, res) => {
  try {
    const { semana_rutina, total_ejercicios, ejercicios_completados, duracion_total_minutos, volumen_total, rpe_promedio, rir_promedio, notas_usuario } = req.body;
    const userId = req.user.userId;

    const porcentaje_completitud = (ejercicios_completados / total_ejercicios) * 100;

    // Insertar en SesionesEntrenamiento
    await pool.execute(
      `INSERT INTO SesionesEntrenamiento (id_usuario, fecha, semana_rutina, total_ejercicios, ejercicios_completados, porcentaje_completitud, duracion_total_minutos, volumen_total, rpe_promedio, rir_promedio, notas_usuario, completada)
       VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, semana_rutina, total_ejercicios, ejercicios_completados, porcentaje_completitud, duracion_total_minutos, volumen_total, rpe_promedio, rir_promedio, notas_usuario, true]
    );

    res.json({
      success: true,
      message: 'Sesión de entrenamiento registrada'
    });

  } catch (error) {
    console.error('Error registrando sesión:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar la sesión de entrenamiento'
    });
  }
});

// Obtener resumen de progreso para el usuario
app.get('/api/progreso/resumen', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Obtener estadísticas de sesiones
    const [sesiones] = await pool.execute(
      `SELECT COUNT(*) as total_sesiones, 
              AVG(porcentaje_completitud) as avg_completitud,
              AVG(rpe_promedio) as avg_rpe,
              AVG(rir_promedio) as avg_rir
       FROM SesionesEntrenamiento 
       WHERE id_usuario = ?`,
      [userId]
    );

    // Obtener sesiones de la última semana para gráfico
    const [sesionesSemanales] = await pool.execute(
      `SELECT DATE_FORMAT(fecha, '%Y-%u') as semana, COUNT(*) as cantidad
       FROM SesionesEntrenamiento 
       WHERE id_usuario = ? AND fecha >= DATE_SUB(CURDATE(), INTERVAL 4 WEEK)
       GROUP BY semana
       ORDER BY semana DESC
       LIMIT 5`,
      [userId]
    );

    // Obtener datos de wellness para gráfico
    const [wellnessData] = await pool.execute(
      `SELECT AVG(energia) as energia, AVG(sueno) as sueno, AVG(estres) as estres, AVG(dolor_muscular) as dolor, AVG(motivacion) as motivacion
       FROM Wellness 
       WHERE id_usuario = ? AND fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       GROUP BY fecha
       ORDER BY fecha DESC
       LIMIT 7`,
      [userId]
    );

    // Formatear datos para gráficos
    const rutinasSemanales = sesionesSemanales.map(s => s.cantidad).reverse();
    const wellnessPromedio = wellnessData.map(w => (w.energia + w.sueno + w.motivacion) / 3).reverse();

    res.json({
      success: true,
      resumen: {
        rutinasCompletadas: sesiones[0].total_sesiones,
        totalRutinas: 20, // Este valor podría venir de otra parte
        porcentajeCompletitud: sesiones[0].avg_completitud || 0,
        mejorRPE: 8, // Podrías calcularlo
        promedioRIR: sesiones[0].avg_rir || 0,
        volumenSemanal: 45 // Podrías calcularlo
      },
      progressData: {
        rutinasSemanales,
        wellnessPromedio,
        // Agregar más datos según necesites
      }
    });

  } catch (error) {
    console.error('Error obteniendo resumen de progreso:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el resumen de progreso'
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