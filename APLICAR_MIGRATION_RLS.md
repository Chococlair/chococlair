# 🔧 APLICAR MIGRATION PARA PERMITIR LEITURA DE PEDIDOS

## ❗ PROBLEMA:
A página de tracking não consegue carregar pedidos porque as políticas RLS não permitem leitura pública.

## ✅ SOLUÇÃO:

Execute no SQL Editor do Supabase:

```sql
-- Permitir que qualquer pessoa (public) possa ler pedidos pelo ID
-- Isso é necessário para a página de tracking funcionar sem login

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Public can read orders by id" ON orders;
DROP POLICY IF EXISTS "Users can view all orders" ON orders;

-- Criar política para permitir leitura pública de pedidos
CREATE POLICY "Public can read orders by id"
  ON orders FOR SELECT
  TO public
  USING (true);

-- Também permitir leitura pública dos itens do pedido
DROP POLICY IF EXISTS "Public can read order items" ON order_items;

CREATE POLICY "Public can read order items"
  ON order_items FOR SELECT
  TO public
  USING (true);

-- Garantir que a criação de pedidos também funcione para public (via Edge Function)
DROP POLICY IF EXISTS "Authenticated users can create orders" ON orders;
DROP POLICY IF EXISTS "Criar pedidos" ON orders;

CREATE POLICY "Public can create orders"
  ON orders FOR INSERT
  TO public
  WITH CHECK (true);

-- Garantir que a criação de itens também funcione para public
DROP POLICY IF EXISTS "Authenticated users can create order items" ON order_items;
DROP POLICY IF EXISTS "Criar itens" ON order_items;

CREATE POLICY "Public can create order items"
  ON order_items FOR INSERT
  TO public
  WITH CHECK (true);
```

---

**Depois de executar, teste novamente fazer um pedido e verificar se a página de tracking carrega!**

