-- =====================================================
-- CORREÇÃO FINAL DAS POLÍTICAS RLS - SEM RECURSÃO
-- =====================================================

-- 1. Remover TODAS as políticas da tabela usuarios
DROP POLICY IF EXISTS usuarios_select_self ON usuarios;
DROP POLICY IF EXISTS usuarios_select_admin ON usuarios;
DROP POLICY IF EXISTS usuarios_select_super_admin ON usuarios;
DROP POLICY IF EXISTS usuarios_insert_authenticated ON usuarios;
DROP POLICY IF EXISTS usuarios_update_policy ON usuarios;
DROP POLICY IF EXISTS usuarios_delete_policy ON usuarios;
DROP POLICY IF EXISTS super_admin_all_users ON usuarios;

-- 2. Garantir que as funções SECURITY DEFINER existem
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

CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT grupo_economico_id FROM usuarios WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_user_profile()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT perfil FROM usuarios WHERE id = auth.uid() LIMIT 1;
$$;

-- 3. Criar políticas SIMPLES sem recursão

-- SELECT: Usuário pode ler seu próprio registro (mais simples possível)
CREATE POLICY usuarios_select_own ON usuarios
  FOR SELECT
  USING (auth.uid() = id);

-- SELECT: SUPER_ADMIN pode ler todos (usa função SECURITY DEFINER)
CREATE POLICY usuarios_select_all_super ON usuarios
  FOR SELECT
  USING (is_super_admin());

-- SELECT: ADMIN pode ler usuários do mesmo tenant (usa função SECURITY DEFINER)
CREATE POLICY usuarios_select_tenant_admin ON usuarios
  FOR SELECT
  USING (
    is_admin_user() 
    AND grupo_economico_id = get_user_tenant_id()
  );

-- INSERT: Usuários autenticados podem inserir
CREATE POLICY usuarios_insert_auth ON usuarios
  FOR INSERT
  WITH CHECK (true);

-- UPDATE: Usuário pode atualizar seu próprio registro
CREATE POLICY usuarios_update_own ON usuarios
  FOR UPDATE
  USING (auth.uid() = id);

-- UPDATE: SUPER_ADMIN pode atualizar todos
CREATE POLICY usuarios_update_super ON usuarios
  FOR UPDATE
  USING (is_super_admin());

-- UPDATE: ADMIN pode atualizar usuários do mesmo tenant
CREATE POLICY usuarios_update_admin ON usuarios
  FOR UPDATE
  USING (
    is_admin_user()
    AND grupo_economico_id = get_user_tenant_id()
  );

-- DELETE: SUPER_ADMIN pode deletar todos
CREATE POLICY usuarios_delete_super ON usuarios
  FOR DELETE
  USING (is_super_admin());

-- DELETE: ADMIN pode deletar usuários do mesmo tenant
CREATE POLICY usuarios_delete_admin ON usuarios
  FOR DELETE
  USING (
    is_admin_user()
    AND grupo_economico_id = get_user_tenant_id()
  );

-- 4. Verificar políticas criadas
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'usuarios'
ORDER BY policyname;
