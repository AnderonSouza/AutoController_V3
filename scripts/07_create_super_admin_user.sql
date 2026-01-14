-- =====================================================
-- CRIAR USUÁRIO SUPER_ADMIN
-- =====================================================
-- Execute este script APÓS criar o usuário no Supabase Auth
-- Substitua os valores conforme necessário
-- =====================================================

-- IMPORTANTE: Primeiro crie o usuário no Supabase Auth Dashboard
-- ou via API, depois execute este script com o ID correto

-- Exemplo de como criar/atualizar um usuário como SUPER_ADMIN:
-- Substitua 'SEU_USER_ID' pelo UUID do usuário criado no Auth

/*
INSERT INTO usuarios (
  id,
  nome,
  email,
  perfil,
  status,
  grupo_economico_id,
  permissoes
) VALUES (
  'SEU_USER_ID',  -- UUID do usuário no Supabase Auth
  'Super Admin',
  'superadmin@autocontroller.ai',
  'SUPER_ADMIN',
  'ativo',
  NULL,  -- SUPER_ADMIN não precisa de grupo_economico_id
  '{"all": true}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  perfil = 'SUPER_ADMIN',
  permissoes = '{"all": true}'::jsonb;
*/

-- Para transformar um usuário existente em SUPER_ADMIN:
-- UPDATE usuarios SET perfil = 'SUPER_ADMIN', grupo_economico_id = NULL WHERE email = 'seu@email.com';

-- Verificar SUPER_ADMIN existentes:
SELECT id, nome, email, perfil, status 
FROM usuarios 
WHERE perfil = 'SUPER_ADMIN';
