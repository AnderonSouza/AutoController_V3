-- =====================================================
-- SCRIPT DE RENOMEAÇÃO: GRUPO ECONÔMICO → ORGANIZAÇÃO
-- =====================================================
-- Este script renomeia todas as referências de "grupo_economico"
-- para "organizacao" no banco de dados
-- ATENÇÃO: Execute APENAS após backup do banco de dados!
-- =====================================================

-- 1. RENOMEAR TABELA grupos_economicos PARA organizacoes
ALTER TABLE IF EXISTS grupos_economicos RENAME TO organizacoes;

-- 2. RENOMEAR COLUNA grupo_economico_id EM TODAS AS TABELAS

-- Tabela usuarios
ALTER TABLE usuarios 
RENAME COLUMN grupo_economico_id TO organizacao_id;

-- Tabela empresas
ALTER TABLE IF EXISTS empresas 
RENAME COLUMN grupo_economico_id TO organizacao_id;

-- Tabela marcas
ALTER TABLE IF EXISTS marcas 
RENAME COLUMN grupo_economico_id TO organizacao_id;

-- Tabela departamentos
ALTER TABLE IF EXISTS departamentos 
RENAME COLUMN grupo_economico_id TO organizacao_id;

-- Tabela centros_custo
ALTER TABLE IF EXISTS centros_custo 
RENAME COLUMN grupo_economico_id TO organizacao_id;

-- Tabela plano_contas_contabil
ALTER TABLE IF EXISTS plano_contas_contabil 
RENAME COLUMN grupo_economico_id TO organizacao_id;

-- Tabela plano_contas_dre
ALTER TABLE IF EXISTS plano_contas_dre 
RENAME COLUMN grupo_economico_id TO organizacao_id;

-- Tabela plano_contas_balanco
ALTER TABLE IF EXISTS plano_contas_balanco 
RENAME COLUMN grupo_economico_id TO organizacao_id;

-- Tabela mapeamento_contas_centros_custo
ALTER TABLE IF EXISTS mapeamento_contas_centros_custo 
RENAME COLUMN grupo_economico_id TO organizacao_id;

-- Tabela lancamentos_contabeis
ALTER TABLE IF EXISTS lancamentos_contabeis 
RENAME COLUMN grupo_economico_id TO organizacao_id;

-- Tabela saldos_mensais
ALTER TABLE IF EXISTS saldos_mensais 
RENAME COLUMN grupo_economico_id TO organizacao_id;

-- Tabela lancamentos_ajustes
ALTER TABLE IF EXISTS lancamentos_ajustes 
RENAME COLUMN grupo_economico_id TO organizacao_id;

-- Tabela premissas_orcamentarias
ALTER TABLE IF EXISTS premissas_orcamentarias 
RENAME COLUMN grupo_economico_id TO organizacao_id;

-- Tabela orcamento_linhas
ALTER TABLE IF EXISTS orcamento_linhas 
RENAME COLUMN grupo_economico_id TO organizacao_id;

-- Tabela fechamentos
ALTER TABLE IF EXISTS fechamentos 
RENAME COLUMN grupo_economico_id TO organizacao_id;

-- Tabela modelos_relatorio
ALTER TABLE IF EXISTS modelos_relatorio 
RENAME COLUMN grupo_economico_id TO organizacao_id;

-- Tabela linhas_relatorio
ALTER TABLE IF EXISTS linhas_relatorio 
RENAME COLUMN grupo_economico_id TO organizacao_id;

-- Tabela benchmarks
ALTER TABLE IF EXISTS benchmarks 
RENAME COLUMN grupo_economico_id TO organizacao_id;

-- Tabela tickets_suporte
ALTER TABLE IF EXISTS tickets_suporte 
RENAME COLUMN grupo_economico_id TO organizacao_id;

-- Tabela notificacoes
ALTER TABLE IF EXISTS notificacoes 
RENAME COLUMN grupo_economico_id TO organizacao_id;

-- 3. ATUALIZAR FUNÇÕES SECURITY DEFINER

-- Função get_user_tenant_id
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organizacao_id 
  FROM usuarios 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Função is_super_admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
    AND perfil = 'SUPER_ADMIN'
  );
$$;

-- Função is_admin_user
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
    AND perfil IN ('ADMIN', 'SUPER_ADMIN')
  );
$$;

-- Função get_user_profile
CREATE OR REPLACE FUNCTION get_user_profile()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT perfil FROM usuarios WHERE id = auth.uid() LIMIT 1;
$$;

-- Função get_tenant_by_subdomain (atualizada)
CREATE OR REPLACE FUNCTION get_tenant_by_subdomain(p_subdomain TEXT)
RETURNS TABLE (
  id UUID,
  nome TEXT,
  logo TEXT,
  config_interface JSONB,
  subdomain TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    nome,
    logo,
    config_interface,
    subdomain
  FROM organizacoes 
  WHERE LOWER(subdomain) = LOWER(p_subdomain)
  LIMIT 1;
$$;

-- 4. ATUALIZAR POLÍTICAS RLS PARA NOVA TABELA organizacoes

-- Remover políticas antigas da tabela (agora renomeada)
DROP POLICY IF EXISTS grupos_economicos_public_subdomain ON organizacoes;
DROP POLICY IF EXISTS super_admin_all_groups ON organizacoes;

-- Criar novas políticas para organizacoes
CREATE POLICY organizacoes_public_subdomain ON organizacoes
  FOR SELECT
  USING (subdomain IS NOT NULL);

CREATE POLICY organizacoes_super_admin_all ON organizacoes
  FOR ALL
  USING (is_super_admin());

CREATE POLICY organizacoes_admin_own ON organizacoes
  FOR SELECT
  USING (id = get_user_tenant_id());

-- 5. ATUALIZAR POLÍTICAS RLS DA TABELA usuarios

-- Remover políticas antigas que referenciam grupo_economico_id
DROP POLICY IF EXISTS usuarios_select_tenant_admin ON usuarios;
DROP POLICY IF EXISTS usuarios_update_admin ON usuarios;
DROP POLICY IF EXISTS usuarios_delete_admin ON usuarios;

-- Recriar políticas com organizacao_id
CREATE POLICY usuarios_select_tenant_admin ON usuarios
  FOR SELECT
  USING (is_admin_user() AND organizacao_id = get_user_tenant_id());

CREATE POLICY usuarios_update_admin ON usuarios
  FOR UPDATE
  USING (is_admin_user() AND organizacao_id = get_user_tenant_id());

CREATE POLICY usuarios_delete_admin ON usuarios
  FOR DELETE
  USING (is_admin_user() AND organizacao_id = get_user_tenant_id());

-- 6. COMENTÁRIOS NAS TABELAS
COMMENT ON TABLE organizacoes IS 'Tabela principal de organizações (tenants) do sistema multi-tenant';
COMMENT ON COLUMN organizacoes.subdomain IS 'Subdomínio personalizado da organização. Ex: "viamargrupo" para viamargrupo.autocontroller.ai';

-- 7. VERIFICAÇÃO FINAL
SELECT 
  'Tabela organizacoes' as item,
  COUNT(*) as registros
FROM organizacoes
UNION ALL
SELECT 
  'Usuários com organizacao_id' as item,
  COUNT(*) as registros
FROM usuarios WHERE organizacao_id IS NOT NULL
UNION ALL
SELECT 
  'Usuários SUPER_ADMIN (sem org)' as item,
  COUNT(*) as registros
FROM usuarios WHERE perfil = 'SUPER_ADMIN';
