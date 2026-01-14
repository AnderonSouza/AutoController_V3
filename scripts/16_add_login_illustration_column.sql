-- =====================================================
-- ADICIONAR COLUNA PARA ILUSTRAÇÃO DA TELA DE LOGIN
-- =====================================================

-- 1. Adicionar coluna login_illustration_url na tabela console_config
ALTER TABLE console_config 
ADD COLUMN IF NOT EXISTS login_illustration_url TEXT;

-- 2. DROPAR a função existente antes de recriar (necessário quando muda o tipo de retorno)
DROP FUNCTION IF EXISTS get_console_config_public();

-- 3. Recriar a função com o novo campo
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
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
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
    accent_color,
    login_illustration_url,
    created_at,
    updated_at
  FROM console_config
  LIMIT 1;
$$;

-- 4. Verificar resultado
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'console_config' 
ORDER BY ordinal_position;
