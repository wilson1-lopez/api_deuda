INSERT INTO users (username, email, password) VALUES 
('user1', 'user1@example.com', 'hashedpassword1'),
('user2', 'user2@example.com', 'hashedpassword2'),
('user3', 'user3@example.com', 'hashedpassword3');

-- Insertar deudores de prueba
INSERT INTO debtors (cedula, nombre, apellido, direccion, telefono, foto) VALUES 
('1234567890', 'Juan', 'Pérez', 'Calle Falsa 123', '555-1234', 'https://example.com/photos/juan.jpg'),
('2345678901', 'Ana', 'García', 'Avenida Siempre Viva 742', '555-5678', 'https://example.com/photos/ana.jpg'),
('3456789012', 'Luis', 'Martínez', 'Boulevard del Sol 101', '555-9012', 'https://example.com/photos/luis.jpg');

-- Insertar deudas de prueba
INSERT INTO debts (debtor_id, user_id, detalles, valor, estado, fecha_registro, fecha_pago_acordado) VALUES 
(1, 1, 'Deuda por compra de electrodomésticos', 1500.00, 'pendiente', '2023-07-01', '2024-07-01'),
(2, 1, 'Deuda por préstamo personal', 5000.00, 'pendiente', '2023-06-15', '2024-06-15'),
(3, 2, 'Deuda por compra de vehículo', 25000.00, 'pagado', '2022-05-20', '2023-05-20');