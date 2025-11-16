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
  if (value === undefined) return null;
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

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }
    
    if (user.role === 'coach') {
      req.user = {
        coachId: user.userId,
        email: user.email,
        role: user.role
      };
    } else {
      req.user = {
        userId: user.userId,
        email: user.email,
        role: user.role
      };
    }
    
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

    const [users] = await pool.execute(
      'SELECT * FROM Usuario WHERE email = ?',
      [email]
    );

    if (users.length > 0) {
      user = users[0];
      role = 'user';
    } else {
      const [coaches] = await pool.execute(
        'SELECT * FROM Coach WHERE email = ?',
        [email]
      );

      if (coaches.length > 0) {
        user = coaches[0];
        role = 'coach';
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email o contraseña incorrectos'
      });
    }

    const validPassword = await bcrypt.compare(contraseña, user.contraseña);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Email o contraseña incorrectos'
      });
    }

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
    console.error('Error en login:', error);
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


// Vincular hoja de Google Sheets a cliente
app.post('/api/coach/cliente/vincular-hoja', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'coach') {
      return res.status(403).json({ success: false, message: 'Acceso denegado. Solo para coaches.' });
    }

    const { idCliente, sheetUrl } = req.body;
    const idCoach = req.user.coachId;

    const sheetId = extraerSheetId(sheetUrl);
    
    if (!sheetId) {
      return res.status(400).json({ 
        success: false, 
        message: 'URL de Google Sheets no válida' 
      });
    }

    console.log('🔄 Iniciando vinculación para cliente:', idCliente, 'Hoja:', sheetId);

    // Verificar estado de Google Sheets
    try {
      const health = await googleSheets.healthCheck();
      console.log('🔍 Estado de Google Sheets:', health);
      
      if (!health.healthy) {
        return res.status(500).json({
          success: false,
          message: `Problema con Google Sheets: ${health.message}`
        });
      }
    } catch (healthError) {
      console.error('❌ Error en health check:', healthError);
      return res.status(500).json({
        success: false,
        message: 'Error de configuración de Google Sheets.'
      });
    }

    // Leer y procesar la hoja con enfoque simplificado
    try {
      console.log('🔍 Leyendo hoja con enfoque simplificado...');
      
      const rawData = await googleSheets.readAnySheet(sheetId, '4 semanas');
      console.log('✅ Datos crudos leídos, filas:', rawData.length);
      
      if (!rawData || rawData.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'No se encontraron datos en la pestaña "4 semanas".' 
        });
      }

      const rutinaProcesada = procesarRutinaColumnasFijas(rawData);
      console.log('✅ Ejercicios procesados:', rutinaProcesada.ejercicios.length);
      
      if (rutinaProcesada.ejercicios.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'No se encontraron ejercicios. Verifica que las columnas C-I tengan datos.' 
        });
      }

      // Guardar en base de datos
      const [result] = await pool.execute(
        `INSERT INTO HojasClientes (id_cliente, id_coach, id_hoja_google, nombre_hoja) 
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         id_hoja_google = VALUES(id_hoja_google),
         nombre_hoja = VALUES(nombre_hoja),
         activa = TRUE,
         ultima_sincronizacion = NOW()`,
        [idCliente, idCoach, sheetId, `Hoja_${idCliente}`]
      );

      // Guardar en cache
      await pool.execute(
        `INSERT INTO CacheRutinas (id_cliente, datos_rutina) 
         VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE datos_rutina = VALUES(datos_rutina), fecha_actualizacion = NOW()`,
        [idCliente, JSON.stringify(rutinaProcesada)]
      );

      res.json({ 
        success: true, 
        message: '✅ Hoja vinculada correctamente', 
        idMapping: result.insertId,
        sheetId: sheetId,
        ejerciciosProcesados: rutinaProcesada.ejercicios.length
      });

    } catch (googleError) {
      console.error('❌ Error procesando hoja:', googleError.message);
      
      let errorMessage = `Error de Google Sheets: ${googleError.message}`;
      
      if (googleError.message.includes('PERMISSION_DENIED')) {
        errorMessage += `\n\n🔧 SOLUCIÓN: Comparte la hoja con: rayostrength-sheets@rayostrength-434a7.iam.gserviceaccount.com`;
      } else if (googleError.message.includes('NOT_FOUND')) {
        errorMessage += '\n\n🔧 SOLUCIÓN: Verifica que exista la pestaña "4 semanas"';
      }
      
      return res.status(403).json({ 
        success: false, 
        message: errorMessage
      });
    }

  } catch (error) {
    console.error('❌ Error general vinculando hoja:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor: ' + error.message 
    });
  }
});

