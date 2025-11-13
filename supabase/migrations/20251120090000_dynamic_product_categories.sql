BEGIN;

ALTER TABLE products
  RENAME COLUMN category TO category_enum;

ALTER TABLE products
  ADD COLUMN category TEXT;

UPDATE products
SET category = category_enum::text;

ALTER TABLE products
  ALTER COLUMN category SET NOT NULL;

ALTER TABLE products
  ADD COLUMN category_id UUID;

CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_natal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX product_categories_name_key ON product_categories (lower(name));

INSERT INTO product_categories (name, slug, is_natal) VALUES
  ('Éclairs', 'eclair', false),
  ('Chocotones', 'chocotones', true),
  ('Tortas Chococlair', 'tortas_chococlair', true),
  ('Trutas', 'trutas', true),
  ('Rocamboles', 'rocamboles', true),
  ('Doces de Natal', 'natal_doces', true),
  ('Tabuleiros de Natal', 'natal_tabuleiros', true);

UPDATE products
SET category = CASE category_enum::text
  WHEN 'chocotone' THEN 'chocotones'
  WHEN 'rocambole' THEN 'rocamboles'
  ELSE category_enum::text
END;

UPDATE products p
SET category_id = pc.id
FROM product_categories pc
WHERE p.category = pc.slug;

UPDATE products
SET category_id = (SELECT id FROM product_categories WHERE slug = 'eclair')
WHERE category_id IS NULL;

ALTER TABLE products
  ALTER COLUMN category_id SET NOT NULL;

ALTER TABLE products
  ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES product_categories(id);

ALTER TABLE products
  DROP COLUMN category_enum;

DROP TYPE IF EXISTS product_category;

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_categories_public_select"
  ON product_categories
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "product_categories_admin_insert"
  ON product_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "product_categories_admin_update"
  ON product_categories
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "product_categories_admin_delete"
  ON product_categories
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

COMMIT;

