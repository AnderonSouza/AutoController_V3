-- =====================================================
-- MIGRAÇÃO: Adicionar coluna indicador_id à tabela mapeamento_premissa_dre
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. Adicionar a coluna indicador_id
ALTER TABLE mapeamento_premissa_dre 
ADD COLUMN IF NOT EXISTS indicador_id UUID REFERENCES indicadores_operacionais(id) ON DELETE CASCADE;

-- 2. Adicionar a coluna tipo_destino se não existir
ALTER TABLE mapeamento_premissa_dre 
ADD COLUMN IF NOT EXISTS tipo_destino VARCHAR(50) DEFAULT 'conta_dre';

-- 3. Adicionar constraint de validação
ALTER TABLE mapeamento_premissa_dre 
DROP CONSTRAINT IF EXISTS chk_destino;

ALTER TABLE mapeamento_premissa_dre 
ADD CONSTRAINT chk_destino CHECK (
    (tipo_destino = 'conta_dre' AND conta_dre_id IS NOT NULL) OR
    (tipo_destino = 'indicador_operacional' AND indicador_id IS NOT NULL)
);

-- 4. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_mapeamento_premissa_dre_indicador ON mapeamento_premissa_dre(indicador_id);

-- 5. Comentário
COMMENT ON COLUMN mapeamento_premissa_dre.indicador_id IS 'Referência ao indicador operacional quando tipo_destino = indicador_operacional';
COMMENT ON COLUMN mapeamento_premissa_dre.tipo_destino IS 'Tipo de destino: conta_dre ou indicador_operacional';
