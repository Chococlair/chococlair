-- Adicionar política para admins deletarem pedidos
CREATE POLICY "Admin deleta pedidos" 
  ON orders FOR DELETE 
  TO authenticated 
  USING (public.is_admin());

-- Adicionar política para admins deletarem itens de pedidos
CREATE POLICY "Admin deleta itens" 
  ON order_items FOR DELETE 
  TO authenticated 
  USING (public.is_admin());

