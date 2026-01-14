-- =====================================================
-- SCRIPT 05: Verificação Final Multi-Tenant
-- =====================================================

-- 1. Verificar tabelas com grupo_economico_id
SELECT 
    table_name,
    'TEM tenant' as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND column_name = 'grupo_economico_id'
ORDER BY table_name;

-- 2. Verificar RLS habilitado
SELECT 
    relname as table_name,
    CASE WHEN relrowsecurity THEN 'RLS Habilitado' ELSE 'RLS Desabilitado' END as rls_status
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
AND relkind = 'r'
ORDER BY relname;

-- 3. Contar políticas por tabela
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- 4. Resumo final
SELECT 
    (SELECT COUNT(DISTINCT table_name) FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'grupo_economico_id') as tabelas_com_tenant,
    (SELECT COUNT(*) FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND relrowsecurity = true) as tabelas_com_rls,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies;
