# 🔴 CORREÇÕES URGENTES

## ❗ CORREÇÃO 1: Função delete_order (Execute no SQL Editor)

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
```

**Depois de executar, aguarde 10-15 segundos** para o PostgREST atualizar o cache e tente deletar novamente.

---

## ❗ CORREÇÃO 2: Verificar Logs da Edge Function

**MUITO IMPORTANTE:** Preciso ver os logs para descobrir o erro exato!

1. Acesse: https://supabase.com/dashboard/project/thhdxxotwzfwdqjgxjiw/functions/create-order
2. Clique na aba **"Logs"** (não "Editor")
3. Faça um pedido de teste (com dinheiro ou mbway)
4. **IMEDIATAMENTE** volte para a aba "Logs"
5. Veja o que aparece nos logs
6. **Copie e me envie tudo que aparecer nos logs**

Os logs devem mostrar:
- `=== EDGE FUNCTION CHAMADA ===`
- `Payment method received: ...`
- E algum erro específico

---

## ⚠️ Se os logs ainda estiverem vazios:

1. Verifique se o deploy foi feito corretamente
2. Tente fazer deploy novamente
3. Verifique se há algum erro de sintaxe no código

---

## ✅ PRÓXIMOS PASSOS

1. ✅ Execute o SQL acima para corrigir delete_order
2. ✅ Aguarde 10-15 segundos
3. ✅ Tente deletar um pedido
4. ✅ **Verifique os logs da Edge Function** ao fazer um pedido
5. ✅ **Me envie o que aparece nos logs** se ainda houver erro

