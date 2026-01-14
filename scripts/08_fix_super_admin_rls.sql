-- =====================================================
-- CORRIGIR RLS PARA SUPER_ADMIN
-- =====================================================
-- O SUPER_ADMIN tem grupo_economico_id = NULL, então
-- precisa de uma política especial para ler seu próprio registro
-- =====================================================

-- 1. Remover políticas de SELECT antigas da tabela usuarios
DROP POLICY IF EXISTS usuarios_select_self ON usuarios;
DROP POLICY IF EXISTS usuarios_select_admin ON usuarios;
DROP POLICY IF EXISTS usuarios_select_policy ON usuarios;

-- 2. Criar política que permite usuário ler seu próprio registro (incluindo SUPER_ADMIN)
CREATE POLICY usuarios_select_self ON usuarios
  FOR SELECT
  USING (auth.uid() = id);

-- 3. Criar política para ADMIN ver usuários do mesmo tenant
CREATE POLICY usuarios_select_admin ON usuarios
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u 
      WHERE u.id = auth.uid() 
      AND u.perfil = 'ADMIN'
      AND u.grupo_economico_id = usuarios.grupo_economico_id
    )
  );

-- 4. Criar política para SUPER_ADMIN ver TODOS os usuários
CREATE POLICY usuarios_select_super_admin ON usuarios
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u 
      WHERE u.id = auth.uid() 
      AND u.perfil = 'SUPER_ADMIN'
    )
  );

-- 5. Verificar políticas criadas
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'usuarios'
ORDER BY policyname;
