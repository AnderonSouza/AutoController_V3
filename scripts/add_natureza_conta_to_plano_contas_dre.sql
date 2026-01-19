-- Script para adicionar campo natureza_conta à tabela plano_contas_dre
-- Execute este script no Supabase SQL Editor

-- Adicionar a coluna natureza_conta
ALTER TABLE public.plano_contas_dre
ADD COLUMN IF NOT EXISTS natureza_conta text NULL;

-- Criar índice para performance em buscas por natureza
CREATE INDEX IF NOT EXISTS plano_contas_dre_natureza_conta_idx 
ON public.plano_contas_dre (natureza_conta) 
WHERE natureza_conta IS NOT NULL;

-- Comentário na coluna para documentação
COMMENT ON COLUMN public.plano_contas_dre.natureza_conta IS 
'Natureza da conta para classificação contábil: Receita, Despesa, Custo, Outros';

-- Verificar a alteração
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'plano_contas_dre' 
ORDER BY ordinal_position;
