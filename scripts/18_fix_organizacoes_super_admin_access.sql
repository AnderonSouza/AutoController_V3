-- =====================================================
-- CORRIGIR ACESSO SUPER_ADMIN À TABELA ORGANIZACOES
-- =====================================================

-- 1. Verificar estrutura atual da tabela
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'organizacoes'
ORDER BY ordinal_position;

-- 2. Garantir que as colunas existem
ALTER TABLE organizacoes ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE organizacoes ADD COLUMN IF NOT EXISTS subdomain TEXT;
ALTER TABLE organizacoes ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE organizacoes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';
ALTER TABLE organizacoes ADD COLUMN IF NOT EXISTS motivo_inativacao TEXT;
ALTER TABLE organizacoes ADD COLUMN IF NOT EXISTS data_inativacao TIMESTAMPTZ;

-- 3. Atualizar status NULL para 'ativo'
UPDATE organizacoes SET status = 'ativo' WHERE status IS NULL;

-- 4. Criar função RPC para listar organizações (bypass RLS para SUPER_ADMIN)
DROP FUNCTION IF EXISTS list_all_organizations();

CREATE OR REPLACE FUNCTION list_all_organizations()
RETURNS TABLE (
  id UUID,
  nome TEXT,
  subdomain TEXT,
  logo TEXT,
  created_at TIMESTAMPTZ,
  status TEXT,
  motivo_inativacao TEXT,
  data_inativacao TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se é SUPER_ADMIN
  IF NOT EXISTS (
    SELECT 1 FROM usuarios 
    WHERE usuarios.id = auth.uid() 
    AND usuarios.perfil = 'SUPER_ADMIN'
  ) THEN
    RAISE EXCEPTION 'Acesso negado: apenas SUPER_ADMIN pode listar todas as organizações';
  END IF;

  RETURN QUERY
  SELECT 
    o.id,
    o.nome,
    o.subdomain,
    o.logo,
    o.created_at,
    COALESCE(o.status, 'ativo') as status,
    o.motivo_inativacao,
    o.data_inativacao
  FROM organizacoes o
  ORDER BY o.nome ASC NULLS LAST;
END;
$$;

-- 5. Criar função para contar usuários por organização
DROP FUNCTION IF EXISTS count_users_by_org(UUID);

CREATE OR REPLACE FUNCTION count_users_by_org(org_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM usuarios
  WHERE organizacao_id = org_id;
$$;

-- 6. Criar função para contar empresas por organização
DROP FUNCTION IF EXISTS count_empresas_by_org(UUID);

CREATE OR REPLACE FUNCTION count_empresas_by_org(org_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM empresas
  WHERE organizacao_id = org_id;
$$;

-- 7. Criar função para obter estatísticas do console
DROP FUNCTION IF EXISTS get_console_stats();

CREATE OR REPLACE FUNCTION get_console_stats()
RETURNS TABLE (
  total_orgs INTEGER,
  active_orgs INTEGER,
  total_users INTEGER,
  total_empresas INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se é SUPER_ADMIN
  IF NOT EXISTS (
    SELECT 1 FROM usuarios 
    WHERE usuarios.id = auth.uid() 
    AND usuarios.perfil = 'SUPER_ADMIN'
  ) THEN
    RAISE EXCEPTION 'Acesso negado: apenas SUPER_ADMIN pode ver estatísticas';
  END IF;

  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM organizacoes) as total_orgs,
    (SELECT COUNT(*)::INTEGER FROM organizacoes WHERE COALESCE(status, 'ativo') = 'ativo') as active_orgs,
    (SELECT COUNT(*)::INTEGER FROM usuarios) as total_users,
    (SELECT COUNT(*)::INTEGER FROM empresas) as total_empresas;
END;
$$;

-- 8. Atualizar políticas RLS para SUPER_ADMIN
DROP POLICY IF EXISTS organizacoes_super_admin_all ON organizacoes;
DROP POLICY IF EXISTS organizacoes_public_subdomain ON organizacoes;

-- Política para leitura pública por subdomain (para login)
CREATE POLICY organizacoes_public_read ON organizacoes
  FOR SELECT
  USING (true);

-- Política para SUPER_ADMIN fazer tudo
CREATE POLICY organizacoes_super_admin_write ON organizacoes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE usuarios.id = auth.uid() 
      AND usuarios.perfil = 'SUPER_ADMIN'
    )
  );

-- 9. Verificar dados existentes
SELECT id, nome, subdomain, status FROM organizacoes;
