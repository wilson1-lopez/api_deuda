const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json()); // Para manejar cuerpos JSON

// Configuración de la conexión a MySQL
const connection = mysql.createConnection({
  host: 'booxfva7gkco41ueigpq-mysql.services.clever-cloud.com',
  user: 'u9ogds8egmwvevci',
  password: 'Gbajf9DNtghlzmc5lplR', // Reemplaza esto con tu contraseña de MySQL
  database: 'booxfva7gkco41ueigpq'
});

// Intentar conectar a la base de datos
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
  } else {
    console.log('Connection to the database was successful!');
  }
});

// Ruta para obtener los deudores
app.get('/debtors', (req, res) => {
  connection.query('SELECT * FROM debtors', (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(results);
    }
  });
});

// Ruta para obtener los detalles de las deudas de un deudor específico
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
