-- ============================================
-- SCRIPT: Roteamento por Subdomínio
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- 1. Remover função existente (se houver) para poder recriar com novo formato
DROP FUNCTION IF EXISTS get_tenant_by_subdomain(TEXT);

-- 2. Criar função RPC para buscar tenant por subdomain (SECURITY DEFINER para bypass RLS)
CREATE OR REPLACE FUNCTION get_tenant_by_subdomain(p_subdomain TEXT)
RETURNS TABLE(
    id UUID,
    nome TEXT,
    subdomain TEXT,
    logo TEXT,
    logo_dark TEXT,
    config_interface JSONB,
    status TEXT,
    login_background_url TEXT,
    login_background_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.nome,
        o.subdomain,
        o.logo,
        o.logo_dark,
        o.config_interface,
        o.status,
        o.login_background_url,
        o.login_background_type
    FROM organizacoes o
    WHERE LOWER(o.subdomain) = LOWER(p_subdomain)
    AND (o.status IS NULL OR o.status = 'ativo')
    LIMIT 1;
END;
$$;

-- 3. Dar permissão para usuários anônimos e autenticados chamarem a função
GRANT EXECUTE ON FUNCTION get_tenant_by_subdomain(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_tenant_by_subdomain(TEXT) TO authenticated;

-- 4. Atualizar subdomínios dos grupos existentes (ajuste conforme necessário)
UPDATE organizacoes SET subdomain = 'viamar' WHERE nome ILIKE '%viamar%' AND subdomain IS NULL;
UPDATE organizacoes SET subdomain = 'faberge' WHERE nome ILIKE '%faberge%' AND subdomain IS NULL;

-- 5. Verificar resultado
SELECT id, nome, subdomain, status FROM organizacoes;
