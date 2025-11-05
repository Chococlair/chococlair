# 🔧 CORREÇÕES COMPLETAS - Execute no Supabase

## ❗ PROBLEMA 1: REALTIME NÃO FUNCIONA

**Causa:** Falta REPLICA IDENTITY na tabela `orders`. Sem isso, o Realtime não detecta INSERTs.

**Solução:** Execute no SQL Editor:

```sql
-- HABILITAR REPLICA IDENTITY (OBRIGATÓRIO PARA REALTIME)
ALTER TABLE orders REPLICA IDENTITY FULL;
```

**Verificar se funcionou:**
```sql
SELECT relreplident FROM pg_class WHERE relname = 'orders';
-- Deve retornar: 'f' (full)
```

---

## ❗ PROBLEMA 2: DELETE NÃO FUNCIONA

**Causa:** A política RLS pode estar bloqueando ou o DELETE não retorna dados.

**Solução:** Execute no SQL Editor:

```sql
-- Verificar se a política existe
SELECT * FROM pg_policies 
WHERE tablename = 'orders' 
AND policyname = 'Admin deleta pedidos';

-- Se não existir, criar:
CREATE POLICY "Admin deleta pedidos" 
  ON orders FOR DELETE 
  TO authenticated 
  USING (public.is_admin());
```

---

## ❗ PROBLEMA 3: EDGE FUNCTION LOGS VAZIOS

**Causa:** A Edge Function pode não estar sendo chamada ou os logs não aparecem.

**Solução:** 
1. **FAÇA DEPLOY NOVAMENTE** da Edge Function com o código atualizado (já tem logs detalhados)
2. Verifique se as variáveis de ambiente estão configuradas no Dashboard:
   - Vá em: Settings → Edge Functions → Environment Variables
   - Deve ter: `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`

---

## ❗ PROBLEMA 4: MB WAY NÃO FUNCIONA

**Causa:** O enum pode não estar atualizado ou há erro na inserção.

**Solução:** Execute no SQL Editor:

```sql
-- Verificar se mbway existe
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'payment_method'::regtype 
ORDER BY enumsortorder;

-- Se não existir, adicionar:
ALTER TYPE payment_method ADD VALUE 'mbway';
```

---

## ✅ CHECKLIST COMPLETO

Execute na ordem:

1. ✅ **REPLICA IDENTITY** (OBRIGATÓRIO):
   ```sql
   ALTER TABLE orders REPLICA IDENTITY FULL;
   ```

2. ✅ **Política DELETE** (se não existir):
   ```sql
   CREATE POLICY "Admin deleta pedidos" 
     ON orders FOR DELETE 
     TO authenticated 
     USING (public.is_admin());
   ```

3. ✅ **Deploy Edge Function**:
   - Copie o código de `chococlair/supabase/functions/create-order/index.ts`
   - Cole no Dashboard e faça deploy

4. ✅ **Verificar MB Way enum**:
   ```sql
   SELECT enumlabel FROM pg_enum WHERE enumtypid = 'payment_method'::regtype;
   ```

---

## 🧪 TESTE APÓS CORREÇÕES

1. **Realtime:**
   - Abra painel admin
   - Console deve mostrar: "✅✅✅ REALTIME ATIVO"
   - Faça pedido em outra aba
   - Deve aparecer som e notificação automaticamente

2. **Delete:**
   - Tente deletar um pedido
   - Deve funcionar sem erro

3. **MB Way:**
   - Faça pedido com MB Way
   - Verifique os logs da Edge Function
   - Deve funcionar

