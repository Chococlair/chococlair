# 🔧 SOLUÇÃO COMPLETA - PASSO A PASSO

## ⚠️ PROBLEMA: Logs da Edge Function vazios = Edge Function não está sendo executada!

Isso pode ser porque:
1. A Edge Function não foi deployada corretamente
2. As variáveis de ambiente não estão configuradas
3. Há um erro antes mesmo de chegar na função

---

## ✅ SOLUÇÃO 1: REPLICA IDENTITY (OBRIGATÓRIO PARA REALTIME)

Execute no SQL Editor do Supabase:

```sql
ALTER TABLE orders REPLICA IDENTITY FULL;
```

**Verificar:**
```sql
SELECT relreplident FROM pg_class WHERE relname = 'orders';
-- Deve retornar: 'f' (full)
```

---

## ✅ SOLUÇÃO 2: CRIAR FUNÇÃO RPC PARA DELETAR (bypassa RLS)

Execute no SQL Editor:

```sql
CREATE OR REPLACE FUNCTION delete_order(order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário é admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem deletar pedidos';
  END IF;

  -- Deletar o pedido (o CASCADE vai deletar os itens automaticamente)
  DELETE FROM orders WHERE id = order_id;
  
  -- Retornar true se deletou, false caso contrário
  RETURN FOUND;
END;
$$;
```

---

## ✅ SOLUÇÃO 3: CONFIGURAR VARIÁVEIS DE AMBIENTE DA EDGE FUNCTION

1. Acesse: https://supabase.com/dashboard/project/thhdxxotwzfwdqjgxjiw/settings/functions
2. Ou vá em: Settings → Edge Functions → Environment Variables
3. Adicione as variáveis (se não existirem):
   - `SUPABASE_URL` = `https://hhurohtltxusbshnpqvw.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = (pegue no Dashboard → Settings → API → service_role key)

---

## ✅ SOLUÇÃO 4: DEPLOY DA EDGE FUNCTION

1. Acesse: https://supabase.com/dashboard/project/thhdxxotwzfwdqjgxjiw/functions/create-order
2. Clique em "Edit" ou no editor
3. **COPIE TODO** o conteúdo de `chococlair/supabase/functions/create-order/index.ts`
4. Cole no editor
5. Clique em "Deploy" ou "Save"
6. Aguarde a confirmação

---

## ✅ SOLUÇÃO 5: VERIFICAR MB WAY ENUM

Execute no SQL Editor:

```sql
-- Verificar valores do enum
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'payment_method'::regtype 
ORDER BY enumsortorder;

-- Se não tiver 'mbway', adicionar:
ALTER TYPE payment_method ADD VALUE 'mbway';
```

---

## 🧪 TESTE FINAL

Após executar TODAS as correções acima:

1. **Realtime:**
   - Abra painel admin
   - Console deve mostrar: "✅✅✅ REALTIME ATIVO"
   - Faça pedido em outra aba
   - Deve aparecer som e notificação

2. **Delete:**
   - Tente deletar um pedido
   - Deve funcionar

3. **MB Way:**
   - Faça pedido com MB Way
   - Verifique os logs da Edge Function (agora devem aparecer!)
   - Deve funcionar

---

## 📝 CHECKLIST RÁPIDO

- [ ] Execute `ALTER TABLE orders REPLICA IDENTITY FULL;`
- [ ] Crie a função RPC `delete_order`
- [ ] Configure variáveis de ambiente da Edge Function
- [ ] Faça deploy da Edge Function atualizada
- [ ] Verifique se mbway existe no enum

