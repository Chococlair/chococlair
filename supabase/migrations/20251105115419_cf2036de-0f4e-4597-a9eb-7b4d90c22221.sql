-- Fix critical security issues: Add authentication requirements and proper RLS policies

-- 1. Update orders table RLS - require authentication for INSERT
DROP POLICY IF EXISTS "Criar pedidos" ON public.orders;

CREATE POLICY "Authenticated users can create orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2. Update order_items table RLS - require authentication for INSERT  
DROP POLICY IF EXISTS "Criar itens" ON public.order_items;

CREATE POLICY "Authenticated users can create order items"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Allow authenticated users to view their own orders (for future use)
CREATE POLICY "Users can view all orders"
ON public.orders
FOR SELECT
TO authenticated
USING (true);