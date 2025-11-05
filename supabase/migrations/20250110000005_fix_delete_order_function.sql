-- Recriar a função delete_order com nome exato do parâmetro
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

