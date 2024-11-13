const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

// Datos de conexión a la base de datos
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'medicamentos'
});

// Conexión a la base de datos
db.connect(err => {
    if (err) {
        console.error('Error conectando a la base de datos:', err.stack);
        return;
    }
    console.log('Conectado a la base de datos MySQL');
});

// Crear la tabla 'usuarios' si no existe
db.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cedula VARCHAR(20) NOT NULL UNIQUE,
        nombre VARCHAR(50) NOT NULL,
        apellido VARCHAR(50) NOT NULL,
        contrasena VARCHAR(255) NOT NULL,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        correo_electronico VARCHAR(100) NOT NULL UNIQUE
    )
`, err => {
    if (err) {
        console.error("Error al crear la tabla 'usuarios':", err);
        return;
    }
    console.log("Tabla 'Usuarios' creada o verificada");
});

// Crear la tabla 'medicamentos' si no existe
db.query(`
    CREATE TABLE IF NOT EXISTS medicamentos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        registro_invima VARCHAR(50) NOT NULL UNIQUE,
        concentracion VARCHAR(50) NOT NULL,
        presentacion VARCHAR(50) NOT NULL,
        nombre VARCHAR(50) NOT NULL,
        marca VARCHAR(50) NOT NULL,
        precio DECIMAL(10, 2) NOT NULL,
        tipo_venta ENUM('prescripción', 'libre') NOT NULL
    )
`, err => {
    if (err) throw err;
    console.log("Tabla 'medicamentos' creada o verificada");
});

// Crear la tabla 'calificaciones' si no existe
db.query(`
    CREATE TABLE IF NOT EXISTS calificaciones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario INT,
        medicamento INT,
        fecha_calificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        efectividad TINYINT NOT NULL CHECK (efectividad BETWEEN 1 AND 10),
        frecuencia_ingesta ENUM('diario', 'semanal', 'mensual', 'anual', 'rara vez') NOT NULL,
        disponibilidad ENUM('fácil', 'normal', 'difícil') NOT NULL,
        satisfaccion TINYINT NOT NULL CHECK (satisfaccion BETWEEN 1 AND 10),
        efectos_secundarios ENUM('típicos', 'ninguno') NOT NULL,
        observaciones TEXT,
        FOREIGN KEY (usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (medicamento) REFERENCES medicamentos(id) ON DELETE CASCADE
    )
