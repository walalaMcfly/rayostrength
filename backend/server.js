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

const sanitizeParams = (params) => {
  return params.map(param => {
    if (param === undefined) {
      console.warn('⚠️ Se detectó undefined, convirtiendo a null');
      return null;
    }
    return param;
  });
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

app.get('/api/coach/notas', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'coach') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Solo para coaches.'
      });
    }

    res.json({
      success: true,
      notas: [
        {
          id_nota: 1,
          mensaje: "Bienvenido al panel de coach",
          fecha_creacion: new Date().toISOString(),
          leido: false
        }
      ]
    });

  } catch (error) {
    console.error('Error obteniendo notas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

app.get('/api/debug/rutinas/:semana', async (req, res) => {
  try {
    const { semana } = req.params;
    const health = await googleSheets.healthCheck();
    const data = await googleSheets.readSheet(semana);
    const rutinas = transformSheetDataToRutinas(data);

    res.json({
      success: true,
      message: '✅ DEBUG - Todo funciona correctamente',
      health: health,
      data_raw: data,
      rutinas: rutinas
    });
    
  } catch (error) {
    console.error('Error en debug:', error);
    res.status(500).json({
      success: false,
      message: 'Error en debug',
      error: error.message,
      stack: error.stack
    });
  }
});

app.get('/api/test-rutinas/:semana', async (req, res) => {
  try {
    const { semana } = req.params;
    const data = await googleSheets.readSheet(semana);
    
    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron datos en la hoja'
      });
    }
    
    const rutinas = transformSheetDataToRutinas(data);
    
    res.json({
      success: true,
      rutinas: rutinas
    });
    
  } catch (error) {
    console.error('Error obteniendo rutinas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las rutinas',
      error: error.message,
      sheet: req.params.semana
    });
  }
});

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

    const [result] = await pool.execute(
      `INSERT INTO ProgresoRutinas 
       (id_usuario, id_ejercicio, nombre_ejercicio, fecha, sets_completados, reps_logradas, peso_utilizado, rir_final, rpe_final, notas)
       VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?)`,
      [userId, id_ejercicio, nombre_ejercicio, sets_completados, reps_logradas, peso_utilizado, rir_final, rpe_final, notas]
    );

    res.json({
      success: true,
      message: 'Progreso del ejercicio guardado correctamente',
      id_progreso: result.insertId
    });

  } catch (error) {
    console.error('Error guardando progreso de ejercicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar el progreso del ejercicio'
    });
  }
});

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

