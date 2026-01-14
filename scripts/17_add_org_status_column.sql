-- =====================================================
-- ADICIONAR COLUNA DE STATUS NAS ORGANIZAÇÕES
-- =====================================================

-- 1. Adicionar coluna de status (ativo/inativo)
ALTER TABLE organizacoes 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo'));

-- 2. Adicionar coluna de motivo da inativação
ALTER TABLE organizacoes 
ADD COLUMN IF NOT EXISTS motivo_inativacao TEXT;

-- 3. Adicionar coluna de data da inativação
ALTER TABLE organizacoes 
ADD COLUMN IF NOT EXISTS data_inativacao TIMESTAMPTZ;

-- 4. Atualizar registros existentes para 'ativo'
UPDATE organizacoes SET status = 'ativo' WHERE status IS NULL;

-- 5. Adicionar coluna de vídeo de login no console_config
ALTER TABLE console_config 
ADD COLUMN IF NOT EXISTS login_video_url TEXT;

-- 6. Recriar função RPC com novo campo
DROP FUNCTION IF EXISTS get_console_config_public();

CREATE OR REPLACE FUNCTION get_console_config_public()
RETURNS TABLE (
  id UUID,
  logo_url TEXT,
  company_name TEXT,
  tagline TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT,
  login_illustration_url TEXT,
  login_video_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.logo_url,
    c.company_name,
    c.tagline,
    c.primary_color,
    c.secondary_color,
    c.accent_color,
    c.login_illustration_url,
    c.login_video_url
  FROM console_config c
  LIMIT 1;
END;
$$;

-- 7. Verificar alterações
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'organizacoes' AND column_name IN ('status', 'motivo_inativacao', 'data_inativacao');

SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'console_config' AND column_name = 'login_video_url';
