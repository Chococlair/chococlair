-- Criar função RPC para deletar pedidos (bypassa RLS usando SECURITY DEFINER)
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

