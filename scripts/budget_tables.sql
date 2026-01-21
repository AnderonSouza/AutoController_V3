-- =====================================================
-- SCRIPT: Tabelas de Conexão Orçamento → DRE
-- AutoController - Sistema de Gestão Financeira
-- =====================================================

-- 1. TABELA: Mapeamento Premissa → Conta DRE
-- Vincula cada premissa orçamentária às contas da DRE que ela impacta
-- =====================================================
CREATE TABLE IF NOT EXISTS mapeamento_premissa_dre (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    premissa_id UUID NOT NULL REFERENCES premissas_orcamentarias(id) ON DELETE CASCADE,
    conta_dre_id UUID NOT NULL REFERENCES plano_contas_dre(id) ON DELETE CASCADE,
    departamento_id UUID REFERENCES departamentos(id) ON DELETE SET NULL,
    organizacao_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
    fator_multiplicador DECIMAL(15,4) DEFAULT 1.0,
    tipo_calculo VARCHAR(50) DEFAULT 'direto' CHECK (tipo_calculo IN ('direto', 'formula', 'percentual')),
    formula TEXT,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(premissa_id, conta_dre_id, departamento_id, organizacao_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_mapeamento_premissa_dre_premissa ON mapeamento_premissa_dre(premissa_id);
CREATE INDEX IF NOT EXISTS idx_mapeamento_premissa_dre_conta ON mapeamento_premissa_dre(conta_dre_id);
CREATE INDEX IF NOT EXISTS idx_mapeamento_premissa_dre_org ON mapeamento_premissa_dre(organizacao_id);

-- Comentários
COMMENT ON TABLE mapeamento_premissa_dre IS 'Vincula premissas orçamentárias às contas da DRE para cálculo automático do orçamento';
COMMENT ON COLUMN mapeamento_premissa_dre.tipo_calculo IS 'direto: valor da premissa vai direto para a conta; formula: usa expressão matemática; percentual: calcula % sobre base';
COMMENT ON COLUMN mapeamento_premissa_dre.fator_multiplicador IS 'Multiplica o valor da premissa (ex: Volume × Preço = Receita)';


-- 2. TABELA: Premissas Auxiliares (Preço Médio, Margens, etc.)
-- Armazena valores de referência usados nas fórmulas
-- =====================================================
CREATE TABLE IF NOT EXISTS premissas_auxiliares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('preco_medio', 'margem', 'taxa', 'indice', 'outros')),
    conta_dre_id UUID REFERENCES plano_contas_dre(id) ON DELETE SET NULL,
    departamento VARCHAR(100),
    marca_id UUID REFERENCES marcas(id) ON DELETE SET NULL,
    empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
    organizacao_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
    ano INTEGER NOT NULL,
    mes VARCHAR(20),
    valor DECIMAL(18,4) NOT NULL DEFAULT 0,
    origem VARCHAR(50) DEFAULT 'manual' CHECK (origem IN ('manual', 'historico', 'calculado')),
    descricao TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_premissas_aux_org ON premissas_auxiliares(organizacao_id);
CREATE INDEX IF NOT EXISTS idx_premissas_aux_conta ON premissas_auxiliares(conta_dre_id);
CREATE INDEX IF NOT EXISTS idx_premissas_aux_periodo ON premissas_auxiliares(ano, mes);

-- Comentários
COMMENT ON TABLE premissas_auxiliares IS 'Valores de referência para cálculos orçamentários (preço médio, margens, taxas)';


-- 3. TABELA: Orçamento Consolidado por Conta DRE
-- Armazena os valores orçados calculados para cada conta
-- =====================================================
CREATE TABLE IF NOT EXISTS orcamento_contas_dre (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conta_dre_id UUID NOT NULL REFERENCES plano_contas_dre(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    departamento_id UUID REFERENCES departamentos(id) ON DELETE SET NULL,
    organizacao_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
    ano INTEGER NOT NULL,
    mes VARCHAR(20) NOT NULL,
    valor_premissas DECIMAL(18,2) DEFAULT 0,
    valor_historico DECIMAL(18,2) DEFAULT 0,
    valor_manual DECIMAL(18,2) DEFAULT 0,
    valor_importado DECIMAL(18,2) DEFAULT 0,
    valor_total DECIMAL(18,2) GENERATED ALWAYS AS (
        COALESCE(valor_premissas, 0) + 
        COALESCE(valor_historico, 0) + 
        COALESCE(valor_manual, 0) + 
        COALESCE(valor_importado, 0)
    ) STORED,
    origem_calculo VARCHAR(50) DEFAULT 'sistema',
    versao INTEGER DEFAULT 1,
    aprovado BOOLEAN DEFAULT false,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(conta_dre_id, empresa_id, departamento_id, ano, mes, organizacao_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_orcamento_contas_org ON orcamento_contas_dre(organizacao_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_contas_empresa ON orcamento_contas_dre(empresa_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_contas_periodo ON orcamento_contas_dre(ano, mes);
CREATE INDEX IF NOT EXISTS idx_orcamento_contas_conta ON orcamento_contas_dre(conta_dre_id);

-- Comentários
COMMENT ON TABLE orcamento_contas_dre IS 'Valores orçados consolidados por conta DRE, separados por origem (premissas, histórico, manual, importado)';
COMMENT ON COLUMN orcamento_contas_dre.valor_total IS 'Calculado automaticamente como soma das 4 origens';


-- 4. TABELA: Histórico de Cálculos (Auditoria)
-- Registra quando e como os valores foram calculados
-- =====================================================
CREATE TABLE IF NOT EXISTS log_calculo_orcamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orcamento_id UUID REFERENCES orcamento_contas_dre(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    organizacao_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
    acao VARCHAR(50) NOT NULL CHECK (acao IN ('criar', 'atualizar', 'recalcular', 'aprovar', 'excluir')),
    valores_anteriores JSONB,
    valores_novos JSONB,
    detalhes_calculo JSONB,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_log_orcamento_org ON log_calculo_orcamento(organizacao_id);
CREATE INDEX IF NOT EXISTS idx_log_orcamento_data ON log_calculo_orcamento(criado_em DESC);


-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE mapeamento_premissa_dre ENABLE ROW LEVEL SECURITY;
ALTER TABLE premissas_auxiliares ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamento_contas_dre ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_calculo_orcamento ENABLE ROW LEVEL SECURITY;

-- Policies para mapeamento_premissa_dre
CREATE POLICY "Usuários podem ver mapeamentos do seu tenant" 
    ON mapeamento_premissa_dre FOR SELECT 
    USING (organizacao_id = get_user_tenant_id());

CREATE POLICY "Admins podem inserir mapeamentos" 
    ON mapeamento_premissa_dre FOR INSERT 
    WITH CHECK (is_admin_of_tenant(organizacao_id));

CREATE POLICY "Admins podem atualizar mapeamentos" 
    ON mapeamento_premissa_dre FOR UPDATE 
    USING (is_admin_of_tenant(organizacao_id));

CREATE POLICY "Admins podem excluir mapeamentos" 
    ON mapeamento_premissa_dre FOR DELETE 
    USING (is_admin_of_tenant(organizacao_id));

-- Policies para premissas_auxiliares
CREATE POLICY "Usuários podem ver premissas auxiliares do seu tenant" 
    ON premissas_auxiliares FOR SELECT 
    USING (organizacao_id = get_user_tenant_id());

CREATE POLICY "Admins podem gerenciar premissas auxiliares" 
    ON premissas_auxiliares FOR ALL 
    USING (is_admin_of_tenant(organizacao_id));

-- Policies para orcamento_contas_dre
CREATE POLICY "Usuários podem ver orçamento do seu tenant" 
    ON orcamento_contas_dre FOR SELECT 
    USING (organizacao_id = get_user_tenant_id());

CREATE POLICY "Admins podem gerenciar orçamento" 
    ON orcamento_contas_dre FOR ALL 
    USING (is_admin_of_tenant(organizacao_id));

-- Policies para log_calculo_orcamento
CREATE POLICY "Usuários podem ver logs do seu tenant" 
    ON log_calculo_orcamento FOR SELECT 
    USING (organizacao_id = get_user_tenant_id());

CREATE POLICY "Sistema pode inserir logs" 
    ON log_calculo_orcamento FOR INSERT 
    WITH CHECK (organizacao_id = get_user_tenant_id());


-- =====================================================
-- FUNÇÃO: Calcular Orçamento a partir de Premissas
-- =====================================================
CREATE OR REPLACE FUNCTION calcular_orcamento_premissas(
    p_organizacao_id UUID,
    p_ano INTEGER,
    p_mes VARCHAR(20) DEFAULT NULL
)
RETURNS TABLE(
    conta_dre_id UUID,
    empresa_id UUID,
    departamento_id UUID,
    valor_calculado DECIMAL(18,2)
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.conta_dre_id,
        e.id AS empresa_id,
        m.departamento_id,
        SUM(
            CASE m.tipo_calculo
                WHEN 'direto' THEN vp.valor * m.fator_multiplicador
                WHEN 'percentual' THEN vp.valor * m.fator_multiplicador / 100
                ELSE vp.valor * m.fator_multiplicador
            END
        )::DECIMAL(18,2) AS valor_calculado
    FROM mapeamento_premissa_dre m
    JOIN valores_premissas vp ON vp.premissa_id = m.premissa_id
    JOIN empresas e ON e.id = vp.empresa_id
    WHERE m.organizacao_id = p_organizacao_id
      AND m.ativo = true
      AND vp.ano = p_ano
      AND (p_mes IS NULL OR vp.mes = p_mes)
    GROUP BY m.conta_dre_id, e.id, m.departamento_id;
END;
$$;

COMMENT ON FUNCTION calcular_orcamento_premissas IS 'Calcula valores orçamentários a partir das premissas mapeadas para as contas DRE';


-- =====================================================
-- TRIGGER: Atualizar timestamp de modificação
-- =====================================================
CREATE OR REPLACE FUNCTION update_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger nas novas tabelas
DROP TRIGGER IF EXISTS trigger_update_mapeamento_premissa ON mapeamento_premissa_dre;
CREATE TRIGGER trigger_update_mapeamento_premissa
    BEFORE UPDATE ON mapeamento_premissa_dre
    FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

DROP TRIGGER IF EXISTS trigger_update_premissas_aux ON premissas_auxiliares;
CREATE TRIGGER trigger_update_premissas_aux
    BEFORE UPDATE ON premissas_auxiliares
    FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

DROP TRIGGER IF EXISTS trigger_update_orcamento_contas ON orcamento_contas_dre;
CREATE TRIGGER trigger_update_orcamento_contas
    BEFORE UPDATE ON orcamento_contas_dre
    FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();


-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON mapeamento_premissa_dre TO authenticated;
GRANT ALL ON premissas_auxiliares TO authenticated;
GRANT ALL ON orcamento_contas_dre TO authenticated;
GRANT ALL ON log_calculo_orcamento TO authenticated;
