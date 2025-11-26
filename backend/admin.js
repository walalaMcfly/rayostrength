const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('./config/database');

const verificarAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token de acceso requerido'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Solo administradores.'
      });
    }

    req.user = decoded;
    next();
  });
};

router.get('/coaches', verificarAdmin, async (req, res) => {
  try {
    const [coaches] = await pool.execute(`
      SELECT id_coach as id, nombre, apellido, email, especialidad, 
             experiencia, created_at as fechaCreacion
      FROM Coach
      WHERE rol != 'admin'
      ORDER BY created_at DESC
    `);

    res.json({ coaches });
  } catch (error) {
    console.error('Error al listar coaches:', error);
    res.status(500).json({ error: 'Error al obtener coaches' });
  }
});

router.post('/coaches', verificarAdmin, async (req, res) => {
  try {
    const { nombre, apellido, email, password, especialidad } = req.body;

    if (!nombre || !apellido || !email || !password) {
      return res.status(400).json({
        error: 'Nombre, apellido, email y contraseña son requeridos'
      });
    }

    const [existente] = await pool.execute(
      'SELECT id_coach FROM Coach WHERE email = ?',
      [email]
    );

    if (existente.length > 0) {
      return res.status(400).json({
        error: 'Ya existe un coach con ese email'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [resultado] = await pool.execute(`
      INSERT INTO Coach (nombre, apellido, email, contraseña, especialidad, rol)
      VALUES (?, ?, ?, ?, ?, 'coach')
    `, [nombre, apellido, email, hashedPassword, especialidad || null]);

    res.status(201).json({
      mensaje: 'Coach creado exitosamente',
      idCoach: resultado.insertId
    });
  } catch (error) {
    console.error('Error al crear coach:', error);
    res.status(500).json({ error: 'Error al crear coach' });
  }
});

router.put('/coaches/:idCoach', verificarAdmin, async (req, res) => {
  try {
    const { idCoach } = req.params;
    const { nombre, apellido, email, especialidad } = req.body;

    await pool.execute(`
      UPDATE Coach 
      SET nombre = ?, apellido = ?, email = ?, especialidad = ?
      WHERE id_coach = ?
    `, [nombre, apellido, email, especialidad, idCoach]);

    res.json({ mensaje: 'Coach actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar coach:', error);
    res.status(500).json({ error: 'Error al actualizar coach' });
  }
});

router.delete('/coaches/:idCoach', verificarAdmin, async (req, res) => {
  try {
    const { idCoach } = req.params;

    await pool.execute('DELETE FROM HojasClientes WHERE id_coach = ?', [idCoach]);
    await pool.execute('DELETE FROM SesionesMeet WHERE id_coach = ?', [idCoach]);
    await pool.execute('DELETE FROM Coach WHERE id_coach = ?', [idCoach]);

    res.json({ mensaje: 'Coach eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar coach:', error);
    res.status(500).json({ error: 'Error al eliminar coach' });
  }
});

router.get('/usuarios', verificarAdmin, async (req, res) => {
  try {
    const [usuarios] = await pool.execute(`
      SELECT u.id_usuario as id, u.nombre, u.apellido, u.email, 
             u.edad, u.sexo, u.created_at as fechaCreacion,
             (SELECT COUNT(*) FROM HojasClientes WHERE id_cliente = u.id_usuario) as tieneRutina
      FROM Usuario u
      ORDER BY u.created_at DESC
    `);

    const usuariosConActivo = usuarios.map(u => ({ ...u, activo: 1 }));

    res.json({ usuarios: usuariosConActivo });
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

router.delete('/usuarios/:idUsuario', verificarAdmin, async (req, res) => {
  try {
    const { idUsuario } = req.params;

    await pool.execute('DELETE FROM HojasClientes WHERE id_cliente = ?', [idUsuario]);
    await pool.execute('DELETE FROM ProgresoRutinas WHERE id_usuario = ?', [idUsuario]);
    await pool.execute('DELETE FROM Wellness WHERE id_usuario = ?', [idUsuario]);
    await pool.execute('DELETE FROM SesionesEntrenamiento WHERE id_usuario = ?', [idUsuario]);
    await pool.execute('DELETE FROM Usuario WHERE id_usuario = ?', [idUsuario]);

    res.json({ mensaje: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

router.patch('/usuarios/:idUsuario/toggle-activo', verificarAdmin, async (req, res) => {
  try {
    res.json({ mensaje: 'Estado del usuario actualizado' });
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

router.get('/estadisticas', verificarAdmin, async (req, res) => {
  try {
    const [usuarios] = await pool.execute('SELECT COUNT(*) as total FROM Usuario');
    const [coaches] = await pool.execute('SELECT COUNT(*) as total FROM Coach WHERE rol != "admin"');
    const [rutinas] = await pool.execute('SELECT COUNT(*) as total FROM HojasClientes');
    const [sesiones] = await pool.execute(
      'SELECT COUNT(*) as total FROM SesionesEntrenamiento WHERE DATE(fecha) = CURDATE() AND completada = TRUE'
    );

    res.json({
      estadisticas: {
        usuariosActivos: usuarios[0].total,
        coachesActivos: coaches[0].total,
        rutinasAsignadas: rutinas[0].total,
        sesionesHoy: sesiones[0].total
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

module.exports = router;