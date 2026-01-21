-- =====================================================
-- MIGRAÇÃO: Habilitar mapeamento de premissas para Indicadores
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. Primeiro, remover a constraint NOT NULL de conta_dre_id
-- (necessário para permitir null quando o destino é indicador)
ALTER TABLE mapeamento_premissa_dre 
ALTER COLUMN conta_dre_id DROP NOT NULL;

-- 2. Adicionar a coluna tipo_destino
ALTER TABLE mapeamento_premissa_dre 
ADD COLUMN IF NOT EXISTS tipo_destino VARCHAR(50) DEFAULT 'conta_dre';

-- 3. Adicionar a coluna indicador_id 
-- (referencia a tabela indicadores_operacionais se existir, senão crie sem FK)
DO $$
BEGIN
    -- Tenta adicionar com FK
    BEGIN
        ALTER TABLE mapeamento_premissa_dre 
        ADD COLUMN indicador_id UUID REFERENCES indicadores_operacionais(id) ON DELETE CASCADE;
    EXCEPTION
        WHEN undefined_table THEN
            -- Se tabela indicadores_operacionais não existe, adiciona sem FK
            ALTER TABLE mapeamento_premissa_dre 
            ADD COLUMN indicador_id UUID;
        WHEN duplicate_column THEN
            -- Coluna já existe, ignora
            NULL;
    END;
END $$;

-- 4. Adicionar constraint de validação (remover se já existir)
ALTER TABLE mapeamento_premissa_dre 
DROP CONSTRAINT IF EXISTS chk_destino;

ALTER TABLE mapeamento_premissa_dre 
ADD CONSTRAINT chk_destino CHECK (
    (tipo_destino = 'conta_dre' AND conta_dre_id IS NOT NULL) OR
    (tipo_destino = 'indicador_operacional' AND indicador_id IS NOT NULL) OR
    (tipo_destino IS NULL) -- permitir registros antigos sem tipo_destino
);

-- 5. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_mapeamento_premissa_dre_indicador 
ON mapeamento_premissa_dre(indicador_id);

CREATE INDEX IF NOT EXISTS idx_mapeamento_premissa_dre_tipo_destino 
ON mapeamento_premissa_dre(tipo_destino);

-- 6. Atualizar registros existentes para ter tipo_destino = 'conta_dre'
UPDATE mapeamento_premissa_dre 
SET tipo_destino = 'conta_dre' 
WHERE tipo_destino IS NULL AND conta_dre_id IS NOT NULL;

-- 7. Comentários
COMMENT ON COLUMN mapeamento_premissa_dre.indicador_id IS 'Referência ao indicador operacional quando tipo_destino = indicador_operacional';
COMMENT ON COLUMN mapeamento_premissa_dre.tipo_destino IS 'Tipo de destino: conta_dre ou indicador_operacional';

-- =====================================================
-- RESULTADO ESPERADO: 
-- - conta_dre_id agora é opcional (permite NULL)
-- - indicador_id foi adicionado 
-- - tipo_destino foi adicionado com default 'conta_dre'
-- - Constraint garante que um dos dois (conta_dre_id ou indicador_id) está preenchido
-- =====================================================