// Procesamiento con columnas fijas
function procesarRutinaColumnasFijas(rawData) {
  if (!rawData || rawData.length < 2) {
    return { ejercicios: [], metadata: { totalEjercicios: 0 } };
  }

  const ejercicios = [];
  
  console.log('🔍 Procesando con columnas fijas...');
  console.log('📊 Total de filas:', rawData.length);

  // ENFOQUE SIMPLIFICADO: Columnas fijas
  // Columna C: Grupo muscular (índice 2)
  // Columna D: Ejercicio (índice 3)
  // Columna E: Video (índice 4)
  // Columna F: Sets (índice 5)
  // Columna G: Reps (índice 6)
  // Columna H: RIR (índice 7)
  // Columna I: Descanso (índice 8)

  // Buscar dónde empiezan los datos reales
  let startRow = 1; // Por defecto después de encabezados
  
  for (let i = 1; i < Math.min(10, rawData.length); i++) {
    const row = rawData[i];
    if (row && row.length >= 4 && row[3]) {
      const ejercicio = row[3].toString().toLowerCase();
      if (ejercicio.includes('squat') || ejercicio.includes('press') || ejercicio.includes('pull')) {
        startRow = i;
        break;
      }
    }
  }

  console.log('📝 Datos empiezan en fila:', startRow + 1);

  for (let i = startRow; i < rawData.length; i++) {
    const row = rawData[i];
    
    if (!row || row.length < 9) continue;

    const grupoMuscular = row[2];  // Columna C
    const nombreEjercicio = row[3]; // Columna D
    const video = row[4];          // Columna E
    const series = row[5];         // Columna F
    const reps = row[6];           // Columna G
    const rir = row[7];            // Columna H
    const descanso = row[8];       // Columna I

    if (!nombreEjercicio || nombreEjercicio.toString().trim() === '') continue;

    const nombreLimpio = nombreEjercicio.toString().trim();
    if (nombreLimpio.toUpperCase().includes('EXERCISE') || nombreLimpio.includes('**')) continue;

    const ejercicio = {
      grupoMuscular: limpiarTexto(grupoMuscular) || 'General',
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

  return {
    ejercicios,
    metadata: {
      totalEjercicios: ejercicios.length,
      gruposMusculares: [...new Set(ejercicios.map(e => e.grupoMuscular))],
      fechaProcesamiento: new Date().toISOString()
    }
  };
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

// Obtener rutina personalizada de un cliente
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
        const [cache] = await pool.execute(
          `SELECT datos_rutina FROM CacheRutinas 
           WHERE id_cliente = ? 
           ORDER BY fecha_actualizacion DESC LIMIT 1`,
          [idCliente]
        );

        if (cache.length > 0) {
          return res.json({
            personalizada: true,
            coach: `${hojas[0].coach_nombre} ${hojas[0].coach_apellido}`,
            hojaVinculada: true,
            ultimaSincronizacion: hojas[0].ultima_sincronizacion,
            rutina: JSON.parse(cache[0].datos_rutina)
          });
        }
      }

      // Fallback a rutina general
      try {
        const data = await googleSheets.readSheet('Rayostrenght');
        const rutinaGeneral = transformSheetDataToRutinas(data);

        res.json({
          personalizada: false,
          hojaVinculada: false,
          rutina: rutinaGeneral
        });
      } catch (sheetError) {
        res.json({
          personalizada: false,
          hojaVinculada: false,
          rutina: []
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
      message: 'Error al obtener la rutina'
    });
  }
});

// Sincronizar rutina desde Google Sheets
async function sincronizarRutinaDesdeSheets(idCliente, sheetId) {
  try {
    const rawData = await googleSheets.readAnySheet(sheetId, '4 semanas');
    const rutinaProcesada = procesarRutinaColumnasFijas(rawData);
    
    await pool.execute(
      `INSERT INTO CacheRutinas (id_cliente, datos_rutina) 
       VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE datos_rutina = VALUES(datos_rutina), fecha_actualizacion = NOW()`,
      [idCliente, JSON.stringify(rutinaProcesada)]
    );

    await pool.execute(
      `UPDATE HojasClientes SET ultima_sincronizacion = NOW() WHERE id_cliente = ? AND activa = TRUE`,
      [idCliente]
    );

    console.log(`✅ Rutina sincronizada para cliente ${idCliente}`);
  } catch (error) {
    console.error('Error sincronizando rutina:', error);
    throw error;
  }
}

function extraerSheetId(url) {
  if (!url) return null;
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

// Endpoint de debug
app.get('/api/debug/sheets-simple', authenticateToken, async (req, res) => {
  try {
    const { sheetUrl } = req.query;
    
    if (!sheetUrl) {
      return res.status(400).json({ error: 'sheetUrl parameter required' });
    }

    const sheetId = extraerSheetId(sheetUrl);
    const health = await googleSheets.healthCheck();
    const rawData = await googleSheets.readAnySheet(sheetId, '4 semanas');
    const rutinaProcesada = procesarRutinaColumnasFijas(rawData);
    
    res.json({
      success: true,
      sheetId: sheetId,
      health: health,
      rawRows: rawData.length,
      ejerciciosCount: rutinaProcesada.ejercicios.length,
      primerosEjercicios: rutinaProcesada.ejercicios.slice(0, 3),
      message: '✅ Enfoque simplificado funcionando'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
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

startServer();