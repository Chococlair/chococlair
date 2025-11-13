-- Adicionar imagens para TODOS os produtos (éclairs, chocotones e rocamboles)
-- Execute este SQL no Supabase SQL Editor (https://supabase.com/dashboard/project/thhdxxotwzfwdqjgxjiw/sql/new)

-- ============================================
-- ÉCLAIRS
-- ============================================

-- Éclair Chocolate / Kinder Bueno
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80&fit=crop' 
WHERE category = 'eclair' AND (name LIKE '%Chocolate%' OR name LIKE '%Kinder Bueno%');

-- Éclair Baunilha / Ninho
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=800&q=80&fit=crop' 
WHERE category = 'eclair' AND (name LIKE '%Baunilha%' OR name LIKE '%Ninho%');

-- Éclair Morango / Frutos Vermelhos
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&q=80&fit=crop' 
WHERE category = 'eclair' AND (name LIKE '%Morango%' OR name LIKE '%Frutos%');

-- Éclair Caramelo / Doce de Leite
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=800&q=80&fit=crop' 
WHERE category = 'eclair' AND (name LIKE '%Caramelo%' OR name LIKE '%Doce de Leite%');

-- Éclair Pistache
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80&fit=crop' 
WHERE category = 'eclair' AND name LIKE '%Pistache%';

-- Éclair Limão / Oreo
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=800&q=80&fit=crop' 
WHERE category = 'eclair' AND (name LIKE '%Limão%' OR name LIKE '%Oreo%');

-- Éclairs sem imagem específica (padrão genérico)
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80&fit=crop' 
WHERE category = 'eclair' AND image_url IS NULL;

-- ============================================
-- CHOCOTONES
-- ============================================

UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80&fit=crop' 
WHERE category = 'chocotones' AND image_url IS NULL;

-- ============================================
-- ROCAMBOLES
-- ============================================

UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80&fit=crop' 
WHERE category = 'rocamboles' AND image_url IS NULL;

-- ============================================
-- VERIFICAR RESULTADOS
-- ============================================

SELECT id, name, category, image_url 
FROM products 
ORDER BY category, name;

