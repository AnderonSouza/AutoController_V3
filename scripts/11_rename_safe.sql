-- =====================================================
-- RENOMEAR GRUPO_ECONOMICO PARA ORGANIZACAO (SEGURO)
-- =====================================================
-- Este script verifica se as colunas existem antes de renomear
-- =====================================================

-- PARTE 1: Verificar quais tabelas têm a coluna grupo_economico_id
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE column_name = 'grupo_economico_id' 
AND table_schema = 'public'
ORDER BY table_name;