app.post('/api/progreso/actualizar-ejercicio', authenticateToken, async (req, res) => {
  try {
    const { id_ejercicio, peso_utilizado, reps_logradas } = req.body;
    const userId = req.user.userId;

    if (!id_ejercicio) {
      return res.status(400).json({ 
        success: false,
        error: 'ID de ejercicio requerido' 
      });
    }

    const safeValue = (value) => {
      if (value === undefined || value === null) return null;
      if (typeof value === 'string' && value.trim() === '') return null;
      return value;
    };

    const pesoVal = safeValue(peso_utilizado);
    const repsVal = safeValue(reps_logradas);

    const query = `
      INSERT INTO ProgresoRutinas 
      (id_usuario, id_ejercicio, peso_utilizado, reps_logradas, fecha)
      VALUES (?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE 
      peso_utilizado = VALUES(peso_utilizado), 
      reps_logradas = VALUES(reps_logradas),
      fecha = NOW()
    `;

    const [result] = await pool.execute(query, [
      userId,
      id_ejercicio,
      pesoVal,
      repsVal
    ]);

    res.json({ 
      success: true, 
      message: 'Progreso guardado correctamente',
      id: result.insertId 
    });

  } catch (error) {
    console.error('Error en progreso:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

app.get('/api/progreso/datos-reales', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

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

    const resumen = {
      rutinasCompletadas: sesionesCompletadas[0]?.total || 0,
      promedioCompletitud: Math.round(sesionesCompletadas[0]?.promedio_completitud || 0),
      rpePromedio: Math.round(sesionesCompletadas[0]?.rpe_promedio || 0),
      rirPromedio: Math.round(sesionesCompletadas[0]?.rir_promedio || 0),
      wellnessPromedio: Math.round(
        (wellnessPromedio[0]?.energia + 
         wellnessPromedio[0]?.sueno + 
         (10 - wellnessPromedio[0]?.estres) +
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
      volumenEntrenamiento: rutinasSemanales.map(r => r.cantidad * 100).reverse()
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

app.post('/api/progreso/ejercicio', authenticateToken, async (req, res) => {
  try {
    const { id_ejercicio, nombre_ejercicio, sets_completados, reps_logradas, peso_utilizado, rir_final, rpe_final, notas } = req.body;
    const userId = req.user.userId;

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

app.post('/api/progreso/sesion', authenticateToken, async (req, res) => {
  try {
    const { semana_rutina, total_ejercicios, ejercicios_completados, duracion_total_minutos, volumen_total, rpe_promedio, rir_promedio, notas_usuario } = req.body;
    const userId = req.user.userId;

    const porcentaje_completitud = (ejercicios_completados / total_ejercicios) * 100;

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

  // Buscar dónde empiezan los datos reales (saltar headers)
  let startRow = 1;
  for (let i = 1; i < Math.min(10, rawData.length); i++) {
    const row = rawData[i];
    if (row && row.length >= 4) {
      const grupoMuscular = (row[2] || '').toString().trim();
      const nombreEjercicio = (row[3] || '').toString().trim();
      
      // Si encontramos datos válidos en grupo muscular y ejercicio, empezamos aquí
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

    // 🎯 COLUMNAS CORRECTAS:
    // C: Grupo muscular (índice 2)
    // D: Ejercicio (índice 3) 
    // E: Video (índice 4)
    // F: Series (índice 5)
    // G: Reps (índice 6)
    // H: RIR (índice 7)
    // I: Descanso (índice 8)

    const grupoMuscular = safeSQLValue(row[2]);        // Columna C
    const nombreEjercicio = safeSQLValue(row[3]);      // Columna D
    const video = safeSQLValue(row[4]);               // Columna E
    const series = safeSQLValue(row[5]);              // Columna F
    const reps = safeSQLValue(row[6]);                // Columna G
    const rir = safeSQLValue(row[7]);                 // Columna H
    const descanso = safeSQLValue(row[8]);            // Columna I

    // Validar que tenemos un ejercicio
    if (!nombreEjercicio || nombreEjercicio.toString().trim() === '') continue;

    const nombreLimpio = nombreEjercicio.toString().trim();
    
    // Saltar filas que son headers o vacías
    if (nombreLimpio.toUpperCase().includes('EXERCISE') || 
        nombreLimpio.includes('**') ||
        nombreLimpio.toLowerCase().includes('ejercicio') ||
        nombreLimpio === '') {
      continue;
    }

    // 🎯 CREAR EJERCICIO CON GRUPO MUSCULAR MEJORADO
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

    console.log(`📝 Ejercicio ${i}:`, {
      grupo: ejercicio.grupoMuscular,
      nombre: ejercicio.nombre,
      series: ejercicio.series
    });

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
  
  // Convertir a formato consistente (primera letra mayúscula, resto minúsculas)
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
          // ✅ SIEMPRE LEER DIRECTAMENTE DE GOOGLE SHEETS
          const rawData = await googleSheets.readAnySheet(sheetId, '4 semanas');
          const rutinaProcesada = procesarRutinaColumnasFijas(rawData);
          
          console.log('✅ Datos actualizados desde Google Sheets. Ejercicios:', rutinaProcesada.ejercicios.length);

          // ✅ ACTUALIZAR EL CACHE (para futuras consultas rápidas)
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
            ultimaSincronizacion: new Date().toISOString(), // ✅ FECHA ACTUAL
            rutina: rutinaProcesada,
            fuente: 'google_sheets_directo' // ✅ PARA DEBUG
          });

        } catch (googleError) {
          console.error('❌ Error leyendo Google Sheets, usando cache:', googleError);
          
          // ✅ FALLBACK AL CACHE SI GOOGLE SHEETS FALLA
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
                fuente: 'cache_fallback' // ✅ PARA DEBUG
              });
            } catch (parseError) {
              console.error('❌ Error con cache también:', parseError);
            }
          }
        }
      }

      // ✅ FALLBACK A RUTINA GENERAL SI NO HAY HOJA VINCULADA
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

function extraerSheetId(url) {
  if (!url) return null;
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

app.get('/api/debug/token-info', authenticateToken, (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    try {
      const decoded = jwt.decode(token);
      res.json({
        tokenDecoded: decoded,
        userFromMiddleware: req.user,
        message: '✅ Token decodificado correctamente'
      });
    } catch (error) {
      res.json({
        error: 'No se pudo decodificar el token',
        token: token.substring(0, 50) + '...'
      });
    }
  } else {
    res.status(401).json({ error: 'No hay token' });
  }
});

app.get('/api/debug/coaches-detailed', async (req, res) => {
  try {
    const [coaches] = await pool.execute(
      `SELECT id_coach, nombre, apellido, email, especialidad 
       FROM Coach`
    );
    
    res.json({
      totalCoaches: coaches.length,
      coaches: coaches
    });
  } catch (error) {
    console.error('Error obteniendo coaches:', error);
    res.status(500).json({ error: error.message });
  }
});

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

// Diagnosticar cache actual
app.get('/api/debug/ver-cache-cliente/:idCliente', authenticateToken, async (req, res) => {
  try {
    const { idCliente } = req.params;

    const [cache] = await pool.execute(
      `SELECT datos_rutina, fecha_actualizacion FROM CacheRutinas 
       WHERE id_cliente = ? 
       ORDER BY fecha_actualizacion DESC LIMIT 1`,
      [idCliente]
    );

    if (cache.length === 0) {
      return res.json({ 
        success: true, 
        message: 'No hay cache para este cliente', 
        cache: null 
      });
    }

    const cacheData = cache[0];
    
    // Analizar el contenido
    let contenidoAnalizado = 'No se pudo analizar';
    let esJSONValido = false;
    
    try {
      if (typeof cacheData.datos_rutina === 'string') {
        JSON.parse(cacheData.datos_rutina);
        contenidoAnalizado = 'JSON válido';
        esJSONValido = true;
      } else {
        contenidoAnalizado = `Tipo: ${typeof cacheData.datos_rutina}`;
      }
    } catch (e) {
      contenidoAnalizado = 'JSON INVÁLIDO: ' + e.message;
    }
    
    res.json({
      success: true,
      cache: {
        tipo: typeof cacheData.datos_rutina,
        contenido: cacheData.datos_rutina,
        longitud: cacheData.datos_rutina ? cacheData.datos_rutina.length : 0,
        fecha: cacheData.fecha_actualizacion,
        analisis: contenidoAnalizado,
        esJSONValido: esJSONValido
      }
    });

  } catch (error) {
    console.error('Error diagnosticando cache:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para reparar cache corrupto
app.post('/api/debug/reparar-cache-cliente/:idCliente', authenticateToken, async (req, res) => {
  try {
    const { idCliente } = req.params;

    if (req.user.role !== 'coach') {
      return res.status(403).json({ success: false, message: 'Solo coaches pueden reparar cache' });
    }

    // Obtener la hoja vinculada
    const [hojas] = await pool.execute(
      `SELECT id_hoja_google FROM HojasClientes WHERE id_cliente = ? AND activa = TRUE`,
      [idCliente]
    );

    if (hojas.length === 0) {
      return res.status(404).json({ success: false, message: 'No hay hoja vinculada para este cliente' });
    }

    const sheetId = hojas[0].id_hoja_google;

    console.log('🔧 Reparando cache para cliente:', idCliente, 'Sheet:', sheetId);

    // Reprocesar la hoja
    const rawData = await googleSheets.readAnySheet(sheetId, '4 semanas');
    const rutinaProcesada = procesarRutinaColumnasFijas(rawData);

    // ✅ Asegurar que se guarda como JSON string válido
    const datosRutinaJSON = JSON.stringify(rutinaProcesada);
    
    console.log('💾 Guardando JSON en cache:', typeof datosRutinaJSON);
    console.log('💾 Longitud del JSON:', datosRutinaJSON.length);
    console.log('💾 Ejercicios procesados:', rutinaProcesada.ejercicios.length);

    const [result] = await pool.execute(
      `INSERT INTO CacheRutinas (id_cliente, datos_rutina) 
       VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE 
       datos_rutina = VALUES(datos_rutina), 
       fecha_actualizacion = NOW()`,
      [idCliente, datosRutinaJSON]
    );

    console.log('✅ Cache reparado para cliente:', idCliente);

    res.json({
      success: true,
      message: 'Cache reparado correctamente',
      ejerciciosProcesados: rutinaProcesada.ejercicios.length,
      cacheActualizado: result.affectedRows
    });

  } catch (error) {
    console.error('Error reparando cache:', error);
    res.status(500).json({
      success: false,
      message: 'Error reparando cache: ' + error.message
    });
  }
});

app.get('/api/debug/rutina-completa/:idCliente', authenticateToken, async (req, res) => {
  try {
    const { idCliente } = req.params;
    
    console.log('🔍 INICIANDO DEBUG RUTINA CLIENTE:', idCliente);
    console.log('👤 Usuario solicitante:', req.user);
    const [hojas] = await pool.execute(
      `SELECT hc.*, c.nombre as coach_nombre, c.apellido as coach_apellido 
       FROM HojasClientes hc
       JOIN Coach c ON hc.id_coach = c.id_coach
       WHERE hc.id_cliente = ? AND hc.activa = TRUE`,
      [idCliente]
    );

    console.log('📄 Hojas vinculadas encontradas:', hojas.length);

    if (hojas.length > 0) {
      console.log('✅ Hoja vinculada:', hojas[0]);

      const [cache] = await pool.execute(
        `SELECT datos_rutina, fecha_actualizacion FROM CacheRutinas 
         WHERE id_cliente = ? 
         ORDER BY fecha_actualizacion DESC LIMIT 1`,
        [idCliente]
      );

      console.log('💾 Cache encontrado:', cache.length);

      if (cache.length > 0) {
        console.log('📦 Cache fecha:', cache[0].fecha_actualizacion);
        
        let rutinaData;
        try {
          if (typeof cache[0].datos_rutina === 'string') {
            rutinaData = JSON.parse(cache[0].datos_rutina);
          } else {
            rutinaData = cache[0].datos_rutina;
          }
          console.log('✅ JSON parseado correctamente');
          console.log('📊 Ejercicios en cache:', rutinaData.ejercicios?.length || 0);
        } catch (error) {
          console.error('❌ Error parseando cache:', error);
          rutinaData = { ejercicios: [], metadata: { error: 'JSON corrupto' } };
        }

        return res.json({
          success: true,
          source: 'cache',
          personalizada: true,
          coach: `${hojas[0].coach_nombre} ${hojas[0].coach_apellido}`,
          hojaVinculada: true,
          ultimaSincronizacion: hojas[0].ultima_sincronizacion,
          rutina: rutinaData,
          debug: {
            ejerciciosCount: rutinaData.ejercicios?.length || 0,
            cacheType: typeof cache[0].datos_rutina,
            cacheLength: cache[0].datos_rutina?.length || 0
          }
        });
      }
    }

    console.log('🔄 Usando rutina general (fallback)');
    try {
      const data = await googleSheets.readSheet('Rayostrenght');
      const rutinaGeneral = transformSheetDataToRutinas(data);
      
      console.log('📊 Rutina general ejercicios:', rutinaGeneral.length);

      res.json({
        success: true,
        source: 'general',
        personalizada: false,
        hojaVinculada: false,
        rutina: rutinaGeneral,
        debug: {
          ejerciciosCount: rutinaGeneral.length,
          sheetDataRows: data?.length || 0
        }
      });
    } catch (sheetError) {
      console.error('❌ Error con rutina general:', sheetError);
      res.json({
        success: true,
        source: 'empty',
        personalizada: false,
        hojaVinculada: false,
        rutina: [],
        debug: {
          error: sheetError.message
        }
      });
    }

  } catch (error) {
    console.error('❌ Error en debug rutina:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});


app.post('/api/debug/reparar-grupos-musculares/:idCliente', authenticateToken, async (req, res) => {
  try {
    const { idCliente } = req.params;

    if (req.user.role !== 'coach') {
      return res.status(403).json({ success: false, message: 'Solo coaches pueden reparar rutinas' });
    }

    // Obtener la hoja vinculada
    const [hojas] = await pool.execute(
      `SELECT id_hoja_google FROM HojasClientes WHERE id_cliente = ? AND activa = TRUE`,
      [idCliente]
    );

    if (hojas.length === 0) {
      return res.status(404).json({ success: false, message: 'No hay hoja vinculada para este cliente' });
    }

    const sheetId = hojas[0].id_hoja_google;

    console.log('🔧 Reparando grupos musculares para cliente:', idCliente);

    // Reprocesar la hoja con la función corregida
    const rawData = await googleSheets.readAnySheet(sheetId, '4 semanas');
    const rutinaProcesada = procesarRutinaColumnasFijas(rawData);

    // Guardar en cache
    const datosRutinaJSON = JSON.stringify(rutinaProcesada);
    
    const [result] = await pool.execute(
      `INSERT INTO CacheRutinas (id_cliente, datos_rutina) 
       VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE 
       datos_rutina = VALUES(datos_rutina), 
       fecha_actualizacion = NOW()`,
      [idCliente, datosRutinaJSON]
    );

    console.log('✅ Grupos musculares reparados para cliente:', idCliente);

    res.json({
      success: true,
      message: 'Grupos musculares reparados correctamente',
      ejerciciosProcesados: rutinaProcesada.ejercicios.length,
      gruposMusculares: rutinaProcesada.metadata.gruposMusculares
    });

  } catch (error) {
    console.error('Error reparando grupos musculares:', error);
    res.status(500).json({
      success: false,
      message: 'Error reparando grupos musculares: ' + error.message
    });
  }
});


app.post('/api/rutinas/sincronizar/:idCliente', authenticateToken, async (req, res) => {
  try {
    const { idCliente } = req.params;

    if (req.user.role !== 'coach' && req.user.userId != idCliente) {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permisos para sincronizar esta rutina' 
      });
    }

    console.log('🔄 Sincronización manual solicitada para cliente:', idCliente);

    const [hojas] = await pool.execute(
      `SELECT hc.*, c.nombre as coach_nombre, c.apellido as coach_apellido 
       FROM HojasClientes hc
       JOIN Coach c ON hc.id_coach = c.id_coach
       WHERE hc.id_cliente = ? AND hc.activa = TRUE`,
      [idCliente]
    );

    if (hojas.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No hay hoja vinculada para este cliente' 
      });
    }

    const sheetId = hojas[0].id_hoja_google;
    
    // Leer directamente de Google Sheets
    const rawData = await googleSheets.readAnySheet(sheetId, '4 semanas');
    const rutinaProcesada = procesarRutinaColumnasFizas(rawData);
    
    // Actualizar cache
    const datosRutinaJSON = JSON.stringify(rutinaProcesada);
    await pool.execute(
      `INSERT INTO CacheRutinas (id_cliente, datos_rutina) 
       VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE 
       datos_rutina = VALUES(datos_rutina), 
       fecha_actualizacion = NOW()`,
      [idCliente, datosRutinaJSON]
    );

    // Actualizar fecha en HojasClientes
    await pool.execute(
      `UPDATE HojasClientes SET ultima_sincronizacion = NOW() WHERE id_cliente = ?`,
      [idCliente]
    );

    console.log('✅ Sincronización manual completada. Ejercicios:', rutinaProcesada.ejercicios.length);

    res.json({
      success: true,
      message: 'Rutina sincronizada correctamente',
      ejerciciosProcesados: rutinaProcesada.ejercicios.length,
      ultimaSincronizacion: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en sincronización manual:', error);
    res.status(500).json({
      success: false,
      message: 'Error sincronizando rutina: ' + error.message
    });
  }
});

startServer();