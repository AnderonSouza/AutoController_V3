-- Script de Auditoria: Identificar tabelas com organizacao_id NULL
-- Executar no Supabase SQL Editor
-- Baseado nas tabelas reais do banco de dados

-- 1. Listar todas as tabelas que têm a coluna organizacao_id
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE column_name = 'organizacao_id' 
  AND table_schema = 'public'
ORDER BY table_name;

-- 2. Contar registros NULL em cada tabela (executar cada query individualmente)

-- anexos_fechamento
SELECT 'anexos_fechamento' as tabela, COUNT(*) as total, COUNT(organizacao_id) as com_org, COUNT(*) - COUNT(organizacao_id) as sem_org FROM anexos_fechamento;

-- centros_resultado
SELECT 'centros_resultado' as tabela, COUNT(*) as total, COUNT(organizacao_id) as com_org, COUNT(*) - COUNT(organizacao_id) as sem_org FROM centros_resultado;

-- chamados
SELECT 'chamados' as tabela, COUNT(*) as total, COUNT(organizacao_id) as com_org, COUNT(*) - COUNT(organizacao_id) as sem_org FROM chamados;

-- ciclos_fechamento
SELECT 'ciclos_fechamento' as tabela, COUNT(*) as total, COUNT(organizacao_id) as com_org, COUNT(*) - COUNT(organizacao_id) as sem_org FROM ciclos_fechamento;

-- comentarios_fechamento
SELECT 'comentarios_fechamento' as tabela, COUNT(*) as total, COUNT(organizacao_id) as com_org, COUNT(*) - COUNT(organizacao_id) as sem_org FROM comentarios_fechamento;

-- console_config
SELECT 'console_config' as tabela, COUNT(*) as total, COUNT(organizacao_id) as com_org, COUNT(*) - COUNT(organizacao_id) as sem_org FROM console_config;

-- departamentos
SELECT 'departamentos' as tabela, COUNT(*) as total, COUNT(organizacao_id) as com_org, COUNT(*) - COUNT(organizacao_id) as sem_org FROM departamentos;

-- empresas
SELECT 'empresas' as tabela, COUNT(*) as total, COUNT(organizacao_id) as com_org, COUNT(*) - COUNT(organizacao_id) as sem_org FROM empresas;

-- formulas_calculo
SELECT 'formulas_calculo' as tabela, COUNT(*) as total, COUNT(organizacao_id) as com_org, COUNT(*) - COUNT(organizacao_id) as sem_org FROM formulas_calculo;

-- lancamentos_ajustes
SELECT 'lancamentos_ajustes' as tabela, COUNT(*) as total, COUNT(organizacao_id) as com_org, COUNT(*) - COUNT(organizacao_id) as sem_org FROM lancamentos_ajustes;

-- lancamentos_contabeis
SELECT 'lancamentos_contabeis' as tabela, COUNT(*) as total, COUNT(organizacao_id) as com_org, COUNT(*) - COUNT(organizacao_id) as sem_org FROM lancamentos_contabeis;

-- linhas_relatorio
SELECT 'linhas_relatorio' as tabela, COUNT(*) as total, COUNT(organizacao_id) as com_org, COUNT(*) - COUNT(organizacao_id) as sem_org FROM linhas_relatorio;

-- mapeamento_contas
SELECT 'mapeamento_contas' as tabela, COUNT(*) as total, COUNT(organizacao_id) as com_org, COUNT(*) - COUNT(organizacao_id) as sem_org FROM mapeamento_contas;

-- marcas
SELECT 'marcas' as tabela, COUNT(*) as total, COUNT(organizacao_id) as com_org, COUNT(*) - COUNT(organizacao_id) as sem_org FROM marcas;

-- mensagens_chamado
SELECT 'mensagens_chamado' as tabela, COUNT(*) as total, COUNT(organizacao_id) as com_org, COUNT(*) - COUNT(organizacao_id) as sem_org FROM mensagens_chamado;

-- metas_indicadores
SELECT 'metas_indicadores' as tabela, COUNT(*) as total, COUNT(organizacao_id) as com_org, COUNT(*) - COUNT(organizacao_id) as sem_org FROM metas_indicadores;

