-- Script para popular organizacao_id na tabela centros_resultado
-- Grupo Viamar ID: 2d34f577-049c-46cb-9b4c-99a68134cd86
-- Executar no Supabase SQL Editor

-- 1. Verificar registros com organizacao_id NULL antes da atualização
SELECT COUNT(*) as registros_null 
FROM centros_resultado 
WHERE organizacao_id IS NULL;

-- 2. Atualizar todos os registros NULL com o ID do Grupo Viamar
UPDATE centros_resultado 
SET organizacao_id = '2d34f577-049c-46cb-9b4c-99a68134cd86'::uuid
WHERE organizacao_id IS NULL;

-- 3. Verificar se a atualização foi bem sucedida
SELECT COUNT(*) as total_registros,
       COUNT(organizacao_id) as com_organizacao,
       COUNT(*) - COUNT(organizacao_id) as sem_organizacao
FROM centros_resultado;

-- 4. Mostrar os registros atualizados
SELECT id, codigo, nome, organizacao_id 
FROM centros_resultado 
LIMIT 10;
