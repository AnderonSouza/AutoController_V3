-- ============================================================
-- SCRIPT DE CRIAÇÃO: SISTEMA DE DADOS OPERACIONAIS
-- Execute este script no Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. TABELA: indicadores_operacionais
-- Cadastro de tipos de KPIs operacionais
-- ============================================================
CREATE TABLE IF NOT EXISTS indicadores_operacionais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacao_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
    codigo VARCHAR(50) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(100), -- Ex: "Comercial", "Oficina", "Estoque", "Pós-Venda"
    unidade_medida VARCHAR(50) DEFAULT 'Unidades', -- Ex: "Unidades", "R$", "%", "Horas"
    natureza VARCHAR(50) DEFAULT 'volume', -- volume, eficiencia, qualidade, financeiro
    escopo VARCHAR(50) DEFAULT 'empresa', -- empresa, marca, departamento, loja, consolidado
    permite_meta BOOLEAN DEFAULT TRUE,
    ativo BOOLEAN DEFAULT TRUE,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organizacao_id, codigo)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_indicadores_operacionais_org ON indicadores_operacionais(organizacao_id);
CREATE INDEX IF NOT EXISTS idx_indicadores_operacionais_categoria ON indicadores_operacionais(organizacao_id, categoria);
CREATE INDEX IF NOT EXISTS idx_indicadores_operacionais_ativo ON indicadores_operacionais(organizacao_id, ativo);

-- Comentários
COMMENT ON TABLE indicadores_operacionais IS 'Cadastro de indicadores operacionais (KPIs não-financeiros)';
COMMENT ON COLUMN indicadores_operacionais.codigo IS 'Código único do indicador (ex: VOL_VENDAS_VN)';
COMMENT ON COLUMN indicadores_operacionais.escopo IS 'Nível de granularidade: empresa, marca, departamento, loja';
COMMENT ON COLUMN indicadores_operacionais.natureza IS 'Tipo do indicador: volume, eficiencia, qualidade, financeiro';

