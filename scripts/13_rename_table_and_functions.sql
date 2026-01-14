-- =====================================================
-- RENOMEAR TABELA E FUNÇÕES
-- =====================================================

-- 1. RENOMEAR TABELA grupos_economicos PARA organizacoes
ALTER TABLE grupos_economicos RENAME TO organizacoes;

-- 2. ATUALIZAR FUNÇÕES PARA USAR NOVOS NOMES

-- Função para buscar tenant por subdomain
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

-- Função para obter tenant_id do usuário
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS uuid
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

-- Função para verificar se é admin do tenant
CREATE OR REPLACE FUNCTION is_admin_of_tenant(tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM usuarios 
    WHERE id = auth.uid() 
    AND organizacao_id = tenant_id 
    AND perfil = 'ADMIN'
  );
$$;

-- Função para verificar se é SUPER_ADMIN
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM usuarios 
    WHERE id = auth.uid() 
    AND perfil = 'SUPER_ADMIN'
  );
$$;

-- Função para verificar se é ADMIN
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM usuarios 
    WHERE id = auth.uid() 
    AND perfil IN ('ADMIN', 'SUPER_ADMIN')
  );
$$;

-- Função para obter perfil do usuário
CREATE OR REPLACE FUNCTION get_user_profile()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT perfil 
  FROM usuarios 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Função para obter usuário atual completo
CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS TABLE (
  id UUID,
  nome TEXT,
  email TEXT,
  perfil TEXT,
  organizacao_id UUID,
  status TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, nome, email, perfil, organizacao_id, status
  FROM usuarios
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- 3. ATUALIZAR POLÍTICAS RLS DA TABELA ORGANIZACOES

-- Remover políticas antigas
DROP POLICY IF EXISTS grupos_economicos_public_subdomain ON organizacoes;
DROP POLICY IF EXISTS super_admin_all_groups ON organizacoes;

-- Criar novas políticas
CREATE POLICY organizacoes_public_subdomain ON organizacoes
  FOR SELECT
  USING (subdomain IS NOT NULL);

CREATE POLICY organizacoes_super_admin_all ON organizacoes
  FOR ALL
  USING (is_super_admin());

-- 4. VERIFICAR SE FUNCIONOU
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'organizacoes' 
AND table_schema = 'public';