`, err => {
    if (err) throw err;
    console.log("Tabla 'calificaciones' creada o verificada");
});

// Crear una instancia de Express
const app = express();
const PORT = 3000;
app.use(express.json());

// Ruta para crear un nuevo usuario
app.post('/usuarios', [
    body('cedula').isLength({ min: 8 }).withMessage('La cédula debe tener al menos 8 caracteres'),
    body('nombre').isLength({ min: 2 }).withMessage('El nombre debe tener al menos 2 caracteres'),
    body('apellido').isLength({ min: 2 }).withMessage('El apellido debe tener al menos 2 caracteres'),
    body('correo_electronico').isEmail().withMessage('Debe ser un correo electrónico válido'),
    body('contrasena').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { cedula, nombre, apellido, contrasena, correo_electronico } = req.body;
    const hashedPassword = await bcrypt.hash(contrasena, 10);

    // Verificar si la cedula o el correo ya existen
    db.query('SELECT * FROM usuarios WHERE cedula = ? OR correo_electronico = ?', [cedula, correo_electronico], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error al verificar el usuario');
        }
        if (results.length > 0) {
            return res.status(400).send('La cédula o el correo electrónico ya están registrados');
        }
        
        // Insertar usuario si no existe
        const sql = 'INSERT INTO usuarios (cedula, nombre, apellido, contrasena, correo_electronico) VALUES (?, ?, ?, ?, ?)';
        db.query(sql, [cedula, nombre, apellido, hashedPassword, correo_electronico], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error al crear el usuario');
            }
            res.status(201).json({ id: result.insertId, cedula, nombre, apellido, correo_electronico });
        });
    });
});

// Ruta para consultar todos los usuarios
app.get('/usuarios', (req, res) => {
    const sql = 'SELECT * FROM usuarios';
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error al obtener los usuarios');
        }
        res.json(results);
    });
});

// Ruta para consultar un usuario por ID
app.get('/usuarios/:id', (req, res) => {
    const sql = 'SELECT * FROM usuarios WHERE id = ?';
    db.query(sql, [req.params.id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error al obtener el usuario');
        }
        if (results.length === 0) {
            return res.status(404).send('Usuario no encontrado');
        }
        res.json(results[0]);
    });
});

// Ruta para actualizar un usuario
app.put('/usuarios/:id', (req, res) => {
    const { nombre, apellido, correo_electronico } = req.body;
    const sql = 'UPDATE usuarios SET nombre = ?, apellido = ?, correo_electronico = ? WHERE id = ?';
    db.query(sql, [nombre, apellido, correo_electronico, req.params.id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error al actualizar el usuario');
        }
        if (result.affectedRows === 0) {
            return res.status(404).send('Usuario no encontrado');
        }
        res.json({ message: 'Usuario actualizado correctamente' });
    });
});

// Ruta para eliminar un usuario
app.delete('/usuarios/:id', (req, res) => {
    const sql = 'DELETE FROM usuarios WHERE id = ?';
    db.query(sql, [req.params.id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error al eliminar el usuario');
        }
        if (result.affectedRows === 0) {
            return res.status(404).send('Usuario no encontrado');
        }
        res.json({ message: 'Usuario eliminado correctamente' });
    });
});

// Ruta para iniciar sesión
app.post('/login', async (req, res) => {
    const { identificacion, contrasena } = req.body;

    // Validar que los campos no estén vacíos
    if (!identificacion || !contrasena) {
        return res.status(400).json({ success: false, message: 'Por favor, complete ambos campos' });
    }

    // Verificar que la cédula existe en la base de datos
    db.query('SELECT * FROM usuarios WHERE cedula = ?', [identificacion], async (err, results) => {
        if (err) {
            console.error('Error al consultar usuario:', err);
            return res.status(500).json({ success: false, message: 'Error al consultar el usuario' });
        }
        if (results.length === 0) {
            return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
        }

        const usuario = results[0];

        // Comparar la contraseña ingresada con la almacenada en la base de datos
        const isMatch = await bcrypt.compare(contrasena, usuario.contrasena);

        if (isMatch) {
            return res.json({ success: true, message: 'Inicio de sesión exitoso' });
        } else {
            return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
        }
    });
});

//////////////////////////////////////////////////////////////////////////////
// Crear un nuevo medicamento
app.post('/medicamentos', (req, res) => {
    const { registro_invima, concentracion, presentacion, nombre, marca, precio, tipo_venta } = req.body;
    const sql = 'INSERT INTO medicamentos (registro_invima, concentracion, presentacion, nombre, marca, precio, tipo_venta) VALUES (?, ?, ?, ?, ?, ?, ?)';
    db.query(sql, [registro_invima, concentracion, presentacion, nombre, marca, precio, tipo_venta], (err, result) => {
        if (err) return res.status(500).send('Error al crear el medicamento');
        res.status(201).json({ id: result.insertId });
    });
});

// Consultar todos los medicamentos
app.get('/medicamentos', (req, res) => {
    db.query('SELECT * FROM medicamentos', (err, results) => {
        if (err) return res.status(500).send('Error al obtener los medicamentos');
        res.json(results);
    });
});

// Consultar un medicamento por ID
app.get('/medicamentos/:id', (req, res) => {
    const sql = 'SELECT * FROM medicamentos WHERE id = ?';
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).send('Error al obtener el medicamento');
        if (results.length === 0) return res.status(404).send('Medicamento no encontrado');
        res.json(results[0]);
    });
});

// Actualizar un medicamento por ID
app.put('/medicamentos/:id', (req, res) => {
    const { registro_invima, concentracion, presentacion, nombre, marca, precio, tipo_venta } = req.body;
    const sql = 'UPDATE medicamentos SET registro_invima = ?, concentracion = ?, presentacion = ?, nombre = ?, marca = ?, precio = ?, tipo_venta = ? WHERE id = ?';
    db.query(sql, [registro_invima, concentracion, presentacion, nombre, marca, precio, tipo_venta, req.params.id], (err, result) => {
        if (err) return res.status(500).send('Error al actualizar el medicamento');
        res.send('Medicamento actualizado correctamente');
    });
});

// Eliminar un medicamento por ID
app.delete('/medicamentos/:id', (req, res) => {
    const sql = 'DELETE FROM medicamentos WHERE id = ?';
    db.query(sql, [req.params.id], (err, result) => {
        if (err) return res.status(500).send('Error al eliminar el medicamento');
        res.send('Medicamento eliminado correctamente');
    });
});

///////////////////////////////////////////////////////////////////////////////////


// Crear una nueva calificación
app.post('/calificaciones', (req, res) => {
    const { usuario, medicamento, efectividad, frecuencia_ingesta, disponibilidad, satisfaccion, efectos_secundarios, observaciones } = req.body;
    const sql = 'INSERT INTO calificaciones (usuario, medicamento, efectividad, frecuencia_ingesta, disponibilidad, satisfaccion, efectos_secundarios, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    db.query(sql, [usuario, medicamento, efectividad, frecuencia_ingesta, disponibilidad, satisfaccion, efectos_secundarios, observaciones], (err, result) => {
        if (err) return res.status(500).send('Error al crear la calificación');
        res.status(201).json({ id: result.insertId });
    });
});

// Consultar todas las calificaciones
app.get('/calificaciones', (req, res) => {
    db.query('SELECT * FROM calificaciones', (err, results) => {
        if (err) return res.status(500).send('Error al obtener las calificaciones');
        res.json(results);
    });
});

// Consultar una calificación por ID
app.get('/calificaciones/:id', (req, res) => {
    const sql = 'SELECT * FROM calificaciones WHERE id = ?';
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).send('Error al obtener la calificación');
        if (results.length === 0) return res.status(404).send('Calificación no encontrada');
        res.json(results[0]);
    });
});

// Actualizar una calificación por ID
app.put('/calificaciones/:id', (req, res) => {
    const { efectividad, frecuencia_ingesta, disponibilidad, satisfaccion, efectos_secundarios, observaciones } = req.body;
    const sql = 'UPDATE calificaciones SET efectividad = ?, frecuencia_ingesta = ?, disponibilidad = ?, satisfaccion = ?, efectos_secundarios = ?, observaciones = ? WHERE id = ?';
    db.query(sql, [efectividad, frecuencia_ingesta, disponibilidad, satisfaccion, efectos_secundarios, observaciones, req.params.id], (err, result) => {
        if (err) return res.status(500).send('Error al actualizar la calificación');
        res.send('Calificación actualizada correctamente');
    });
});

// Eliminar una calificación por ID
app.delete('/calificaciones/:id', (req, res) => {
    const sql = 'DELETE FROM calificaciones WHERE id = ?';
    db.query(sql, [req.params.id], (err, result) => {
        if (err) return res.status(500).send('Error al eliminar la calificación');
        res.send('Calificación eliminada correctamente');
    });
});


////////////////////////////////////////////////////////////////////////////////////

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

app.use(express.static('public'));