-- ============================================================
-- 2. TABELA: valores_operacionais
-- Valores mensais dos indicadores por empresa/marca/departamento
-- ============================================================
CREATE TABLE IF NOT EXISTS valores_operacionais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacao_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
    indicador_id UUID NOT NULL REFERENCES indicadores_operacionais(id) ON DELETE CASCADE,
    ano INTEGER NOT NULL,
    mes VARCHAR(20) NOT NULL, -- JANEIRO, FEVEREIRO, etc.
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    marca_id UUID REFERENCES marcas(id) ON DELETE CASCADE,
    departamento_id UUID REFERENCES departamentos(id) ON DELETE CASCADE,
    valor NUMERIC(18, 4) NOT NULL DEFAULT 0,
    meta NUMERIC(18, 4), -- Valor meta/orçado (opcional)
    origem VARCHAR(50) DEFAULT 'manual', -- manual, importacao, api, calculado
    status VARCHAR(50) DEFAULT 'rascunho', -- rascunho, confirmado, bloqueado
    observacao TEXT,
    preenchido_por UUID REFERENCES usuarios(id),
    confirmado_por UUID REFERENCES usuarios(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organizacao_id, indicador_id, ano, mes, empresa_id, marca_id, departamento_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_valores_operacionais_org ON valores_operacionais(organizacao_id);
CREATE INDEX IF NOT EXISTS idx_valores_operacionais_indicador ON valores_operacionais(indicador_id);
CREATE INDEX IF NOT EXISTS idx_valores_operacionais_periodo ON valores_operacionais(organizacao_id, ano, mes);
CREATE INDEX IF NOT EXISTS idx_valores_operacionais_empresa ON valores_operacionais(empresa_id);
CREATE INDEX IF NOT EXISTS idx_valores_operacionais_marca ON valores_operacionais(marca_id);
CREATE INDEX IF NOT EXISTS idx_valores_operacionais_depto ON valores_operacionais(departamento_id);

-- Comentários
COMMENT ON TABLE valores_operacionais IS 'Valores mensais dos indicadores operacionais';
COMMENT ON COLUMN valores_operacionais.mes IS 'Mês em MAIÚSCULAS: JANEIRO, FEVEREIRO, etc.';
COMMENT ON COLUMN valores_operacionais.origem IS 'Origem do dado: manual, importacao, api, calculado';

-- ============================================================
-- 3. TABELA: formulas_operacionais
-- Fórmulas para linhas calculadas (Ticket Médio, Margem, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS formulas_operacionais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacao_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
    codigo VARCHAR(50) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    expressao TEXT NOT NULL, -- Ex: "FIN[vendas_veiculos] / OPE[volume_vendas]"
    categoria VARCHAR(100), -- Ex: "Comercial", "Eficiência", "Margem"
    unidade_medida VARCHAR(50) DEFAULT 'R$',
    casas_decimais INTEGER DEFAULT 2,
    formato_exibicao VARCHAR(20) DEFAULT 'numero', -- numero, percentual, moeda
    escopo VARCHAR(50) DEFAULT 'empresa', -- empresa, marca, departamento, consolidado
    ordem INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organizacao_id, codigo)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_formulas_operacionais_org ON formulas_operacionais(organizacao_id);
CREATE INDEX IF NOT EXISTS idx_formulas_operacionais_ativo ON formulas_operacionais(organizacao_id, ativo);

-- Comentários
COMMENT ON TABLE formulas_operacionais IS 'Fórmulas para cálculo de indicadores derivados';
COMMENT ON COLUMN formulas_operacionais.expressao IS 'Expressão de cálculo usando tokens: FIN[codigo], OPE[codigo], FORM[codigo]';

-- ============================================================
-- 4. TABELA: formulas_operacionais_dependencias
-- Grafo de dependências para validação e ordenação
-- ============================================================
CREATE TABLE IF NOT EXISTS formulas_operacionais_dependencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacao_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
    formula_id UUID NOT NULL REFERENCES formulas_operacionais(id) ON DELETE CASCADE,
    referencia_tipo VARCHAR(20) NOT NULL, -- FINANCEIRO, OPERACIONAL, FORMULA
    referencia_codigo VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_formulas_deps_formula ON formulas_operacionais_dependencias(formula_id);
CREATE INDEX IF NOT EXISTS idx_formulas_deps_ref ON formulas_operacionais_dependencias(referencia_tipo, referencia_codigo);

-- Comentários
COMMENT ON TABLE formulas_operacionais_dependencias IS 'Dependências das fórmulas para validação de ciclos e ordem de cálculo';

-- ============================================================
-- 5. TABELA: relatorio_linhas_operacionais
-- Mapeamento de indicadores/fórmulas para linhas de relatório
-- ============================================================
CREATE TABLE IF NOT EXISTS relatorio_linhas_operacionais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacao_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
    linha_relatorio_id UUID NOT NULL REFERENCES linhas_relatorio(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL, -- INDICADOR, FORMULA
    indicador_id UUID REFERENCES indicadores_operacionais(id) ON DELETE CASCADE,
    formula_id UUID REFERENCES formulas_operacionais(id) ON DELETE CASCADE,
    ordem INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(linha_relatorio_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_rel_linhas_op_org ON relatorio_linhas_operacionais(organizacao_id);
CREATE INDEX IF NOT EXISTS idx_rel_linhas_op_linha ON relatorio_linhas_operacionais(linha_relatorio_id);

-- Comentários
COMMENT ON TABLE relatorio_linhas_operacionais IS 'Vincula indicadores ou fórmulas às linhas dos relatórios';

-- ============================================================
-- 6. POLÍTICAS RLS (Row Level Security)
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE indicadores_operacionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE valores_operacionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE formulas_operacionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE formulas_operacionais_dependencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorio_linhas_operacionais ENABLE ROW LEVEL SECURITY;

-- Políticas para indicadores_operacionais
CREATE POLICY indicadores_operacionais_tenant_select ON indicadores_operacionais
    FOR SELECT USING (
        organizacao_id IN (
            SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
        )
    );

CREATE POLICY indicadores_operacionais_tenant_insert ON indicadores_operacionais
    FOR INSERT WITH CHECK (
        organizacao_id IN (
            SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
        )
    );

CREATE POLICY indicadores_operacionais_tenant_update ON indicadores_operacionais
    FOR UPDATE USING (
        organizacao_id IN (
            SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
        )
    );

CREATE POLICY indicadores_operacionais_tenant_delete ON indicadores_operacionais
    FOR DELETE USING (
        organizacao_id IN (
            SELECT organizacao_id FROM usuarios 
            WHERE id = auth.uid() AND perfil IN ('SuperAdmin', 'Admin')
        )
    );

-- Políticas para valores_operacionais
CREATE POLICY valores_operacionais_tenant_select ON valores_operacionais
    FOR SELECT USING (
        organizacao_id IN (
            SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
        )
    );

CREATE POLICY valores_operacionais_tenant_insert ON valores_operacionais
    FOR INSERT WITH CHECK (
        organizacao_id IN (
            SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
        )
    );

CREATE POLICY valores_operacionais_tenant_update ON valores_operacionais
    FOR UPDATE USING (
        organizacao_id IN (
            SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
        )
    );

CREATE POLICY valores_operacionais_tenant_delete ON valores_operacionais
    FOR DELETE USING (
        organizacao_id IN (
            SELECT organizacao_id FROM usuarios 
            WHERE id = auth.uid() AND perfil IN ('SuperAdmin', 'Admin')
        )
    );

-- Políticas para formulas_operacionais
CREATE POLICY formulas_operacionais_tenant_select ON formulas_operacionais
    FOR SELECT USING (
        organizacao_id IN (
            SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
        )
    );

CREATE POLICY formulas_operacionais_tenant_insert ON formulas_operacionais
    FOR INSERT WITH CHECK (
        organizacao_id IN (
            SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
        )
    );

CREATE POLICY formulas_operacionais_tenant_update ON formulas_operacionais
    FOR UPDATE USING (
        organizacao_id IN (
            SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
        )
    );

CREATE POLICY formulas_operacionais_tenant_delete ON formulas_operacionais
    FOR DELETE USING (
        organizacao_id IN (
            SELECT organizacao_id FROM usuarios 
            WHERE id = auth.uid() AND perfil IN ('SuperAdmin', 'Admin')
        )
    );

-- Políticas para formulas_operacionais_dependencias
CREATE POLICY formulas_deps_tenant_select ON formulas_operacionais_dependencias
    FOR SELECT USING (
        organizacao_id IN (
            SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
        )
    );

CREATE POLICY formulas_deps_tenant_insert ON formulas_operacionais_dependencias
    FOR INSERT WITH CHECK (
        organizacao_id IN (
            SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
        )
    );

CREATE POLICY formulas_deps_tenant_update ON formulas_operacionais_dependencias
    FOR UPDATE USING (
        organizacao_id IN (
            SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
        )
    );

CREATE POLICY formulas_deps_tenant_delete ON formulas_operacionais_dependencias
    FOR DELETE USING (
        organizacao_id IN (
            SELECT organizacao_id FROM usuarios 
            WHERE id = auth.uid() AND perfil IN ('SuperAdmin', 'Admin')
        )
    );

-- Políticas para relatorio_linhas_operacionais
CREATE POLICY rel_linhas_op_tenant_select ON relatorio_linhas_operacionais
    FOR SELECT USING (
        organizacao_id IN (
            SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
        )
    );

CREATE POLICY rel_linhas_op_tenant_insert ON relatorio_linhas_operacionais
    FOR INSERT WITH CHECK (
        organizacao_id IN (
            SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
        )
    );

CREATE POLICY rel_linhas_op_tenant_update ON relatorio_linhas_operacionais
    FOR UPDATE USING (
        organizacao_id IN (
            SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
        )
    );

CREATE POLICY rel_linhas_op_tenant_delete ON relatorio_linhas_operacionais
    FOR DELETE USING (
        organizacao_id IN (
            SELECT organizacao_id FROM usuarios 
            WHERE id = auth.uid() AND perfil IN ('SuperAdmin', 'Admin')
        )
    );

-- ============================================================
-- 7. TRIGGERS PARA UPDATED_AT
-- ============================================================

-- Função genérica para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_indicadores_operacionais_updated_at
    BEFORE UPDATE ON indicadores_operacionais
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_valores_operacionais_updated_at
    BEFORE UPDATE ON valores_operacionais
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_formulas_operacionais_updated_at
    BEFORE UPDATE ON formulas_operacionais
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_relatorio_linhas_operacionais_updated_at
    BEFORE UPDATE ON relatorio_linhas_operacionais
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 8. DADOS DE EXEMPLO (OPCIONAL - descomente se quiser testar)
-- ============================================================

/*
-- Exemplo de indicadores operacionais
INSERT INTO indicadores_operacionais (organizacao_id, codigo, nome, categoria, unidade_medida, escopo) VALUES
('SEU_ORG_ID_AQUI', 'VOL_VENDAS_VN', 'Volume de Vendas - Veículos Novos', 'Comercial', 'Unidades', 'marca'),
('SEU_ORG_ID_AQUI', 'VOL_VENDAS_VU', 'Volume de Vendas - Veículos Usados', 'Comercial', 'Unidades', 'marca'),
('SEU_ORG_ID_AQUI', 'VOL_COMPRAS_VU', 'Volume de Compras - Veículos Usados', 'Estoque', 'Unidades', 'marca'),
('SEU_ORG_ID_AQUI', 'PASSAGENS_OFICINA', 'Passagens de Oficina', 'Pós-Venda', 'Quantidade', 'departamento'),
('SEU_ORG_ID_AQUI', 'HORAS_VENDIDAS', 'Horas Vendidas Oficina', 'Pós-Venda', 'Horas', 'departamento'),
('SEU_ORG_ID_AQUI', 'PECAS_VENDIDAS', 'Peças Vendidas (Qtd)', 'Pós-Venda', 'Unidades', 'departamento');

-- Exemplo de fórmulas
INSERT INTO formulas_operacionais (organizacao_id, codigo, nome, expressao, categoria, unidade_medida, formato_exibicao) VALUES
('SEU_ORG_ID_AQUI', 'TICKET_MEDIO_VN', 'Ticket Médio - Veículos Novos', 'FIN[vendas_veiculos_novos] / OPE[VOL_VENDAS_VN]', 'Comercial', 'R$', 'moeda'),
('SEU_ORG_ID_AQUI', 'TICKET_MEDIO_VU', 'Ticket Médio - Veículos Usados', 'FIN[vendas_veiculos_usados] / OPE[VOL_VENDAS_VU]', 'Comercial', 'R$', 'moeda'),
('SEU_ORG_ID_AQUI', 'MARGEM_POR_VN', 'Margem por Veículo Novo', 'FIN[lucro_bruto_vn] / OPE[VOL_VENDAS_VN]', 'Margem', 'R$', 'moeda'),
('SEU_ORG_ID_AQUI', 'TICKET_OFICINA', 'Ticket Médio Oficina', 'FIN[receita_oficina] / OPE[PASSAGENS_OFICINA]', 'Pós-Venda', 'R$', 'moeda');
*/

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================

SELECT 'Script executado com sucesso! Tabelas criadas:' AS status;
SELECT '1. indicadores_operacionais' AS tabela UNION ALL
SELECT '2. valores_operacionais' UNION ALL
SELECT '3. formulas_operacionais' UNION ALL
SELECT '4. formulas_operacionais_dependencias' UNION ALL
SELECT '5. relatorio_linhas_operacionais';
