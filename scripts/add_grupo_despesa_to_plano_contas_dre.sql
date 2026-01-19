-- Script para adicionar campo grupo_despesa à tabela plano_contas_dre
-- Execute este script no Supabase SQL Editor

-- Adicionar a coluna grupo_despesa
ALTER TABLE public.plano_contas_dre
ADD COLUMN IF NOT EXISTS grupo_despesa text NULL;

-- Criar índice para performance em buscas por grupo
CREATE INDEX IF NOT EXISTS plano_contas_dre_grupo_despesa_idx 
ON public.plano_contas_dre (grupo_despesa) 
WHERE grupo_despesa IS NOT NULL;

-- Comentário na coluna para documentação
COMMENT ON COLUMN public.plano_contas_dre.grupo_despesa IS 
'Grupo de despesa para categorização (ex: Despesas com Pessoal, Despesas com Funcionamento, etc.)';

-- Verificar a alteração
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'plano_contas_dre' 
ORDER BY ordinal_position;
