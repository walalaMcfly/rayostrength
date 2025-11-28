const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const adminRoutes = require('./admin');
const { pool, createTables, testConnection } = require('./config/database');
const googleSheets = require('./config/googleSheets');

let sgMail = null;
let sendgridAvailable = false;

try {
  require.resolve('@sendgrid/mail');
  sgMail = require('@sendgrid/mail');
  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    sendgridAvailable = true;
  }
} catch (error) {
  console.log('SendGrid no disponible - Usando modo logs');
}

const app = express();
const PORT = process.env.PORT || 8081;

const safeSQLValue = (value) => {
  if (value === undefined || value === null) return null;
  if (value === '') return null;
  return value;
};

function generarTokenVerificacion() {
  return require('crypto').randomBytes(32).toString('hex');
}

async function enviarEmailVerificacion(email, token) {
  const enlaceVerificacion = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verificar-cuenta?token=${token}`;
  
  console.log('VERIFICACION REQUERIDA:');
  console.log('Usuario:', email);
  console.log('Enlace:', enlaceVerificacion);
  console.log('Token:', token);
  
  if (sendgridAvailable && sgMail) {
    const msg = {
      to: email,
      from: {
        email: process.env.FROM_EMAIL || 'noreply@rayostrength.com',
        name: 'RayoStrength'
      },
      subject: 'Verifica tu cuenta - RayoStrength',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { color: #007AFF; font-size: 24px; font-weight: bold; }
            .button { display: inline-block; background: #007AFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">RayoStrength</div>
              <h2>¡Bienvenido a RayoStrength!</h2>
            </div>
            
            <p>Hola,</p>
            <p>Para activar tu cuenta y comenzar tu journey fitness, haz clic en el siguiente botón:</p>
            
            <div style="text-align: center;">
              <a href="${enlaceVerificacion}" class="button">Verificar Mi Cuenta</a>
            </div>
            
            <p>O copia y pega este enlace en tu navegador:</p>
            <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 5px;">
              ${enlaceVerificacion}
            </p>
            
            <p><strong>Este enlace expirará en 24 horas.</strong></p>
            
            <p>Si no creaste esta cuenta, puedes ignorar este mensaje.</p>
            
            <div class="footer">
              <p>© 2024 RayoStrength. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await sgMail.send(msg);
      console.log('Email de verificación enviado a:', email);
      return true;
    } catch (error) {
      console.error('Error enviando email:', error);
      return false;
    }
  } else {
    console.log('Email no enviado - SendGrid no configurado');
    return true;
  }
}

app.use(cors({
  origin: [
    "https://rayostrength-production.up.railway.app",
    "http://localhost:3000",
    "https://localhost:3000",
    "http://localhost:5173",
    "https://localhost:5173",
    "http://localhost:8081", 
    "http://127.0.0.1:8081", 
    "http://0.0.0.0:8081"    
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization','Accept']
}));

app.use('/api/admin', adminRoutes)

app.use(express.json());

app.get('/api/health-complete', (req, res) => {
  res.json({
    status: 'online',
    sendgrid: sendgridAvailable ? 'active' : 'inactive',
    database: 'connected',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/debug/check-coach', async (req, res) => {
  try {
    const email = 'carlos.coach@rayostrength.com';
    
    const [coaches] = await pool.execute(
      'SELECT id_coach, email, contraseña, LENGTH(contraseña) as pass_length FROM Coach WHERE email = ?',
      [email]
    );
    
    if (coaches.length === 0) {
      return res.json({
        success: false,
        message: 'Coach no encontrado'
      });
    }
    
    const coach = coaches[0];
    const isBcryptHash = coach.contraseña && coach.contraseña.startsWith('$2');
    
    res.json({
      success: true,
      coach: {
        id: coach.id_coach,
        email: coach.email,
        password_length: coach.pass_length,
        is_bcrypt_hash: isBcryptHash,
        hash_prefix: coach.contraseña ? coach.contraseña.substring(0, 20) + '...' : 'null'
      }
    });
    
  } catch (error) {
    console.error('Error en debug coach:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

app.post('/api/debug/reset-coach-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email y nueva contraseña requeridos'
      });
    }
    
    console.log('Reseteando contraseña para:', email);
    
    const [coaches] = await pool.execute(
      'SELECT * FROM Coach WHERE email = ?',
      [email]
    );
    
    if (coaches.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Coach no encontrado'
      });
    }
    
    const coach = coaches[0];
    console.log('Hash actual:', coach.contraseña);
    
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    console.log('Nuevo hash generado:', hashedPassword);
    
    await pool.execute(
      'UPDATE Coach SET contraseña = ? WHERE email = ?',
      [hashedPassword, email]
    );
    
    res.json({
      success: true,
      message: 'Contraseña reseteada exitosamente',
      email: email
    });
    
  } catch (error) {
    console.error('Error reseteando contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

app.get('/', (req, res) => {
  res.json({ 
    status: 'Backend Rayostrength funcionando',
    service: 'Rayostrength API',
    timestamp: new Date().toISOString(),
    domain: 'rayostrength-production.up.railway.app'
  });
});

app.get('/api/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({ 
    message: 'Backend funcionando',
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
      console.log('JWT Verification Error:', err);
      return res.status(403).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }
    
    console.log('JWT Decoded:', decoded);
    
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
    
    console.log('User object final:', req.user);
    next();
  });
};

const verificarCuentaActivada = (req, res, next) => {
  if (req.user.role === 'user') {
    pool.execute(
      'SELECT verificado FROM Usuario WHERE id_usuario = ?',
      [req.user.userId]
    ).then(([users]) => {
      if (users.length > 0 && !users[0].verificado) {
        return res.status(403).json({
          success: false,
          message: 'Cuenta no verificada. Por favor verifica tu correo electrónico.',
          requiereVerificacion: true
        });
      }
      next();
    }).catch(error => {
      console.error('Error verificando cuenta:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    });
  } else {
    next();
  }
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
    const tokenVerificacion = generarTokenVerificacion();
    const expiracionToken = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [result] = await pool.execute(
      `INSERT INTO Usuario (nombre, apellido, email, contraseña, edad, sexo, peso_actual, altura, verificado, token_verificacion, expiracion_token) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, FALSE, ?, ?)`,
      [nombre, apellido, email, hashedPassword, edad, sexo, peso_actual || null, altura || null, tokenVerificacion, expiracionToken]
    );

    await enviarEmailVerificacion(email, tokenVerificacion);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado. Por favor verifica tu correo electrónico.',
      requiereVerificacion: true
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

app.post('/api/auth/registro-con-verificacion', async (req, res) => {
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
    const tokenVerificacion = generarTokenVerificacion();
    const expiracionToken = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [result] = await pool.execute(
      `INSERT INTO Usuario (nombre, apellido, email, contraseña, edad, sexo, peso_actual, altura, verificado, token_verificacion, expiracion_token) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, FALSE, ?, ?)`,
      [nombre, apellido, email, hashedPassword, edad, sexo, peso_actual || null, altura || null, tokenVerificacion, expiracionToken]
    );

    await enviarEmailVerificacion(email, tokenVerificacion);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado. Por favor verifica tu correo electrónico.',
      requiereVerificacion: true
    });

  } catch (error) {
    console.error('Error en registro con verificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

app.get('/api/auth/verificar', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token de verificación requerido'
      });
    }

    const [users] = await pool.execute(
      'SELECT id_usuario, expiracion_token FROM Usuario WHERE token_verificacion = ? AND verificado = FALSE',
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido o cuenta ya verificada'
      });
    }

    const user = users[0];

    if (new Date() > user.expiracion_token) {
      return res.status(400).json({
        success: false,
        message: 'El token ha expirado'
      });
    }

    await pool.execute(
      'UPDATE Usuario SET verificado = TRUE, token_verificacion = NULL, expiracion_token = NULL WHERE id_usuario = ?',
      [user.id_usuario]
    );

    res.json({
      success: true,
      message: 'Cuenta verificada exitosamente. Ya puedes iniciar sesión.'
    });

  } catch (error) {
    console.error('Error en verificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

app.post('/api/auth/reenviar-verificacion', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email requerido'
      });
    }

    const [users] = await pool.execute(
      'SELECT id_usuario, token_verificacion, expiracion_token FROM Usuario WHERE email = ? AND verificado = FALSE',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado o ya verificado'
      });
    }

    const user = users[0];
    const nuevoToken = generarTokenVerificacion();
    const nuevaExpiracion = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.execute(
      'UPDATE Usuario SET token_verificacion = ?, expiracion_token = ? WHERE id_usuario = ?',
      [nuevoToken, nuevaExpiracion, user.id_usuario]
    );
    await enviarEmailVerificacion(email, nuevoToken);

    res.json({
      success: true,
      message: 'Email de verificación reenviado'
    });

  } catch (error) {
    console.error('Error reenviando verificación:', error);
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

    console.log('=== INICIO LOGIN ===');
    console.log('Email:', email);
    console.log('Contraseña longitud:', contraseña.length);

    let user = null;
    let role = 'user';

    const [coaches] = await pool.execute(
      'SELECT * FROM Coach WHERE email = ?',
      [email]
    );

    if (coaches.length > 0) {
      console.log('Coach encontrado');
      user = coaches[0];
      
      role = user.rol || 'coach'; 
      
      console.log('Rol en BD:', user.rol);
      console.log('Rol asignado:', role);
      console.log('Hash en BD:', user.contraseña.substring(0, 20) + '...');
      console.log('Longitud hash:', user.contraseña.length);
      
      console.log('Comparando contraseña...');
      const validPassword = await bcrypt.compare(contraseña, user.contraseña);
      console.log('Resultado comparación:', validPassword);
      
      if (!validPassword) {
        console.log('Contraseña incorrecta');
        return res.status(401).json({
          success: false,
          message: 'Email o contraseña incorrectos'
        });
      }
      
      console.log('Contraseña válida');
      
    } else {
      const [users] = await pool.execute(
        'SELECT * FROM Usuario WHERE email = ?',
        [email]
      );

      if (users.length > 0) {
        user = users[0];
        role = 'user';
        
        if (!user.verificado) {
          return res.status(401).json({
            success: false,
            message: 'Cuenta no verificada. Por favor verifica tu correo electrónico.',
            requiereVerificacion: true
          });
        }

        const validPassword = await bcrypt.compare(contraseña, user.contraseña);
        if (!validPassword) {
          return res.status(401).json({
            success: false,
            message: 'Email o contraseña incorrectos'
          });
        }
      }
    }

    if (!user) {
      console.log('Usuario no encontrado');
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
        role: role
      };
    } 

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('LOGIN EXITOSO');
    console.log('Token payload:', tokenPayload);
    console.log('=== FIN LOGIN ===');

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
          role: 'user',
          verificado: user.verificado
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
          role: role
        }
      });
    }

  } catch (error) {
    console.error('ERROR EN LOGIN:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor: ' + error.message
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
        id_ejercicio,
        MAX(CAST(REPLACE(REPLACE(peso_utilizado, 'kg', ''), ' ', '') AS DECIMAL)) as peso_maximo,
        MAX(fecha) as fecha_ultimo
       FROM ProgresoRutinas 
       WHERE id_usuario = ? 
         AND peso_utilizado IS NOT NULL 
         AND peso_utilizado != ''
         AND peso_utilizado != '0'
       GROUP BY id_ejercicio
       ORDER BY peso_maximo DESC
       LIMIT 6`,
      [idCliente]
    );

    const [ejerciciosRecientes] = await pool.execute(
      `SELECT 
        id_ejercicio,
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

app.post('/api/rutinas/sincronizar/:idCliente', authenticateToken, verificarCuentaActivada, async (req, res) => {
  try {
    const { idCliente } = req.params;

    if (req.user.role !== 'user' || req.user.userId != idCliente) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para sincronizar esta rutina'
      });
    }

    const [hojas] = await pool.execute(
      `SELECT hc.*, c.nombre as coach_nombre, c.apellido as coach_apellido 
       FROM HojasClientes hc
       JOIN Coach c ON hc.id_coach = c.id_coach
       WHERE hc.id_cliente = ? AND hc.activa = TRUE`,
      [idCliente]
    );

    if (hojas.length === 0) {
      return res.json({
        success: true,
        message: 'No hay hoja vinculada para sincronizar',
        sincronizado: false
      });
    }

    const sheetId = hojas[0].id_hoja_google;
    const rawData = await googleSheets.readAnySheet(sheetId, '4 semanas');
    const rutinaProcesada = procesarRutinaColumnasFijas(rawData);

    const datosRutinaJSON = JSON.stringify(rutinaProcesada);
    await pool.execute(
      `INSERT INTO CacheRutinas (id_cliente, datos_rutina) 
       VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE 
       datos_rutina = VALUES(datos_rutina), 
       fecha_actualizacion = NOW()`,
      [idCliente, datosRutinaJSON]
    );

    await pool.execute(
      'UPDATE HojasClientes SET ultima_sincronizacion = NOW() WHERE id_cliente = ?',
      [idCliente]
    );

    res.json({
      success: true,
      message: 'Rutina sincronizada correctamente',
      sincronizado: true,
      ejerciciosActualizados: rutinaProcesada.ejercicios.length,
      fechaSincronizacion: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error sincronizando rutina:', error);
    res.status(500).json({
      success: false,
      message: 'Error al sincronizar la rutina: ' + error.message
    });
  }
});

app.post('/api/wellness/registrar', authenticateToken, verificarCuentaActivada, async (req, res) => {
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

app.post('/api/progreso/registrar-sesion', authenticateToken, verificarCuentaActivada, async (req, res) => {
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

app.get('/api/user/profile', authenticateToken, verificarCuentaActivada, async (req, res) => {
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

app.put('/api/user/profile', authenticateToken, verificarCuentaActivada, async (req, res) => {
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

app.post('/api/coach/cliente/vincular-hoja', authenticateToken, async (req, res) => {
  let connection;
  try {
    console.log('User object recibido:', req.user);
    
    if (req.user.role !== 'coach') {
      return res.status(403).json({ 
        success: false, 
        message: 'Acceso denegado. Solo para coaches.' 
      });
    }

    const { idCliente, sheetUrl } = req.body;
    const idCoach = req.user.coachId;

    console.log('Datos recibidos:', { idCliente, sheetUrl, idCoach });

    if (!idCoach || isNaN(idCoach)) {
      console.log('CoachId inválido:', idCoach);
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
      console.log('Coach no encontrado en BD con id:', idCoach);
      return res.status(404).json({
        success: false,
        message: 'Coach no encontrado en la base de datos'
      });
    }

    console.log('Coach verificado:', coachExists[0]);

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

    console.log('Iniciando vinculación para:', {
      coach: coachExists[0].nombre + ' ' + coachExists[0].apellido,
      cliente: idCliente,
      hoja: sheetId
    });

    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const health = await googleSheets.healthCheck();
      console.log('Google Sheets health:', health);
      
      if (!health.healthy) {
        await connection.rollback();
        return res.status(500).json({
          success: false,
          message: `Problema con Google Sheets: ${health.message}`
        });
      }

      console.log('Leyendo hoja de Google Sheets...');
      const rawData = await googleSheets.readAnySheet(sheetId, '4 semanas');
      console.log('Datos crudos leídos, filas:', rawData.length);
      
      if (!rawData || rawData.length === 0) {
        await connection.rollback();
        return res.status(400).json({ 
          success: false, 
          message: 'No se encontraron datos en la pestaña "4 semanas".' 
        });
      }

      const rutinaProcesada = procesarRutinaColumnasFijas(rawData);
      console.log('Ejercicios procesados:', rutinaProcesada.ejercicios.length);
      
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

      console.log('Parámetros para guardar:', {
        idCliente: safeIdCliente,
        idCoach: safeIdCoach,
        sheetId: safeSheetId,
        nombreHoja: safeNombreHoja
      });

      console.log('Guardando en HojasClientes...');
      const [existing] = await connection.execute(
        'SELECT id_hoja FROM HojasClientes WHERE id_cliente = ?',
        [safeIdCliente]
      );

      let result;
      if (existing.length > 0) {
        [result] = await connection.execute(
          `UPDATE HojasClientes 
           SET id_hoja_google = ?, nombre_hoja = ?, activa = TRUE, ultima_sincronizacion = NOW(), id_coach = ?
           WHERE id_cliente = ?`,
          [safeSheetId, safeNombreHoja, safeIdCoach, safeIdCliente]
        );
        console.log('UPDATE HojasClientes - affectedRows:', result.affectedRows);
      } else {
        [result] = await connection.execute(
          `INSERT INTO HojasClientes (id_cliente, id_coach, id_hoja_google, nombre_hoja, activa, ultima_sincronizacion) 
           VALUES (?, ?, ?, ?, TRUE, NOW())`,
          [safeIdCliente, safeIdCoach, safeSheetId, safeNombreHoja]
        );
        console.log('INSERT HojasClientes - affectedRows:', result.affectedRows, 'insertId:', result.insertId);
      }

      const datosRutinaJSON = JSON.stringify(rutinaProcesada);
      console.log('Guardando en CacheRutinas...');
      
      const [cacheResult] = await connection.execute(
        `INSERT INTO CacheRutinas (id_cliente, datos_rutina) 
         VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE 
         datos_rutina = VALUES(datos_rutina), 
         fecha_actualizacion = NOW()`,
        [safeIdCliente, datosRutinaJSON]
      );

      console.log('Guardado en CacheRutinas');

      await connection.commit();

      res.json({ 
        success: true, 
        message: 'Hoja vinculada correctamente', 
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
      console.error('Error en procesamiento:', googleError);
      
      let errorMessage = `Error: ${googleError.message}`;
      
      if (googleError.message.includes('PERMISSION_DENIED')) {
        errorMessage += `\n\nComparte la hoja con: rayostrength-sheets@rayostrength-434a7.iam.gserviceaccount.com`;
      } else if (googleError.message.includes('NOT_FOUND')) {
        errorMessage += '\n\nVerifica que exista la pestaña "4 semanas"';
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
    console.error('Error general vinculando hoja:', error);
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
  
  console.log('Procesando con columnas fijas...');
  console.log('Total de filas crudas:', rawData.length);
  let startRow = -1;
  for (let i = 0; i < Math.min(50, rawData.length); i++) {
    const row = rawData[i];
    if (row && row.length >= 3) {
      const grupoMuscular = (row[2] || '').toString().trim().toUpperCase();
      if (grupoMuscular.includes('EXERCISES') && grupoMuscular.length < 50) {
        startRow = i;
        console.log('Encontrado inicio de ejercicios en fila:', startRow + 1, '-', grupoMuscular);
        break;
      }
    }
  }

  if (startRow === -1) {
    console.log('No se encontro el inicio de ejercicios, buscando patron alternativo...');
    for (let i = 0; i < Math.min(50, rawData.length); i++) {
      const row = rawData[i];
      if (row && row.length >= 3) {
        const ejercicio = (row[3] || '').toString().trim();
        if (ejercicio && ejercicio.length > 2 && !ejercicio.includes('**')) {
          startRow = i;
          console.log('Encontrado inicio por ejercicio en fila:', startRow + 1, '-', ejercicio);
          break;
        }
      }
    }
  }

  if (startRow === -1) {
    console.log('No se encontraron ejercicios en la hoja');
    return { ejercicios: [], metadata: { totalEjercicios: 0 } };
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
        nombreLimpio === '' ||
        nombreLimpio.length < 2) {
      continue;
    }
    const seriesNum = parseInt(series) || 0;
    if (seriesNum === 0) continue;

    const ejercicio = {
      grupoMuscular: limpiarGrupoMuscular(grupoMuscular) || 'General',
      nombre: nombreLimpio,
      video: limpiarTexto(video) || '',
      series: seriesNum,
      repeticiones: limpiarTexto(reps) || '',
      rir: extraerRIRSimple(rir),
      descanso: limpiarTexto(descanso) || '',
      id: `ej-${i}`
    };

    if (ejercicio.nombre && ejercicio.nombre.length > 2) {
      ejercicios.push(ejercicio);
    }
  }

  console.log(`Total de ejercicios procesados: ${ejercicios.length}`);
  console.log(`Grupos musculares encontrados:`, [...new Set(ejercicios.map(e => e.grupoMuscular))]);

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
  const limpio = textoLimpio.replace(/"/g, '').replace(/\*\*/g, '').trim();
  if (limpio === '') return 'General';
  
  return limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase();
}

function limpiarTexto(texto) {
  if (!texto) return '';
  return texto.toString().replace(/"/g, '').trim();
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
      
      const [cache] = await pool.execute(
        `SELECT datos_rutina FROM CacheRutinas 
         WHERE id_cliente = ? 
         ORDER BY fecha_actualizacion DESC LIMIT 1`,
        [idCliente]
      );

      if (cache.length > 0) {
        try {
          let rutinaData;
          if (typeof cache[0].datos_rutina === 'string') {
            rutinaData = JSON.parse(cache[0].datos_rutina);
          } else {
            rutinaData = cache[0].datos_rutina;
          }
          
          const [hojas] = await pool.execute(
            `SELECT hc.*, c.nombre as coach_nombre, c.apellido as coach_apellido 
             FROM HojasClientes hc
             JOIN Coach c ON hc.id_coach = c.id_coach
             WHERE hc.id_cliente = ? AND hc.activa = TRUE`,
            [idCliente]
          );

          return res.json({
            success: true,
            personalizada: true,
            hojaVinculada: hojas.length > 0,
            coach: hojas.length > 0 ? `${hojas[0].coach_nombre} ${hojas[0].coach_apellido}` : 'Coach',
            ultimaSincronizacion: cache[0].fecha_actualizacion,
            ejercicios: rutinaData.ejercicios,
            metadata: rutinaData.metadata,
            message: 'Rutina cargada desde cache'
          });
        } catch (parseError) {
          console.error('Error parseando cache:', parseError);
        }
      }

      const [hojas] = await pool.execute(
        `SELECT hc.*, c.nombre as coach_nombre, c.apellido as coach_apellido 
         FROM HojasClientes hc
         JOIN Coach c ON hc.id_coach = c.id_coach
         WHERE hc.id_cliente = ? AND hc.activa = TRUE`,
        [idCliente]
      );

      if (hojas.length > 0) {
        const sheetId = hojas[0].id_hoja_google;
        
        try {
          const rawData = await googleSheets.readAnySheet(sheetId, '4 semanas');
          const rutinaProcesada = procesarRutinaColumnasFijas(rawData);
          
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
            success: true,
            personalizada: true,
            coach: `${hojas[0].coach_nombre} ${hojas[0].coach_apellido}`,
            hojaVinculada: true,
            ultimaSincronizacion: new Date().toISOString(),
            ejercicios: rutinaProcesada.ejercicios,
            metadata: rutinaProcesada.metadata
          });

        } catch (googleError) {
          console.error('Error accediendo a Google Sheets:', googleError);
          return res.json({
            success: true,
            personalizada: false,
            hojaVinculada: true,
            message: 'Error accediendo a la hoja de Google Sheets. Contacta a tu coach.'
          });
        }
      }

      res.json({
        success: true,
        personalizada: false,
        hojaVinculada: false,
        ejercicios: [],
        message: 'Aún no tienes una rutina personalizada asignada. Contacta a tu coach.'
      });

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

app.get('/api/progreso/datos-reales', authenticateToken, verificarCuentaActivada, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('Obteniendo datos de progreso para usuario:', userId);

    let recordsPeso = [];
    let seriesPorGrupo = [];
    let volumenData = [];
    let sesiones = [];

    try {
      [recordsPeso] = await pool.execute(
        `SELECT 
          id_ejercicio,
          MAX(CAST(REPLACE(REPLACE(peso_utilizado, 'kg', ''), ' ', '') AS DECIMAL)) as record_peso,
          MAX(fecha) as fecha_record
         FROM ProgresoRutinas 
         WHERE id_usuario = ? 
           AND peso_utilizado IS NOT NULL 
           AND peso_utilizado != ''
           AND peso_utilizado != '0'
         GROUP BY id_ejercicio
         ORDER BY record_peso DESC
         LIMIT 10`,
        [userId]
      );
      console.log('Records de peso encontrados:', recordsPeso.length);
    } catch (error) {
      console.log('Error en records de peso:', error.message);
      recordsPeso = [];
    }

    try {
      [volumenData] = await pool.execute(
        `SELECT 
          AVG(CAST(REPLACE(REPLACE(peso_utilizado, 'kg', ''), ' ', '') AS DECIMAL)) as peso_promedio,
          SUM(sets_completados) as series_totales,
          COUNT(DISTINCT DATE(fecha)) as dias_entrenados
         FROM ProgresoRutinas 
         WHERE id_usuario = ? 
           AND peso_utilizado IS NOT NULL 
           AND peso_utilizado != ''
           AND sets_completados > 0`,
        [userId]
      );
      console.log('Datos de volumen:', volumenData[0]);
    } catch (error) {
      console.log('Error en volumen data:', error.message);
      volumenData = [{}];
    }
    const [estadisticasRutinas] = await pool.execute(
      `SELECT 
        COUNT(*) as total_rutinas,
        SUM(CASE WHEN completada = true THEN 1 ELSE 0 END) as rutinas_completadas,
        AVG(CASE WHEN completada = true THEN porcentaje_completitud ELSE 0 END) as porcentaje_completitud
       FROM SesionesEntrenamiento 
       WHERE id_usuario = ?`,
      [userId]
    );

    let metricasEntrenamiento = [{ promedio_rpe: 0, promedio_rir: 0, mejor_rpe: 0, volumen_semanal: 0 }];
    try {
      [metricasEntrenamiento] = await pool.execute(
        `SELECT 
          AVG(COALESCE(rpe_promedio, 0)) as promedio_rpe,
          AVG(COALESCE(rir_promedio, 0)) as promedio_rir,
          MAX(COALESCE(rpe_promedio, 0)) as mejor_rpe,
          AVG(COALESCE(volumen_total, 0)) as volumen_semanal
         FROM SesionesEntrenamiento 
         WHERE id_usuario = ? AND completada = true`,
        [userId]
      );
    } catch (error) {
      console.log('Error obteniendo métricas:', error.message);
    }

    let asistencia = [{ dias_entrenados: 0 }];
    try {
      [asistencia] = await pool.execute(
        `SELECT 
          COUNT(DISTINCT DATE(fecha)) as dias_entrenados
         FROM SesionesEntrenamiento 
         WHERE id_usuario = ? 
           AND fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
           AND completada = true`,
        [userId]
      );
    } catch (error) {
      console.log('Error calculando consistencia:', error.message);
    }

    const diasEntrenados = asistencia[0]?.dias_entrenados || 0;
    const consistencia = Math.round((diasEntrenados / 30) * 100);

    try {
      [sesiones] = await pool.execute(
        `SELECT * FROM SesionesEntrenamiento 
         WHERE id_usuario = ? AND completada = TRUE 
         ORDER BY fecha DESC 
         LIMIT 10`,
        [userId]
      );
    } catch (error) {
      console.log('Error obteniendo sesiones:', error.message);
      sesiones = [];
    }

    const pesoPromedio = volumenData[0]?.peso_promedio || 0;
    const seriesTotales = volumenData[0]?.series_totales || 0;
    const diasEntrenadosProgreso = volumenData[0]?.dias_entrenados || 0;
    const volumenTotal = Math.round(pesoPromedio * seriesTotales);
    const mejorRecord = recordsPeso.length > 0 ? recordsPeso[0].record_peso : 0;

    const estadisticas = {
      rutinasCompletadas: estadisticasRutinas[0]?.rutinas_completadas || 0,
      totalRutinas: estadisticasRutinas[0]?.total_rutinas || 0,
      porcentajeCompletitud: Math.round(estadisticasRutinas[0]?.porcentaje_completitud || 0),
      mejorRPE: Math.round(metricasEntrenamiento[0]?.mejor_rpe || 0),
      promedioRIR: Math.round(metricasEntrenamiento[0]?.promedio_rir || 0),
      volumenSemanal: Math.round(metricasEntrenamiento[0]?.volumen_semanal || 0),
      fuerzaProgreso: recordsPeso.length > 0 ? 15 : 0,
      consistencia: consistencia,

      seriesTotales: seriesTotales,
      diasEntrenados: diasEntrenadosProgreso,
      volumenTotal: volumenTotal,
      mejorRecord: mejorRecord,
      pesoPromedio: Math.round(pesoPromedio)
    };

    const datosGraficoCircular = [
      { grupo: 'Pecho', series: Math.round(seriesTotales * 0.3), porcentaje: 30 },
      { grupo: 'Piernas', series: Math.round(seriesTotales * 0.25), porcentaje: 25 },
      { grupo: 'Espalda', series: Math.round(seriesTotales * 0.2), porcentaje: 20 },
      { grupo: 'Hombros', series: Math.round(seriesTotales * 0.15), porcentaje: 15 },
      { grupo: 'Brazos', series: Math.round(seriesTotales * 0.1), porcentaje: 10 }
    ];
    const topRecords = recordsPeso.slice(0, 3).map((record, index) => ({
      nombre_ejercicio: `Ejercicio ${record.id_ejercicio}`,
      record_peso: record.record_peso || 0
    }));

    const datosProgreso = {
      estadisticas: estadisticas,
      topRecords: topRecords,
      graficoCircular: datosGraficoCircular,
      rutinasSemanales: [estadisticas.rutinasCompletadas, 0, 0, 0, 0],
      volumenSemanal: [estadisticas.volumenSemanal, 0, 0, 0, 0],
      sesionesRecientes: sesiones
    };

    console.log('Datos de progreso procesados correctamente para usuario:', userId);

    res.json({
      success: true,
      progressData: datosProgreso,
      message: 'Datos de progreso cargados correctamente'
    });

  } catch (error) {
    console.error('Error general obteniendo datos de progreso:', error);
    const datosBasicos = {
      estadisticas: {
        rutinasCompletadas: 0,
        totalRutinas: 0,
        porcentajeCompletitud: 0,
        mejorRPE: 0,
        promedioRIR: 0,
        volumenSemanal: 0,
        fuerzaProgreso: 0,
        consistencia: 0,
        seriesTotales: 0,
        diasEntrenados: 0,
        volumenTotal: 0,
        mejorRecord: 0,
        pesoPromedio: 0
      },
      topRecords: [],
      graficoCircular: [],
      rutinasSemanales: [0, 0, 0, 0, 0],
      volumenSemanal: [0, 0, 0, 0, 0],
      sesionesRecientes: []
    };

    res.json({
      success: true,
      progressData: datosBasicos,
      message: 'Datos básicos cargados'
    });
  }
});

app.post('/api/progreso/guardar-ejercicio', authenticateToken, verificarCuentaActivada, async (req, res) => {
  try {
    const {
      id_ejercicio,
      sets_completados,
      reps_logradas,
      peso_utilizado,
      rir_final,
      notas
    } = req.body;

    const userId = req.user.userId;

    console.log('Guardando ejercicio:', {
      id_ejercicio,
      sets_completados,
      reps_logradas,
      peso_utilizado,
      userId
    });
    const [result] = await pool.execute(
      `INSERT INTO ProgresoRutinas 
       (id_usuario, id_ejercicio, fecha, sets_completados, reps_logradas, peso_utilizado, rir_final, notas)
       VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?)`,
      [
        userId,
        id_ejercicio,
        sets_completados || 0,
        reps_logradas || '',
        peso_utilizado || '',
        rir_final || null,
        notas || ''
      ]
    );

    console.log('Ejercicio guardado con ID:', result.insertId);

    res.json({
      success: true,
      message: 'Ejercicio guardado correctamente',
      id_progreso: result.insertId
    });

  } catch (error) {
    console.error('Error guardando ejercicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar el ejercicio: ' + error.message
    });
  }
});

app.get('/api/progreso/debug', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Debug Funcionando',
    userId: req.user.userId
  });
});

app.post('/api/progreso/actualizar-ejercicio', authenticateToken, verificarCuentaActivada, async (req, res) => {
  try {
    const {
      id_ejercicio,
      reps_logradas,
      peso_utilizado
    } = req.body;

    const userId = req.user.userId;

    console.log('Actualizando ejercicio:', {
      id_ejercicio,
      reps_logradas,
      peso_utilizado,
      userId
    });

    const [ejerciciosHoy] = await pool.execute(
      `SELECT id_progreso FROM ProgresoRutinas 
       WHERE id_usuario = ? AND id_ejercicio = ? AND fecha = CURDATE()
       ORDER BY id_progreso DESC LIMIT 1`,
      [userId, id_ejercicio]
    );

    if (ejerciciosHoy.length > 0) {
      await pool.execute(
        `UPDATE ProgresoRutinas 
         SET reps_logradas = ?, peso_utilizado = ?
         WHERE id_progreso = ?`,
        [reps_logradas, peso_utilizado, ejerciciosHoy[0].id_progreso]
      );
      console.log('Ejercicio actualizado');
    } else {
      const [result] = await pool.execute(
        `INSERT INTO ProgresoRutinas 
         (id_usuario, id_ejercicio, fecha, reps_logradas, peso_utilizado)
         VALUES (?, ?, CURDATE(), ?, ?)`,
        [userId, id_ejercicio, reps_logradas, peso_utilizado]
      );
      console.log('Nuevo ejercicio creado');
    }

    res.json({
      success: true,
      message: 'Datos actualizados correctamente'
    });

  } catch (error) {
    console.error('Error actualizando ejercicio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el ejercicio: ' + error.message
    });
  }
});

app.get('/api/progreso/historial-pesos', authenticateToken, verificarCuentaActivada, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const [historial] = await pool.execute(
      `SELECT 
        DATE_FORMAT(fecha, '%d %b') as fecha,
        MAX(CAST(REPLACE(REPLACE(peso_utilizado, 'kg', ''), ' ', '') AS DECIMAL)) as peso,
        id_ejercicio as ejercicio
       FROM ProgresoRutinas 
       WHERE id_usuario = ? 
         AND peso_utilizado IS NOT NULL 
         AND peso_utilizado != ''
         AND peso_utilizado != '0'
       GROUP BY fecha, id_ejercicio
       ORDER BY fecha DESC
       LIMIT 10`,
      [userId]
    );

    res.json({
      success: true,
      historial: historial
    });

  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.json({
      success: true,
      historial: []
    });
  }
});

app.post('/api/meet/crear-sesion', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'coach') {
      return res.status(403).json({
        success: false,
        message: 'Solo los coaches pueden crear sesiones'
      });
    }

    const { idUsuario, titulo, descripcion, enlaceMeet, fechaSesion, duracion } = req.body;
    const idCoach = req.user.coachId;

    if (!idUsuario || !titulo || !enlaceMeet || !fechaSesion) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos'
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO SesionesMeet (id_coach, id_usuario, titulo, descripcion, enlace_meet, fecha_sesion, duracion_minutos)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [idCoach, idUsuario, titulo, descripcion, enlaceMeet, fechaSesion, duracion || 60]
    );

    res.json({
      success: true,
      message: 'Sesión de Google Meet creada correctamente',
      idSesion: result.insertId
    });

  } catch (error) {
    console.error('Error creando sesión:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

app.get('/api/meet/sesiones-usuario', authenticateToken, verificarCuentaActivada, async (req, res) => {
  try {
    if (req.user.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Solo los usuarios pueden ver sus sesiones'
      });
    }

    const userId = req.user.userId;

   const [sesiones] = await pool.execute(
    `SELECT sm.*, c.nombre as coach_nombre, c.apellido as coach_apellido 
    FROM SesionesMeet sm 
    JOIN Coach c ON sm.id_coach = c.id_coach
    WHERE sm.id_usuario = ? AND sm.estado = 'programada'
    ORDER BY sm.fecha_sesion ASC`,
  [userId]
);

    res.json({
      success: true,
      sesiones: sesiones
    });

  } catch (error) {
    console.error('Error obteniendo sesiones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

app.get('/api/meet/sesiones-coach', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'coach') {
      return res.status(403).json({
        success: false,
        message: 'Solo los coaches pueden ver sus sesiones'
      });
    }

    const coachId = req.user.coachId;

    const [sesiones] = await pool.execute(
      `SELECT sm.*, u.nombre as usuario_nombre, u.apellido as usuario_apellido 
       FROM SesionesMeet sm
       JOIN Usuario u ON sm.id_usuario = u.id_usuario
       WHERE sm.id_coach = ? AND sm.estado = 'programada'
       ORDER BY sm.fecha_sesion ASC`,
      [coachId]
    );

    res.json({
      success: true,
      sesiones: sesiones
    });

  } catch (error) {
    console.error('Error obteniendo sesiones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

app.post('/api/meet/completar-sesion', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'coach') {
      return res.status(403).json({
        success: false,
        message: 'Solo los coaches pueden completar sesiones'
      });
    }

    const { idSesion } = req.body;
    const idCoach = req.user.coachId;

    const [sesiones] = await pool.execute(
      'SELECT id_sesion FROM SesionesMeet WHERE id_sesion = ? AND id_coach = ?',
      [idSesion, idCoach]
    );

    if (sesiones.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sesión no encontrada'
      });
    }

    await pool.execute(
      'UPDATE SesionesMeet SET estado = "completada" WHERE id_sesion = ?',
      [idSesion]
    );

    res.json({
      success: true,
      message: 'Sesión marcada como completada'
    });

  } catch (error) {
    console.error('Error completando sesión:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

app.post('/api/auth/login-coach-temp', async (req, res) => {
  try {
    const { email, contraseña } = req.body;

    if (!email || !contraseña) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña requeridos'
      });
    }

    if (email !== 'carlos.coach@rayostrength.com' || contraseña !== 'Coach123') {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    const [coaches] = await pool.execute(
      'SELECT * FROM Coach WHERE email = ?',
      [email]
    );

    if (coaches.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Coach no encontrado'
      });
    }

    const coach = coaches[0];

    const token = jwt.sign(
      { 
        coachId: coach.id_coach,
        email: coach.email, 
        role: 'coach' 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login temporal exitoso',
      token,
      user: {
        id_coach: coach.id_coach,
        nombre: coach.nombre,
        apellido: coach.apellido,
        email: coach.email,
        fecha_nacimiento: coach.fecha_nacimiento,
        sexo: coach.sexo,
        especialidad: coach.especialidad,
        experiencia: coach.experiencia,
        role: 'coach'
      }
    });

  } catch (error) {
    console.error('Error en login temporal:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

app.get('/api/debug/hojas-cliente/:idCliente', async (req, res) => {
  try {
    const { idCliente } = req.params;
    
    const [hojas] = await pool.execute(
      `SELECT hc.*, c.nombre as coach_nombre, c.apellido as coach_apellido 
       FROM HojasClientes hc
       JOIN Coach c ON hc.id_coach = c.id_coach
       WHERE hc.id_cliente = ?`,
      [idCliente]
    );

    const [cache] = await pool.execute(
      `SELECT * FROM CacheRutinas WHERE id_cliente = ?`,
      [idCliente]
    );

    res.json({
      hojas: hojas,
      cache: cache,
      totalHojas: hojas.length,
      totalCache: cache.length
    });

  } catch (error) {
    console.error('Error en debug:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/debug/hoja-cruda/:idCliente', authenticateToken, async (req, res) => {
  try {
    const { idCliente } = req.params;
    
    const [hojas] = await pool.execute(
      `SELECT id_hoja_google FROM HojasClientes WHERE id_cliente = ? AND activa = TRUE`,
      [idCliente]
    );

    if (hojas.length === 0) {
      return res.json({ error: 'No hay hoja vinculada' });
    }

    const sheetId = hojas[0].id_hoja_google;
    const rawData = await googleSheets.readAnySheet(sheetId, '4 semanas');
    const preview = rawData.slice(0, 20).map((row, index) => ({
      fila: index + 1,
      datos: row
    }));

    res.json({
      sheetId: sheetId,
      totalFilas: rawData.length,
      preview: preview
    });

  } catch (error) {
    console.error('Error en debug hoja cruda:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/debug/forzar-vinculacion', async (req, res) => {
  try {
    const { idCliente, idCoach, sheetId } = req.body;
    
    const [result] = await pool.execute(
      `INSERT INTO HojasClientes (id_cliente, id_coach, id_hoja_google, nombre_hoja, activa, ultima_sincronizacion) 
       VALUES (?, ?, ?, 'Hoja_Cliente', TRUE, NOW())
       ON DUPLICATE KEY UPDATE 
       id_hoja_google = VALUES(id_hoja_google),
       activa = TRUE,
       ultima_sincronizacion = NOW()`,
      [idCliente, idCoach, sheetId]
    );

    res.json({
      success: true,
      message: 'Vinculacion forzada',
      affectedRows: result.affectedRows,
      insertId: result.insertId
    });

  } catch (error) {
    console.error('Error forzando vinculacion:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/debug/vinculacion-completa/:idCliente', async (req, res) => {
  try {
    const { idCliente } = req.params;
    
    const [hojas] = await pool.execute(
      `SELECT hc.*, c.nombre as coach_nombre, c.apellido as coach_apellido 
       FROM HojasClientes hc
       JOIN Coach c ON hc.id_coach = c.id_coach
       WHERE hc.id_cliente = ?`,
      [idCliente]
    );

    const [cache] = await pool.execute(
      `SELECT * FROM CacheRutinas WHERE id_cliente = ?`,
      [idCliente]
    );

    const [usuario] = await pool.execute(
      `SELECT id_usuario, nombre, apellido FROM Usuario WHERE id_usuario = ?`,
      [idCliente]
    );

    let datosCache = null;
    if (cache.length > 0) {
      try {
        datosCache = typeof cache[0].datos_rutina === 'string' 
          ? JSON.parse(cache[0].datos_rutina) 
          : cache[0].datos_rutina;
      } catch (e) {
        datosCache = { error: 'No se pudo parsear' };
      }
    }

    res.json({
      usuario: usuario.length > 0 ? usuario[0] : null,
      hojas: hojas,
      cache: {
        existe: cache.length > 0,
        cantidad: cache.length,
        datos: datosCache
      },
      resumen: {
        tieneHoja: hojas.length > 0,
        tieneCache: cache.length > 0,
        hojaActiva: hojas.length > 0 ? hojas[0].activa : false
      }
    });

  } catch (error) {
    console.error('Error en debug completo:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/debug/test-password-direct', async (req, res) => {
  try {
    console.log('=== DIAGNÓSTICO INICIADO ===');
    
    const { email, password } = req.body;
    console.log('Datos recibidos:', { email, password });
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y password requeridos'
      });
    }
    console.log('Probando conexión a BD...');
    let coaches;
    try {
      [coaches] = await pool.execute(
        'SELECT id_coach, email, contraseña, rol FROM Coach WHERE email = ?',
        [email]
      );
      console.log('Consulta BD exitosa');
    } catch (dbError) {
      console.error('Error en consulta BD:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Error de base de datos: ' + dbError.message
      });
    }

    console.log('Coaches encontrados:', coaches ? coaches.length : 'undefined');

    if (!coaches || coaches.length === 0) {
      return res.json({
        success: false,
        error: 'Coach no encontrado con email: ' + email
      });
    }

    const coach = coaches[0];
    console.log('Coach encontrado:', {
      id: coach.id_coach,
      email: coach.email,
      rol: coach.rol,
      hashLength: coach.contraseña ? coach.contraseña.length : 'null'
    });

    if (!coach.contraseña) {
      return res.json({
        success: false,
        error: 'El coach no tiene contraseña configurada'
      });
    }
    console.log('Probando bcrypt.compare...');
    const isMatch = await bcrypt.compare(password, coach.contraseña);
    console.log('Resultado bcrypt.compare:', isMatch);

    res.json({
      success: true,
      diagnostic: {
        coachExists: true,
        email: coach.email,
        rol: coach.rol,
        bcryptMatch: isMatch,
        hashLength: coach.contraseña.length
      }
    });

  } catch (error) {
    console.error(' ERROR general en diagnóstico:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

app.post('/api/debug/update-admin-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    console.log('Actualizando contraseña para:', email);
    
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    console.log('Nuevo hash generado:', hashedPassword);
    
    const [result] = await pool.execute(
      'UPDATE Coach SET contraseña = ? WHERE email = ?',
      [hashedPassword, email]
    );
    
    console.log('Filas actualizadas:', result.affectedRows);
    
    const [coaches] = await pool.execute(
      'SELECT email, contraseña FROM Coach WHERE email = ?',
      [email]
    );
    
    const coach = coaches[0];
    const verifyMatch = await bcrypt.compare(newPassword, coach.contraseña);
    
    res.json({
      success: true,
      message: 'Contraseña actualizada',
      verified: verifyMatch,
      credentials: {
        email: email,
        password: newPassword
      }
    });
    
  } catch (error) {
    console.error('Error actualizando contraseña:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const startServer = async () => {
  try {
    await createTables();
    const server = app.listen(8081, '0.0.0.0', () => {
      console.log(`Servidor corriendo en puerto ${PORT}`);
    });

    process.on('SIGINT', () => {
      console.log('Apagando servidor...');
      server.close(() => {
        console.log('Servidor apagado');
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      console.log('Recibida señal de terminación');
      server.close(() => {
        console.log('Servidor apagado');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Error iniciando servidor:', error);
    process.exit(1);
  }
};

app.get('/api/debug/sendgrid', (req, res) => {
  console.log('Debug SendGrid llamado');
  res.json({
    sendgrid_module: !!sgMail,
    sendgrid_available: sendgridAvailable,
    api_key: !!process.env.SENDGRID_API_KEY,
    from_email: process.env.FROM_EMAIL,
    node_env: process.env.NODE_ENV
  });
});

app.get('/api/debug/sendgrid-status', (req, res) => {
  res.json({
    sendgrid_available: sendgridAvailable,
    api_key_configured: !!process.env.SENDGRID_API_KEY,
    from_email: process.env.FROM_EMAIL,
    message: sendgridAvailable ? 
      'SendGrid activo - Emails funcionando' : 
      'SendGrid no disponible'
  });
});

app.post('/api/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    const result = await enviarEmailVerificacion(email, 'test-token-123');
    
    res.json({
      success: true,
      email_sent: result,
      message: result ? 'Email enviado correctamente' : 'Error enviando email'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

startServer();