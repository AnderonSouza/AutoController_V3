-- =====================================================
-- ADICIONAR SUPER_ADMIN AO SISTEMA
-- =====================================================
-- Este script configura o perfil SUPER_ADMIN que tem
-- acesso total a todas as organizações do sistema
-- =====================================================

-- 1. Atualizar a constraint de perfil para incluir SUPER_ADMIN
DO $$
BEGIN
    -- Tentar remover constraint existente se houver
    ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_perfil_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- 2. Adicionar nova constraint incluindo SUPER_ADMIN
ALTER TABLE usuarios
ADD CONSTRAINT usuarios_perfil_check 
CHECK (perfil IN ('SUPER_ADMIN', 'ADMIN', 'Administrador', 'Gestor', 'Analista', 'Leitor', 'Suporte', 'Operacional'));

-- 3. Criar política RLS especial para SUPER_ADMIN
-- SUPER_ADMIN pode ver TODOS os grupos econômicos
DROP POLICY IF EXISTS super_admin_all_groups ON grupos_economicos;

CREATE POLICY super_admin_all_groups ON grupos_economicos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND perfil = 'SUPER_ADMIN'
    )
  );

-- 4. SUPER_ADMIN pode ver TODOS os usuários
DROP POLICY IF EXISTS super_admin_all_users ON usuarios;

CREATE POLICY super_admin_all_users ON usuarios
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND perfil = 'SUPER_ADMIN'
    )
  );

-- 5. SUPER_ADMIN pode ver TODAS as empresas
DROP POLICY IF EXISTS super_admin_all_empresas ON empresas;

CREATE POLICY super_admin_all_empresas ON empresas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND perfil = 'SUPER_ADMIN'
    )
  );

-- 6. Criar função para verificar se usuário é SUPER_ADMIN
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

-- 7. Verificar estrutura atual
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'usuarios' 
AND column_name = 'perfil';

-- 8. Mostrar políticas atuais na tabela grupos_economicos
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'grupos_economicos';

COMMENT ON FUNCTION is_super_admin() IS 'Verifica se o usuário autenticado é SUPER_ADMIN';
