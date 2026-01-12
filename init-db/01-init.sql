-- Script de inicialización de la base de datos
-- Este archivo se ejecuta automáticamente cuando se crea el contenedor de PostgreSQL

-- Crear extensiones útiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de ejemplo: books
CREATE TABLE IF NOT EXISTS books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    isbn VARCHAR(13) UNIQUE,
    published_date DATE,
    description TEXT,
    price DECIMAL(10, 2),
    stock INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de ejemplo: categories
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de relación: book_categories
CREATE TABLE IF NOT EXISTS book_categories (
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (book_id, category_id)
);

-- Índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);

-- Datos de ejemplo
INSERT INTO categories (name, description) VALUES
    ('Ficción', 'Libros de ficción literaria'),
    ('No Ficción', 'Libros de no ficción'),
    ('Tecnología', 'Libros sobre tecnología y programación'),
    ('Ciencia', 'Libros científicos')
ON CONFLICT (name) DO NOTHING;

-- Insertar algunos libros de ejemplo
INSERT INTO books (title, author, isbn, published_date, description, price, stock) VALUES
    ('Clean Code', 'Robert C. Martin', '9780132350884', '2008-08-01', 'Un manual de estilo para el desarrollo ágil de software', 45.99, 10),
    ('The Pragmatic Programmer', 'Andrew Hunt, David Thomas', '9780135957059', '2019-09-13', 'Tu viaje hacia la maestría', 42.50, 15),
    ('Design Patterns', 'Gang of Four', '9780201633610', '1994-10-31', 'Elementos de software orientado a objetos reutilizable', 54.99, 8)
ON CONFLICT (isbn) DO NOTHING;

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at en books
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentarios en las tablas
COMMENT ON TABLE books IS 'Tabla principal de libros';
COMMENT ON TABLE categories IS 'Categorías de libros';
COMMENT ON TABLE book_categories IS 'Relación muchos a muchos entre libros y categorías';
