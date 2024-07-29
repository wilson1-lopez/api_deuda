const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json()); // Para manejar cuerpos JSON

// Configuración de la conexión a MySQL


function handleDisconnect() {
  connection = mysql.createConnection({
    host: 'booxfva7gkco41ueigpq-mysql.services.clever-cloud.com',
    user: 'u9ogds8egmwvevci',
    password: 'Gbajf9DNtghlzmc5lplR', // Reemplaza esto con tu contraseña de MySQL
    database: 'booxfva7gkco41ueigpq'
    // Para desarrollo local
    // host: 'localhost',
    // user: 'root',
    // password: '', // Reemplaza esto con tu contraseña de MySQL
    // database: 'debtors_db'
  });

  connection.connect((err) => {
    if (err) {
      console.error('Error connecting to the database:', err.message);
      setTimeout(handleDisconnect, 2000); // Intentar reconectar después de 2 segundos
    } else {
      console.log('Connection to the database was successful!');
    }
  });

  connection.on('error', (err) => {
    console.error('Database error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      handleDisconnect(); // Reconectar en caso de pérdida de conexión
    } else {
      throw err;
    }
  });
}

handleDisconnect();

// Rutas de tu aplicación
app.get('/debtors', (req, res) => {
  connection.query('SELECT * FROM debtors', (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(results);
    }
  });
});

app.get('/debts/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);

  connection.query('SELECT * FROM debts, debtors WHERE debts.debtor_id = debtors.id AND debts.debtor_id=?;', [id], (err, results) => {
    if (err) {
      console.error('Error fetching debt detail:', err);
      res.status(500).json({ message: 'Internal Server Error' });
      return;
    }

    if (results.length > 0) {
      const uniqueResults = results.map((debt, index) => ({
        ...debt,
        uniqueKey: `${debt.id}-${index}`
      }));
      res.json(uniqueResults);
    } else {
      res.status(404).json({ message: 'Debt not found' });
    }
  });
});

app.listen(port, () => {
  console.log(`Servidor ejecutándose en http://localhost:${port}`);
});
