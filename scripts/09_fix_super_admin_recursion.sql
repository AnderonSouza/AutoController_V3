-- =====================================================
-- CORRIGIR RECURSÃO RLS PARA SUPER_ADMIN
-- =====================================================
-- O problema é que as políticas RLS fazem referência à 
-- própria tabela usuarios para verificar se é SUPER_ADMIN,
-- causando recursão infinita.
-- Solução: criar função SECURITY DEFINER que faz bypass do RLS
-- =====================================================

-- 1. Criar função para verificar se usuário atual é SUPER_ADMIN (bypass RLS)
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
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

-- 2. Criar função para obter o perfil do usuário atual (bypass RLS)
CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS TEXT
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

-- 3. Remover políticas problemáticas que causam recursão
DROP POLICY IF EXISTS super_admin_all_users ON usuarios;
DROP POLICY IF EXISTS usuarios_select_super_admin ON usuarios;
DROP POLICY IF EXISTS usuarios_select_admin ON usuarios;
DROP POLICY IF EXISTS usuarios_select_self ON usuarios;

-- 4. Recriar política de SELECT sem recursão
-- Permite: próprio usuário OU ADMIN do mesmo tenant OU SUPER_ADMIN
CREATE POLICY usuarios_select_policy ON usuarios
  FOR SELECT
  USING (
    -- Próprio usuário sempre pode ler seu registro
    auth.uid() = id
    OR
    -- SUPER_ADMIN pode ver todos (usando função SECURITY DEFINER)
    is_super_admin()
    OR
    -- ADMIN pode ver usuários do mesmo tenant (usando função SECURITY DEFINER)
    (
      grupo_economico_id IS NOT NULL 
      AND grupo_economico_id = get_user_tenant_id()
      AND get_current_user_profile() = 'ADMIN'
    )
  );

-- 5. Atualizar política ALL para SUPER_ADMIN (INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS super_admin_all_groups ON grupos_economicos;

CREATE POLICY super_admin_all_groups ON grupos_economicos
  FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- 6. Verificar se as funções foram criadas
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('is_super_admin', 'get_current_user_profile');

-- 7. Verificar políticas atualizadas
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'usuarios';
