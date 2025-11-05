-- Habilitar REPLICA IDENTITY para Realtime funcionar corretamente
-- Isso é necessário para que o Realtime possa detectar INSERTs na tabela
ALTER TABLE orders REPLICA IDENTITY FULL;

