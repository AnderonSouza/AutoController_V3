-- =====================================================
-- CRIAR TABELA DE CONFIGURAÇÕES DO CONSOLE
-- =====================================================
-- Armazena as configurações de personalização do console
-- administrativo (logo, cores, textos)
-- =====================================================

-- 1. Criar tabela de configurações do console
CREATE TABLE IF NOT EXISTS console_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url TEXT,
  company_name TEXT NOT NULL DEFAULT 'AutoController.ai',
  tagline TEXT DEFAULT 'Plataforma de Gestão Financeira Inteligente',
  primary_color TEXT NOT NULL DEFAULT '#1e3a5f',
  secondary_color TEXT NOT NULL DEFAULT '#0891b2',
  accent_color TEXT NOT NULL DEFAULT '#06b6d4',
  login_bg_color TEXT DEFAULT '#1e3a5f',
  login_title TEXT DEFAULT 'Console Administrativo',
  login_subtitle TEXT DEFAULT 'Gerencie suas organizações e usuários',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- 2. Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_console_config_updated_at 
ON console_config(updated_at DESC);

-- 3. Inserir configuração padrão se não existir
INSERT INTO console_config (
  company_name,
  tagline,
  primary_color,
  secondary_color,
  accent_color,
  logo_url
) 
SELECT 
  'AutoController.ai',
  'Plataforma de Gestão Financeira Inteligente',
  '#1e3a5f',
  '#0891b2',
  '#06b6d4',
  '/images/autocontroller-logo.png'
WHERE NOT EXISTS (SELECT 1 FROM console_config LIMIT 1);

-- 4. Habilitar RLS
ALTER TABLE console_config ENABLE ROW LEVEL SECURITY;

-- 5. Criar função para verificar se é SUPER_ADMIN (bypass RLS)
CREATE OR REPLACE FUNCTION is_console_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios 
    WHERE id = auth.uid() 
    AND perfil = 'SUPER_ADMIN'
  );
$$;

-- 6. Política para SUPER_ADMIN ler configurações
DROP POLICY IF EXISTS console_config_select_super_admin ON console_config;
CREATE POLICY console_config_select_super_admin ON console_config
  FOR SELECT
  USING (is_console_super_admin());

-- 7. Política para SUPER_ADMIN atualizar configurações
DROP POLICY IF EXISTS console_config_update_super_admin ON console_config;
CREATE POLICY console_config_update_super_admin ON console_config
  FOR UPDATE
  USING (is_console_super_admin())
  WITH CHECK (is_console_super_admin());

-- 8. Política para SUPER_ADMIN inserir configurações
DROP POLICY IF EXISTS console_config_insert_super_admin ON console_config;
CREATE POLICY console_config_insert_super_admin ON console_config
  FOR INSERT
  WITH CHECK (is_console_super_admin());

-- 9. Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_console_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Criar trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_console_config_updated_at ON console_config;
CREATE TRIGGER trigger_console_config_updated_at
  BEFORE UPDATE ON console_config
  FOR EACH ROW
  EXECUTE FUNCTION update_console_config_updated_at();

-- 11. Comentários para documentação
COMMENT ON TABLE console_config IS 'Configurações de personalização do console administrativo';
COMMENT ON COLUMN console_config.logo_url IS 'URL da logo do console';
COMMENT ON COLUMN console_config.company_name IS 'Nome da empresa exibido no console';
COMMENT ON COLUMN console_config.tagline IS 'Slogan/tagline da empresa';
COMMENT ON COLUMN console_config.primary_color IS 'Cor primária do tema (sidebar, botões)';
COMMENT ON COLUMN console_config.secondary_color IS 'Cor secundária (destaques, ícones)';
COMMENT ON COLUMN console_config.accent_color IS 'Cor de destaque (links, badges)';

-- 12. Verificar se a tabela foi criada
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'console_config'
ORDER BY ordinal_position;
