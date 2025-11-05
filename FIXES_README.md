# CORREÇÕES NECESSÁRIAS - Aplicar no Supabase

## 1. APLICAR POLÍTICA DE DELETE (URGENTE)

Execute no SQL Editor do Supabase:

```sql
-- Verificar se a política já existe
SELECT * FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Admin deleta pedidos';

-- Se não existir, criar:
CREATE POLICY "Admin deleta pedidos" 
  ON orders FOR DELETE 
  TO authenticated 
  USING (public.is_admin());

-- Verificar se a política de itens existe
SELECT * FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Admin deleta itens';

-- Se não existir, criar:
CREATE POLICY "Admin deleta itens" 
  ON order_items FOR DELETE 
  TO authenticated 
  USING (public.is_admin());
```

## 2. HABILITAR REALTIME (URGENTE)

Execute no SQL Editor do Supabase:

```sql
-- Verificar se está habilitado
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'orders';

-- Se não estiver, habilitar:
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
```

## 3. DEPLOY DA EDGE FUNCTION (URGENTE)

1. Acesse: https://supabase.com/dashboard/project/thhdxxotwzfwdqjgxjiw/functions
2. Clique em `create-order`
3. Copie TODO o conteúdo do arquivo `chococlair/supabase/functions/create-order/index.ts`
4. Cole no editor do Dashboard
5. Clique em "Deploy" ou "Save"

## 4. VERIFICAR MB WAY ENUM

Execute no SQL Editor do Supabase:

```sql
-- Verificar se mbway existe
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'payment_method'::regtype 
ORDER BY enumsortorder;

-- Se não existir, adicionar:
ALTER TYPE payment_method ADD VALUE 'mbway';
```

