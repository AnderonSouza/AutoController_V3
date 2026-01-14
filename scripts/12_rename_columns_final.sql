-- =====================================================
-- RENOMEAR COLUNA grupo_economico_id PARA organizacao_id
-- =====================================================
-- Apenas nas tabelas que realmente têm a coluna
-- =====================================================

-- 1. RENOMEAR COLUNAS NAS 16 TABELAS IDENTIFICADAS

ALTER TABLE anexos_fechamento RENAME COLUMN grupo_economico_id TO organizacao_id;
ALTER TABLE centros_resultado RENAME COLUMN grupo_economico_id TO organizacao_id;
ALTER TABLE chamados RENAME COLUMN grupo_economico_id TO organizacao_id;
ALTER TABLE ciclos_fechamento RENAME COLUMN grupo_economico_id TO organizacao_id;
ALTER TABLE comentarios_fechamento RENAME COLUMN grupo_economico_id TO organizacao_id;
ALTER TABLE formulas_calculo RENAME COLUMN grupo_economico_id TO organizacao_id;
ALTER TABLE mapeamento_contas RENAME COLUMN grupo_economico_id TO organizacao_id;
ALTER TABLE mensagens_chamado RENAME COLUMN grupo_economico_id TO organizacao_id;
ALTER TABLE metas_indicadores RENAME COLUMN grupo_economico_id TO organizacao_id;
ALTER TABLE modelos_relatorios RENAME COLUMN grupo_economico_id TO organizacao_id;
ALTER TABLE modelos_tarefas_fechamento RENAME COLUMN grupo_economico_id TO organizacao_id;
ALTER TABLE orcamento RENAME COLUMN grupo_economico_id TO organizacao_id;
ALTER TABLE plano_contas RENAME COLUMN grupo_economico_id TO organizacao_id;
ALTER TABLE tarefas_fechamento RENAME COLUMN grupo_economico_id TO organizacao_id;
ALTER TABLE temas_interface RENAME COLUMN grupo_economico_id TO organizacao_id;
ALTER TABLE valores_premissas RENAME COLUMN grupo_economico_id TO organizacao_id;

-- 2. RENOMEAR NA TABELA USUARIOS (se existir)
ALTER TABLE usuarios RENAME COLUMN grupo_economico_id TO organizacao_id;

-- 3. VERIFICAR SE FUNCIONOU
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE column_name = 'organizacao_id' 
AND table_schema = 'public'
ORDER BY table_name;
