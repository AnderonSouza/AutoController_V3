-- Script para corrigir as políticas RLS no Supabase
-- Execute este script no SQL Editor do Supabase

-- 1. Primeiro, vamos verificar as políticas existentes
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public';

-- 2. Remover políticas antigas que usam grupo_economico_id (se existirem)
DROP POLICY IF EXISTS "Usuarios podem ver marcas da sua organizacao" ON marcas;
DROP POLICY IF EXISTS "Usuarios podem ver departamentos da sua organizacao" ON departamentos;
DROP POLICY IF EXISTS "Usuarios podem ver plano_contas da sua organizacao" ON plano_contas;
DROP POLICY IF EXISTS "Usuarios podem ver plano_contas_dre da sua organizacao" ON plano_contas_dre;
DROP POLICY IF EXISTS "Usuarios podem ver plano_contas_balanco da sua organizacao" ON plano_contas_balanco;
DROP POLICY IF EXISTS "Usuarios podem ver centros_resultado da sua organizacao" ON centros_resultado;
DROP POLICY IF EXISTS "Usuarios podem ver mapeamento_contas da sua organizacao" ON mapeamento_contas;
DROP POLICY IF EXISTS "Usuarios podem ver temas_interface da sua organizacao" ON temas_interface;

-- Também remover políticas com nomes alternativos comuns
DROP POLICY IF EXISTS "marcas_select_policy" ON marcas;
DROP POLICY IF EXISTS "departamentos_select_policy" ON departamentos;
DROP POLICY IF EXISTS "plano_contas_select_policy" ON plano_contas;
DROP POLICY IF EXISTS "plano_contas_dre_select_policy" ON plano_contas_dre;
DROP POLICY IF EXISTS "plano_contas_balanco_select_policy" ON plano_contas_balanco;
DROP POLICY IF EXISTS "centros_resultado_select_policy" ON centros_resultado;
DROP POLICY IF EXISTS "mapeamento_contas_select_policy" ON mapeamento_contas;
DROP POLICY IF EXISTS "temas_interface_select_policy" ON temas_interface;

-- 3. Habilitar RLS nas tabelas (caso não esteja habilitado)
ALTER TABLE marcas ENABLE ROW LEVEL SECURITY;
ALTER TABLE departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE plano_contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE plano_contas_dre ENABLE ROW LEVEL SECURITY;
ALTER TABLE plano_contas_balanco ENABLE ROW LEVEL SECURITY;
ALTER TABLE centros_resultado ENABLE ROW LEVEL SECURITY;
ALTER TABLE mapeamento_contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE temas_interface ENABLE ROW LEVEL SECURITY;

-- 4. Criar novas políticas usando organizacao_id
-- Política para MARCAS
CREATE POLICY "Permitir acesso a marcas por organizacao" ON marcas
FOR ALL
TO authenticated
USING (organizacao_id IN (
  SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
));

-- Política para DEPARTAMENTOS
CREATE POLICY "Permitir acesso a departamentos por organizacao" ON departamentos
FOR ALL
TO authenticated
USING (organizacao_id IN (
  SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
));

-- Política para PLANO_CONTAS
CREATE POLICY "Permitir acesso a plano_contas por organizacao" ON plano_contas
FOR ALL
TO authenticated
USING (organizacao_id IN (
  SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
));

-- Política para PLANO_CONTAS_DRE
CREATE POLICY "Permitir acesso a plano_contas_dre por organizacao" ON plano_contas_dre
FOR ALL
TO authenticated
USING (organizacao_id IN (
  SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
));

-- Política para PLANO_CONTAS_BALANCO
CREATE POLICY "Permitir acesso a plano_contas_balanco por organizacao" ON plano_contas_balanco
FOR ALL
TO authenticated
USING (organizacao_id IN (
  SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
));

-- Política para CENTROS_RESULTADO
CREATE POLICY "Permitir acesso a centros_resultado por organizacao" ON centros_resultado
FOR ALL
TO authenticated
USING (organizacao_id IN (
  SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
));

-- Política para MAPEAMENTO_CONTAS
CREATE POLICY "Permitir acesso a mapeamento_contas por organizacao" ON mapeamento_contas
FOR ALL
TO authenticated
USING (organizacao_id IN (
  SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
));

-- Política para TEMAS_INTERFACE
CREATE POLICY "Permitir acesso a temas_interface por organizacao" ON temas_interface
FOR ALL
TO authenticated
USING (organizacao_id IN (
  SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
));

-- 5. Políticas especiais para SUPER_ADMIN (acesso a todas as organizações)
-- Criar função helper para verificar se é super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM usuarios 
    WHERE id = auth.uid() 
    AND perfil = 'SUPER_ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar políticas para incluir SUPER_ADMIN
DROP POLICY IF EXISTS "Permitir acesso a marcas por organizacao" ON marcas;
CREATE POLICY "Permitir acesso a marcas por organizacao" ON marcas
FOR ALL
TO authenticated
USING (
  is_super_admin() OR 
  organizacao_id IN (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Permitir acesso a departamentos por organizacao" ON departamentos;
CREATE POLICY "Permitir acesso a departamentos por organizacao" ON departamentos
FOR ALL
TO authenticated
USING (
  is_super_admin() OR 
  organizacao_id IN (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Permitir acesso a plano_contas por organizacao" ON plano_contas;
CREATE POLICY "Permitir acesso a plano_contas por organizacao" ON plano_contas
FOR ALL
TO authenticated
USING (
  is_super_admin() OR 
  organizacao_id IN (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Permitir acesso a plano_contas_dre por organizacao" ON plano_contas_dre;
CREATE POLICY "Permitir acesso a plano_contas_dre por organizacao" ON plano_contas_dre
FOR ALL
TO authenticated
USING (
  is_super_admin() OR 
  organizacao_id IN (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Permitir acesso a plano_contas_balanco por organizacao" ON plano_contas_balanco;
CREATE POLICY "Permitir acesso a plano_contas_balanco por organizacao" ON plano_contas_balanco
FOR ALL
TO authenticated
USING (
  is_super_admin() OR 
  organizacao_id IN (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Permitir acesso a centros_resultado por organizacao" ON centros_resultado;
CREATE POLICY "Permitir acesso a centros_resultado por organizacao" ON centros_resultado
FOR ALL
TO authenticated
USING (
  is_super_admin() OR 
  organizacao_id IN (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Permitir acesso a mapeamento_contas por organizacao" ON mapeamento_contas;
CREATE POLICY "Permitir acesso a mapeamento_contas por organizacao" ON mapeamento_contas
FOR ALL
TO authenticated
USING (
  is_super_admin() OR 
  organizacao_id IN (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Permitir acesso a temas_interface por organizacao" ON temas_interface;
CREATE POLICY "Permitir acesso a temas_interface por organizacao" ON temas_interface
FOR ALL
TO authenticated
USING (
  is_super_admin() OR 
  organizacao_id IN (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
);

-- 6. Verificar se as políticas foram criadas corretamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('marcas', 'departamentos', 'plano_contas', 'plano_contas_dre', 
                  'plano_contas_balanco', 'centros_resultado', 'mapeamento_contas', 'temas_interface');