-- modelos_relatorios
SELECT 'modelos_relatorios' as tabela, COUNT(*) as total, COUNT(organizacao_id) as com_org, COUNT(*) - COUNT(organizacao_id) as sem_org FROM modelos_relatorios;

-- modelos_tarefas_fechamento
SELECT 'modelos_tarefas_fechamento' as tabela, COUNT(*) as total, COUNT(organizacao_id) as com_org, COUNT(*) - COUNT(organizacao_id) as sem_org FROM modelos_tarefas_fechamento;

-- notificacoes
SELECT 'notificacoes' as tabela, COUNT(*) as total, COUNT(organizacao_id) as com_org, COUNT(*) - COUNT(organizacao_id) as sem_org FROM notificacoes;

-- orcamento
SELECT 'orcamento' as tabela, COUNT(*) as total, COUNT(organizacao_id) as com_org, COUNT(*) - COUNT(organizacao_id) as sem_org FROM orcamento;

-- plano_contas
SELECT 'plano_contas' as tabela, COUNT(*) as total, COUNT(organizacao_id) as com_org, COUNT(*) - COUNT(organizacao_id) as sem_org FROM plano_contas;

-- plano_contas_balanco
SELECT 'plano_contas_balanco' as tabela, COUNT(*) as total, COUNT(organizacao_id) as com_org, COUNT(*) - COUNT(organizacao_id) as sem_org FROM plano_contas_balanco;

-- plano_contas_dre
SELECT 'plano_contas_dre' as tabela, COUNT(*) as total, COUNT(organizacao_id) as com_org, COUNT(*) - COUNT(organizacao_id) as sem_org FROM plano_contas_dre;

-- premissas_orcamentarias
SELECT 'premissas_orcamentarias' as tabela, COUNT(*) as total, COUNT(organizacao_id) as com_org, COUNT(*) - COUNT(organizacao_id) as sem_org FROM premissas_orcamentarias;

-- saldos_mensais
SELECT 'saldos_mensais' as tabela, COUNT(*) as total, COUNT(organizacao_id) as com_org, COUNT(*) - COUNT(organizacao_id) as sem_org FROM saldos_mensais;

-- tarefas_fechamento
SELECT 'tarefas_fechamento' as tabela, COUNT(*) as total, COUNT(organizacao_id) as com_org, COUNT(*) - COUNT(organizacao_id) as sem_org FROM tarefas_fechamento;

-- temas_interface
SELECT 'temas_interface' as tabela, COUNT(*) as total, COUNT(organizacao_id) as com_org, COUNT(*) - COUNT(organizacao_id) as sem_org FROM temas_interface;

-- usuarios
SELECT 'usuarios' as tabela, COUNT(*) as total, COUNT(organizacao_id) as com_org, COUNT(*) - COUNT(organizacao_id) as sem_org FROM usuarios;

-- valores_premissas
SELECT 'valores_premissas' as tabela, COUNT(*) as total, COUNT(organizacao_id) as com_org, COUNT(*) - COUNT(organizacao_id) as sem_org FROM valores_premissas;

-- 3. Script para corrigir TODAS as tabelas com organizacao_id NULL
-- Grupo Viamar ID: 2d34f577-049c-46cb-9b4c-99a68134cd86
-- ATENÇÃO: Execute apenas após confirmar quais tabelas precisam ser corrigidas

