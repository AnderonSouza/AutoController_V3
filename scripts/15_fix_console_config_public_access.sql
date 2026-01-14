-- =====================================================
-- CORRIGIR ACESSO PÚBLICO AO CONSOLE_CONFIG
-- =====================================================
-- A tela de login precisa ler as configurações do console
-- ANTES do usuário estar autenticado
-- =====================================================

-- 1. Remover políticas existentes que bloqueiam acesso público
DROP POLICY IF EXISTS console_config_select ON console_config;
DROP POLICY IF EXISTS console_config_update ON console_config;
DROP POLICY IF EXISTS console_config_insert ON console_config;
DROP POLICY IF EXISTS console_config_public_select ON console_config;
DROP POLICY IF EXISTS console_config_super_admin_update ON console_config;
DROP POLICY IF EXISTS console_config_super_admin_insert ON console_config;

-- 2. Criar função SECURITY DEFINER para leitura pública (bypass RLS)
CREATE OR REPLACE FUNCTION get_console_config_public()
RETURNS TABLE (
  id UUID,
  logo_url TEXT,
  company_name TEXT,
  tagline TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    logo_url,
    company_name,
    tagline,
    primary_color,
    secondary_color,
    accent_color
  FROM console_config 
  LIMIT 1;
$$;

-- 3. Política para permitir SELECT público (para tela de login)
CREATE POLICY console_config_public_select ON console_config
  FOR SELECT
  USING (true);  -- Permite leitura pública

-- 4. Política para SUPER_ADMIN atualizar
CREATE POLICY console_config_super_admin_update ON console_config
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE usuarios.id = auth.uid() 
      AND usuarios.perfil = 'SUPER_ADMIN'
    )
  );

-- 5. Política para SUPER_ADMIN inserir
CREATE POLICY console_config_super_admin_insert ON console_config
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE usuarios.id = auth.uid() 
      AND usuarios.perfil = 'SUPER_ADMIN'
    )
  );

-- 6. Verificar configurações
SELECT * FROM console_config;
