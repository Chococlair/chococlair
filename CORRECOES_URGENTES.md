# 🔴 CORREÇÕES URGENTES

## ❗ PROBLEMA 1: Função delete_order não encontrada

Execute no SQL Editor:

```sql
-- Recriar a função delete_order
DROP FUNCTION IF EXISTS delete_order(UUID);

CREATE OR REPLACE FUNCTION delete_order(order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem deletar pedidos';
  END IF;
  DELETE FROM orders WHERE id = order_id;
  RETURN FOUND;
END;
$$;

-- Forçar refresh do schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
```

**Depois de executar, aguarde 10 segundos e tente deletar novamente.**

---

## ❗ PROBLEMA 2: Edge Function retornando 400

**IMPORTANTE:** Verifique os logs da Edge Function para ver o erro exato:

1. Acesse: https://supabase.com/dashboard/project/thhdxxotwzfwdqjgxjiw/functions/create-order
2. Clique em "Logs"
3. Faça um pedido de teste
4. Veja os logs que aparecem

**Se os logs ainda estiverem vazios**, pode ser que a função não esteja sendo executada. Nesse caso:

1. Verifique se o deploy foi feito corretamente
2. Tente fazer deploy novamente
3. Verifique se há algum erro de sintaxe no código

---

## ✅ PRÓXIMOS PASSOS

1. Execute o SQL acima para corrigir a função delete_order
2. Aguarde 10 segundos
3. Tente deletar um pedido
4. Verifique os logs da Edge Function ao fazer um pedido
5. Me envie o que aparece nos logs se ainda houver erro