/*
-- Descomente e execute cada UPDATE necessário:

UPDATE anexos_fechamento SET organizacao_id = '2d34f577-049c-46cb-9b4c-99a68134cd86'::uuid WHERE organizacao_id IS NULL;
UPDATE centros_resultado SET organizacao_id = '2d34f577-049c-46cb-9b4c-99a68134cd86'::uuid WHERE organizacao_id IS NULL;
UPDATE chamados SET organizacao_id = '2d34f577-049c-46cb-9b4c-99a68134cd86'::uuid WHERE organizacao_id IS NULL;
UPDATE ciclos_fechamento SET organizacao_id = '2d34f577-049c-46cb-9b4c-99a68134cd86'::uuid WHERE organizacao_id IS NULL;
UPDATE comentarios_fechamento SET organizacao_id = '2d34f577-049c-46cb-9b4c-99a68134cd86'::uuid WHERE organizacao_id IS NULL;
UPDATE console_config SET organizacao_id = '2d34f577-049c-46cb-9b4c-99a68134cd86'::uuid WHERE organizacao_id IS NULL;
UPDATE departamentos SET organizacao_id = '2d34f577-049c-46cb-9b4c-99a68134cd86'::uuid WHERE organizacao_id IS NULL;
UPDATE empresas SET organizacao_id = '2d34f577-049c-46cb-9b4c-99a68134cd86'::uuid WHERE organizacao_id IS NULL;
UPDATE formulas_calculo SET organizacao_id = '2d34f577-049c-46cb-9b4c-99a68134cd86'::uuid WHERE organizacao_id IS NULL;
UPDATE lancamentos_ajustes SET organizacao_id = '2d34f577-049c-46cb-9b4c-99a68134cd86'::uuid WHERE organizacao_id IS NULL;
UPDATE lancamentos_contabeis SET organizacao_id = '2d34f577-049c-46cb-9b4c-99a68134cd86'::uuid WHERE organizacao_id IS NULL;
UPDATE linhas_relatorio SET organizacao_id = '2d34f577-049c-46cb-9b4c-99a68134cd86'::uuid WHERE organizacao_id IS NULL;
UPDATE mapeamento_contas SET organizacao_id = '2d34f577-049c-46cb-9b4c-99a68134cd86'::uuid WHERE organizacao_id IS NULL;
UPDATE marcas SET organizacao_id = '2d34f577-049c-46cb-9b4c-99a68134cd86'::uuid WHERE organizacao_id IS NULL;
UPDATE mensagens_chamado SET organizacao_id = '2d34f577-049c-46cb-9b4c-99a68134cd86'::uuid WHERE organizacao_id IS NULL;
UPDATE metas_indicadores SET organizacao_id = '2d34f577-049c-46cb-9b4c-99a68134cd86'::uuid WHERE organizacao_id IS NULL;
UPDATE modelos_relatorios SET organizacao_id = '2d34f577-049c-46cb-9b4c-99a68134cd86'::uuid WHERE organizacao_id IS NULL;
UPDATE modelos_tarefas_fechamento SET organizacao_id = '2d34f577-049c-46cb-9b4c-99a68134cd86'::uuid WHERE organizacao_id IS NULL;
UPDATE notificacoes SET organizacao_id = '2d34f577-049c-46cb-9b4c-99a68134cd86'::uuid WHERE organizacao_id IS NULL;
UPDATE orcamento SET organizacao_id = '2d34f577-049c-46cb-9b4c-99a68134cd86'::uuid WHERE organizacao_id IS NULL;
UPDATE plano_contas SET organizacao_id = '2d34f577-049c-46cb-9b4c-99a68134cd86'::uuid WHERE organizacao_id IS NULL;
UPDATE plano_contas_balanco SET organizacao_id = '2d34f577-049c-46cb-9b4c-99a68134cd86'::uuid WHERE organizacao_id IS NULL;
UPDATE plano_contas_dre SET organizacao_id = '2d34f577-049c-46cb-9b4c-99a68134cd86'::uuid WHERE organizacao_id IS NULL;
UPDATE premissas_orcamentarias SET organizacao_id = '2d34f577-049c-46cb-9b4c-99a68134cd86'::uuid WHERE organizacao_id IS NULL;
UPDATE saldos_mensais SET organizacao_id = '2d34f577-049c-46cb-9b4c-99a68134cd86'::uuid WHERE organizacao_id IS NULL;
UPDATE tarefas_fechamento SET organizacao_id = '2d34f577-049c-46cb-9b4c-99a68134cd86'::uuid WHERE organizacao_id IS NULL;
UPDATE temas_interface SET organizacao_id = '2d34f577-049c-46cb-9b4c-99a68134cd86'::uuid WHERE organizacao_id IS NULL;
UPDATE usuarios SET organizacao_id = '2d34f577-049c-46cb-9b4c-99a68134cd86'::uuid WHERE organizacao_id IS NULL;
UPDATE valores_premissas SET organizacao_id = '2d34f577-049c-46cb-9b4c-99a68134cd86'::uuid WHERE organizacao_id IS NULL;

*/
