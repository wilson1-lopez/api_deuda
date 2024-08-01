const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json()); // Para manejar cuerpos JSON

// Configuración para servir archivos estáticos desde el directorio uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuración de la conexión a MySQL
let connection;

function handleDisconnect() {
  connection = mysql.createConnection({
    host: 'booxfva7gkco41ueigpq-mysql.services.clever-cloud.com',
    user: 'u9ogds8egmwvevci',
    password: 'Gbajf9DNtghlzmc5lplR',
    database: 'booxfva7gkco41ueigpq'

    //host: 'localhost',
    //user: 'root',
    //password: '',
    //database: 'debtors_db'


  });

  connection.connect((err) => {
    if (err) {
      console.error('Error connecting to the database:', err.message);
      setTimeout(handleDisconnect, 2000); // Intentar reconectar después de 2 segundos
    } else {
      console.log('Connected to the database!');
    }
  });

  connection.on('error', (err) => {
    console.error('Database error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.log('Reconnecting to the database...');
      handleDisconnect(); // Reconectar en caso de pérdida de conexión
    } else {
      throw err;
    }
  });
}

handleDisconnect();

// Configurar Multer para el manejo de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Directorio donde se guardarán los archivos
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Ruta para obtener nombre, apellido y total deuda
app.get('/debtors', (req, res) => {
  const query = `
    SELECT debtors.id, debtors.nombre, debtors.apellido, SUM(debts.valor) as total_debt
    FROM debtors
    LEFT JOIN debts ON debtors.id = debts.debtor_id
    WHERE debts.estado IN ('pendiente', 'vencido')
    GROUP BY debtors.id, debtors.nombre, debtors.apellido
  `;
  connection.query(query, (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(results);
    }
  });
});

// Ruta para obtener los detalles de una deuda por ID
app.get('/debts/:id', (req, res) => {
  const debtorId = req.params.id;

  const query = `
    SELECT debtors.id, debtors.nombre, debtors.apellido, debtors.cedula, debtors.direccion, debtors.telefono, debtors.foto,
           debts.detalles, debts.valor, debts.estado, debts.fecha_registro, debts.fecha_pago_acordado
    FROM debtors
    LEFT JOIN debts ON debtors.id = debts.debtor_id
    WHERE debtors.id = ?
  `;

  // Consulta para obtener los detalles del deudor y sus deudas
  connection.query(query, [debtorId], (err, results) => {
    if (err) {
      console.error('Error en la consulta:', err);
      return res.status(500).json({ error: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Deudor no encontrado' });
    }

    // Obtener detalles del deudor
    const debtor = {
      id: results[0].id,
      nombre: results[0].nombre,
      apellido: results[0].apellido,
      cedula: results[0].cedula,
      direccion: results[0].direccion,
      telefono: results[0].telefono,
      foto: results[0].foto
    };

    // Obtener detalles de las deudas
    const debts = results
      .filter(result => result.detalles !== null)
      .map(result => ({
        detalles: result.detalles,
        valor: result.valor,
        estado: result.estado,
        fecha_registro: result.fecha_registro,
        fecha_pago_acordado: result.fecha_pago_acordado
      }));

    // Calcular la deuda total pendiente o vencida
    const totalDebtQuery = `
      SELECT SUM(valor) AS total_debt
      FROM debts
      WHERE debtor_id = ? AND (estado = 'pendiente' OR estado = 'vencido')
    `;

    // Consulta para calcular la deuda total
    connection.query(totalDebtQuery, [debtorId], (err, totalDebtResult) => {
      if (err) {
        console.error('Error en la consulta de deuda total:', err);
        return res.status(500).json({ error: err.message });
      }

      const totalDebt = totalDebtResult[0].total_debt || 0;

      // Enviar el resultado
      res.json({
        debtor,
        debts,
        total_debt: totalDebt
      });
    });
  });
});

// Ruta para registrar una nueva deuda con opción de subir una foto
app.post('/api/deudas', upload.none(), (req, res) => {
  const { cedula, nombre, apellido, direccion, telefono, detalles, valor, estado, fecha_registro, fecha_pago_acordado } = req.body;

  const checkUserQuery = `SELECT COUNT(*) AS count FROM debtors WHERE cedula = ?`;

  const insertDebtorQuery = `
    INSERT INTO debtors (cedula, nombre, apellido, direccion, telefono)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), apellido = VALUES(apellido), direccion = VALUES(direccion), telefono = VALUES(telefono)
  `;

  const insertDebtQuery = `
    INSERT INTO debts (debtor_id, detalles, valor, estado, fecha_registro, fecha_pago_acordado)
    VALUES ((SELECT id FROM debtors WHERE cedula = ?), ?, ?, ?, ?, ?)
  `;

  connection.query(checkUserQuery, [cedula], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (results[0].count > 0) {
      return res.status(400).json({ error: 'El usuario con esta cédula ya existe' });
    }

    connection.beginTransaction((err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      connection.query(insertDebtorQuery, [cedula, nombre, apellido, direccion, telefono], (err, results) => {
        if (err) {
          return connection.rollback(() => {
            res.status(500).json({ error: err.message });
          });
        }

        connection.query(insertDebtQuery, [cedula, detalles, valor, estado, fecha_registro, fecha_pago_acordado], (err, results) => {
          if (err) {
            return connection.rollback(() => {
              res.status(500).json({ error: err.message });
            });
          }

          connection.commit((err) => {
            if (err) {
              return connection.rollback(() => {
                res.status(500).json({ error: err.message });
              });
            }

            res.json({ message: 'Deuda registrada exitosamente' });
          });
        });
      });
    });
  });
});

//verificar si esxiste o no el usuario
app.get('/api/check-cedula', (req, res) => {
  const { cedula } = req.query;

  const checkUserQuery = `SELECT COUNT(*) AS count FROM debtors WHERE cedula = ?`;

  connection.query(checkUserQuery, [cedula], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({ exists: results[0].count > 0 });
  });
});


// Ruta para registrar una nueva deuda sin opción de subir una foto (desde detalles de deuda)
app.post('/api/desdedetalles', (req, res) => {
  const { cedula, nombre, apellido, direccion, telefono, detalles, valor, estado, fecha_registro, fecha_pago_acordado } = req.body;

  const insertDebtorQuery = `
    INSERT INTO debtors (cedula, nombre, apellido, direccion, telefono)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), apellido = VALUES(apellido), direccion = VALUES(direccion), telefono = VALUES(telefono)
  `;

  const insertDebtQuery = `
    INSERT INTO debts (debtor_id, detalles, valor, estado, fecha_registro, fecha_pago_acordado)
    VALUES ((SELECT id FROM debtors WHERE cedula = ?), ?, ?, ?, ?, ?)
  `;

  connection.beginTransaction((err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    connection.query(insertDebtorQuery, [cedula, nombre, apellido, direccion, telefono], (err, results) => {
      if (err) {
        return connection.rollback(() => {
          res.status(500).json({ error: err.message });
        });
      }

      connection.query(insertDebtQuery, [cedula, detalles, valor, estado, fecha_registro, fecha_pago_acordado], (err, results) => {
        if (err) {
          return connection.rollback(() => {
            res.status(500).json({ error: err.message });
          });
        }

        connection.commit((err) => {
          if (err) {
            return connection.rollback(() => {
              res.status(500).json({ error: err.message });
            });
          }

          res.json({ message: 'Deuda registrada exitosamente' });
        });
      });
    });
  });
});

app.listen(port, () => {
  console.log(`Servidor ejecutándose en http://localhost:${port}`);
});
