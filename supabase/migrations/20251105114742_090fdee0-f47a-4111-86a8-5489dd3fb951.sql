-- Criar enums
CREATE TYPE product_category AS ENUM ('eclair', 'chocotone', 'rocambole');
CREATE TYPE rocambole_massa AS ENUM ('chocolate', 'branca');
CREATE TYPE order_status AS ENUM ('pendente', 'confirmado', 'em_preparacao', 'a_caminho', 'concluido');
CREATE TYPE payment_method AS ENUM ('stripe', 'dinheiro');
CREATE TYPE delivery_type AS ENUM ('recolher', 'entrega');

-- Tabela de produtos
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category product_category NOT NULL,
  base_price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  image_url TEXT,
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de pedidos
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_address TEXT,
  delivery_type delivery_type NOT NULL,
  payment_method payment_method NOT NULL,
  status order_status DEFAULT 'pendente',
  subtotal DECIMAL(10, 2) NOT NULL,
  delivery_fee DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de itens do pedido
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  options JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de admins
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO admin_users (email) VALUES ('chococlairpt@gmail.com');

-- Índices
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Função de segurança
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users 
    WHERE email = auth.jwt()->>'email'
  )
$$;

-- Políticas para produtos
CREATE POLICY "Produtos visíveis para todos" 
  ON products FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Admin insere produtos" 
  ON products FOR INSERT 
  TO authenticated 
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin atualiza produtos" 
  ON products FOR UPDATE 
  TO authenticated 
  USING (public.is_admin());

-- Políticas para pedidos
CREATE POLICY "Criar pedidos" 
  ON orders FOR INSERT 
  TO public 
  WITH CHECK (true);

CREATE POLICY "Admin vê pedidos" 
  ON orders FOR SELECT 
  TO authenticated 
  USING (public.is_admin());

CREATE POLICY "Admin atualiza pedidos" 
  ON orders FOR UPDATE 
  TO authenticated 
  USING (public.is_admin());

-- Políticas para itens
CREATE POLICY "Criar itens" 
  ON order_items FOR INSERT 
  TO public 
  WITH CHECK (true);

CREATE POLICY "Admin vê itens" 
  ON order_items FOR SELECT 
  TO authenticated 
  USING (public.is_admin());

-- Políticas para admins
CREATE POLICY "Admin vê admins" 
  ON admin_users FOR SELECT 
  TO authenticated 
  USING (public.is_admin());

-- Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_updated_at 
  BEFORE UPDATE ON orders 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();