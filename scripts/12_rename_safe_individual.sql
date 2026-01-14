-- =====================================================
-- RENOMEAR COLUNAS COM VERIFICAÇÃO INDIVIDUAL
-- =====================================================
-- Executa cada renomeação apenas se a coluna existir
-- =====================================================

DO $$
BEGIN
  -- anexos_fechamento
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'anexos_fechamento' AND column_name = 'grupo_economico_id') THEN
    ALTER TABLE anexos_fechamento RENAME COLUMN grupo_economico_id TO organizacao_id;
    RAISE NOTICE 'Renomeado: anexos_fechamento';
  END IF;

  -- centros_resultado
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'centros_resultado' AND column_name = 'grupo_economico_id') THEN
    ALTER TABLE centros_resultado RENAME COLUMN grupo_economico_id TO organizacao_id;
    RAISE NOTICE 'Renomeado: centros_resultado';
  END IF;

  -- chamados
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chamados' AND column_name = 'grupo_economico_id') THEN
    ALTER TABLE chamados RENAME COLUMN grupo_economico_id TO organizacao_id;
    RAISE NOTICE 'Renomeado: chamados';
  END IF;

  -- ciclos_fechamento
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ciclos_fechamento' AND column_name = 'grupo_economico_id') THEN
    ALTER TABLE ciclos_fechamento RENAME COLUMN grupo_economico_id TO organizacao_id;
    RAISE NOTICE 'Renomeado: ciclos_fechamento';
  END IF;

  -- comentarios_fechamento
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'comentarios_fechamento' AND column_name = 'grupo_economico_id') THEN
    ALTER TABLE comentarios_fechamento RENAME COLUMN grupo_economico_id TO organizacao_id;
    RAISE NOTICE 'Renomeado: comentarios_fechamento';
  END IF;

  -- formulas_calculo
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'formulas_calculo' AND column_name = 'grupo_economico_id') THEN
    ALTER TABLE formulas_calculo RENAME COLUMN grupo_economico_id TO organizacao_id;
    RAISE NOTICE 'Renomeado: formulas_calculo';
  END IF;

  -- mapeamento_contas
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mapeamento_contas' AND column_name = 'grupo_economico_id') THEN
    ALTER TABLE mapeamento_contas RENAME COLUMN grupo_economico_id TO organizacao_id;
    RAISE NOTICE 'Renomeado: mapeamento_contas';
  END IF;

  -- mensagens_chamado
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mensagens_chamado' AND column_name = 'grupo_economico_id') THEN
    ALTER TABLE mensagens_chamado RENAME COLUMN grupo_economico_id TO organizacao_id;
    RAISE NOTICE 'Renomeado: mensagens_chamado';
  END IF;

  -- metas_indicadores
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'metas_indicadores' AND column_name = 'grupo_economico_id') THEN
    ALTER TABLE metas_indicadores RENAME COLUMN grupo_economico_id TO organizacao_id;
    RAISE NOTICE 'Renomeado: metas_indicadores';
  END IF;

  -- modelos_relatorios
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'modelos_relatorios' AND column_name = 'grupo_economico_id') THEN
    ALTER TABLE modelos_relatorios RENAME COLUMN grupo_economico_id TO organizacao_id;
    RAISE NOTICE 'Renomeado: modelos_relatorios';
  END IF;

  -- modelos_tarefas_fechamento
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'modelos_tarefas_fechamento' AND column_name = 'grupo_economico_id') THEN
    ALTER TABLE modelos_tarefas_fechamento RENAME COLUMN grupo_economico_id TO organizacao_id;
    RAISE NOTICE 'Renomeado: modelos_tarefas_fechamento';
  END IF;

  -- orcamento
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orcamento' AND column_name = 'grupo_economico_id') THEN
    ALTER TABLE orcamento RENAME COLUMN grupo_economico_id TO organizacao_id;
    RAISE NOTICE 'Renomeado: orcamento';
  END IF;

  -- plano_contas
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plano_contas' AND column_name = 'grupo_economico_id') THEN
    ALTER TABLE plano_contas RENAME COLUMN grupo_economico_id TO organizacao_id;
    RAISE NOTICE 'Renomeado: plano_contas';
  END IF;

  -- tarefas_fechamento
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tarefas_fechamento' AND column_name = 'grupo_economico_id') THEN
    ALTER TABLE tarefas_fechamento RENAME COLUMN grupo_economico_id TO organizacao_id;
    RAISE NOTICE 'Renomeado: tarefas_fechamento';
  END IF;

  -- temas_interface
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'temas_interface' AND column_name = 'grupo_economico_id') THEN
    ALTER TABLE temas_interface RENAME COLUMN grupo_economico_id TO organizacao_id;
    RAISE NOTICE 'Renomeado: temas_interface';
  END IF;

  -- valores_premissas
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'valores_premissas' AND column_name = 'grupo_economico_id') THEN
    ALTER TABLE valores_premissas RENAME COLUMN grupo_economico_id TO organizacao_id;
    RAISE NOTICE 'Renomeado: valores_premissas';
  END IF;

  -- usuarios
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'grupo_economico_id') THEN
    ALTER TABLE usuarios RENAME COLUMN grupo_economico_id TO organizacao_id;
    RAISE NOTICE 'Renomeado: usuarios';
  END IF;

  RAISE NOTICE 'Renomeação de colunas concluída!';
END $$;

-- 2. Verificar resultado
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE column_name IN ('grupo_economico_id', 'organizacao_id')
AND table_schema = 'public'
ORDER BY table_name;
