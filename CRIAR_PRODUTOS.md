# 📦 CRIAR PRODUTOS NO BANCO DE DADOS

## ❗ PROBLEMA:
O banco de dados não tem produtos! Por isso o erro "Product not found".

---

## ✅ SOLUÇÃO: Verificar e Criar Produtos

### PASSO 1: Verificar se existem produtos

1. Acesse: https://supabase.com/dashboard/project/thhdxxotwzfwdqjgxjiw/sql/new
2. Execute:
   ```sql
   SELECT * FROM products;
   ```

### PASSO 2: Se não houver produtos, criar alguns produtos de exemplo

Execute no SQL Editor:

```sql
-- Criar alguns éclairs de exemplo
INSERT INTO products (name, category, base_price, description, available) VALUES
('Éclair Chocolate', 'eclair', 2.50, 'Éclair recheado com creme de chocolate', true),
('Éclair Baunilha', 'eclair', 2.50, 'Éclair recheado com creme de baunilha', true),
('Éclair Morango', 'eclair', 2.50, 'Éclair recheado com creme de morango', true),
('Éclair Caramelo', 'eclair', 2.50, 'Éclair recheado com creme de caramelo', true),
('Éclair Pistache', 'eclair', 2.50, 'Éclair recheado com creme de pistache', true),
('Éclair Limão', 'eclair', 2.50, 'Éclair recheado com creme de limão', true);

-- Criar chocotones de exemplo
INSERT INTO products (name, category, base_price, description, available) VALUES
('Chocotone Tradicional', 'chocotones', 15.00, 'Chocotone recheado com gotas de chocolate', true),
('Chocotone Especial', 'chocotones', 18.00, 'Chocotone recheado com frutas cristalizadas', true);

-- Criar rocamboles de exemplo
INSERT INTO products (name, category, base_price, description, available) VALUES
('Rocambole Chocolate', 'rocamboles', 12.00, 'Rocambole com massa de chocolate', true),
('Rocambole Branca', 'rocamboles', 12.00, 'Rocambole com massa branca', true);
```

### PASSO 3: Verificar se os produtos foram criados

```sql
SELECT id, name, category, base_price, available 
FROM products 
ORDER BY category, name;
```

---

## 🔧 IMPORTANTE:

Os IDs dos produtos serão gerados automaticamente. Depois de criar os produtos, você pode precisar:
- Limpar o carrinho no site
- Recarregar a página de produtos
- Adicionar produtos novamente ao carrinho

---

**Depois de criar os produtos, teste fazer um pedido novamente!**

