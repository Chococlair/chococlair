-- Adicionar imagens aos éclairs existentes
-- Execute este SQL no Supabase SQL Editor (https://supabase.com/dashboard/project/thhdxxotwzfwdqjgxjiw/sql/new)

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

-- Para éclairs sem imagem específica (padrão genérico)
UPDATE products 
SET image_url = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80&fit=crop' 
WHERE category = 'eclair' AND image_url IS NULL;

-- Verificar se as imagens foram adicionadas
SELECT id, name, category, image_url 
FROM products 
WHERE category = 'eclair' 
ORDER BY name;

