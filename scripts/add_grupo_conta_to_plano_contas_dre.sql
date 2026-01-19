-- Add grupo_conta (account group) column to plano_contas_dre table
-- This allows categorizing DRE accounts into groups for better organization

ALTER TABLE plano_contas_dre 
ADD COLUMN IF NOT EXISTS grupo_conta VARCHAR(100);

-- Add index for better query performance when filtering by group
CREATE INDEX IF NOT EXISTS idx_plano_contas_dre_grupo_conta 
ON plano_contas_dre(grupo_conta);

-- Add comment for documentation
COMMENT ON COLUMN plano_contas_dre.grupo_conta IS 'Account group for categorization (e.g., Receitas Operacionais, Custos Fixos)';
