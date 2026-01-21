-- =====================================================
-- TABELA: grupos_contas
-- Cadastro de grupos para categorização das contas DRE/Balanço
-- =====================================================

CREATE TABLE IF NOT EXISTS grupos_contas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacao_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(20) DEFAULT 'dre' CHECK (tipo IN ('dre', 'balanco', 'ambos')),
    ordem INT DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para consultas por tenant
CREATE INDEX IF NOT EXISTS idx_grupos_contas_organizacao ON grupos_contas(organizacao_id);

-- Índice único para nome por organização (evitar duplicatas)
CREATE UNIQUE INDEX IF NOT EXISTS grupos_contas_unique_nome 
ON grupos_contas (organizacao_id, nome);

-- Trigger para atualizar timestamp
CREATE OR REPLACE TRIGGER trigger_update_grupos_contas
    BEFORE UPDATE ON grupos_contas
    FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

-- RLS (Row Level Security)
ALTER TABLE grupos_contas ENABLE ROW LEVEL SECURITY;

-- Política de acesso por tenant
DROP POLICY IF EXISTS grupos_contas_tenant_policy ON grupos_contas;
CREATE POLICY grupos_contas_tenant_policy ON grupos_contas
    USING (organizacao_id = auth.jwt() ->> 'tenant_id'::text OR 
           auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE grupos_contas IS 'Grupos para categorização das contas DRE e Balanço Patrimonial';
COMMENT ON COLUMN grupos_contas.tipo IS 'Tipo de conta que o grupo categoriza: dre, balanco ou ambos';
