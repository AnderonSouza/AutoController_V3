import { useMemo } from 'react';
import type { 
  FinancialAccount, 
  BudgetAssumption, 
  BudgetAssumptionValue,
  DreAccount,
  MonthlyData
} from '../types';
import { CALENDAR_MONTHS } from '../constants';

interface BudgetMapping {
  id: string;
  premissaId: string;
  tipoDestino?: 'conta_dre' | 'indicador_operacional';
  contaDreId?: string;
  indicadorId?: string;
  departamentoId?: string;
  fatorMultiplicador: number;
  tipoCalculo: 'direto' | 'formula' | 'percentual';
  formula?: string;
}

interface AuxiliaryPremise {
  id: string;
  nome: string;
  tipo: 'preco_medio' | 'margem' | 'taxa' | 'indice' | 'outros';
  contaDreId?: string;
  departamento?: string;
  empresaId?: string;
  ano: number;
  mes?: string;
  valor: number;
}

interface MonthlyBalance {
  id: string;
  empresaId: string;
  contaContabilId: string;
  ano: number;
  mes: number;
  valor: number;
}

interface ReportLine {
  id: string;
  type: string;
  operationalFormulaId?: string;
}

interface UseBudgetCalculationProps {
  dreAccounts: DreAccount[];
  assumptions: BudgetAssumption[];
  assumptionValues: BudgetAssumptionValue[];
  budgetMappings: BudgetMapping[];
  auxiliaryPremises: AuxiliaryPremise[];
  monthlyBalances: MonthlyBalance[];
  selectedYear: number;
  selectedMonths: string[];
  selectedCompanyId?: string;
  selectedDepartment?: string;
  accountMappings?: { contaContabilId: string; contaDreId: string }[];
  reportLines?: ReportLine[];
  departmentMap?: { [id: string]: string };
}

interface BudgetDataByPeriod {
  [accountId: string]: {
    [year: number]: {
      [month: string]: {
        premissas: number;
        historico: number;
        manual: number;
        importado: number;
        total: number;
      };
    };
  };
}

export function useBudgetCalculation({
  dreAccounts,
  assumptions,
  assumptionValues,
  budgetMappings,
  auxiliaryPremises,
  monthlyBalances,
  selectedYear,
  selectedMonths,
  selectedCompanyId,
  selectedDepartment,
  accountMappings = [],
  reportLines = [],
  departmentMap = {},
}: UseBudgetCalculationProps) {

  const budgetData = useMemo(() => {
    const result: BudgetDataByPeriod = {};

    const initializeAccountEntry = (accountId: string) => {
      if (!result[accountId]) {
        result[accountId] = {};
        [selectedYear, selectedYear - 1].forEach(year => {
          result[accountId][year] = {};
          CALENDAR_MONTHS.forEach(month => {
            result[accountId][year][month] = {
              premissas: 0,
              historico: 0,
              manual: 0,
              importado: 0,
              total: 0,
            };
          });
        });
      }
    };

    dreAccounts.forEach(account => {
      initializeAccountEntry(account.id);
    });

    reportLines.forEach(line => {
      initializeAccountEntry(line.id);
    });

    console.log('[v0-budget] Processing mappings:', {
      mappingsCount: budgetMappings.length,
      reportLinesCount: reportLines.length,
      assumptionValuesCount: assumptionValues.length,
      selectedYear,
      selectedDepartment,
    });

    budgetMappings.forEach(mapping => {
      const mappingDepartmentName = mapping.departamentoId ? departmentMap[mapping.departamentoId] : undefined;
      
      console.log('[v0-budget] Processing mapping:', {
        premissaId: mapping.premissaId,
        tipoDestino: mapping.tipoDestino,
        indicadorId: mapping.indicadorId,
        contaDreId: mapping.contaDreId,
        mappingDepartmentName,
      });

      const relevantValues = assumptionValues.filter(v => 
        v.assumptionId === mapping.premissaId &&
        v.year === selectedYear &&
        (!selectedCompanyId || v.store === selectedCompanyId) &&
        (!selectedDepartment || v.department === selectedDepartment) &&
        (!mappingDepartmentName || v.department === mappingDepartmentName)
      );

      console.log('[v0-budget] Relevant values found:', {
        count: relevantValues.length,
        values: relevantValues.map(v => ({ month: v.month, value: v.value, dept: v.department, store: v.store })),
      });

      let targetAccountId: string | undefined;
      
      if (mapping.tipoDestino === 'indicador_operacional' && mapping.indicadorId) {
        console.log('[v0-budget] Looking for operational line:', {
          indicadorId: mapping.indicadorId,
          operationalLines: reportLines.filter(l => l.type === 'operational').map(l => ({
            id: l.id,
            type: l.type,
            operationalFormulaId: l.operationalFormulaId,
          })),
        });
        const operationalLine = reportLines.find(line => {
          if (line.type !== 'operational') return false;
          const formulaId = line.operationalFormulaId;
          if (!formulaId) return false;
          // Check for exact match or prefixed match (OPE:uuid or OP:uuid)
          return formulaId === mapping.indicadorId ||
                 formulaId === `OPE:${mapping.indicadorId}` ||
                 formulaId === `OP:${mapping.indicadorId}`;
        });
        targetAccountId = operationalLine?.id;
        console.log('[v0-budget] Found operational line:', operationalLine?.id);
      } else {
        targetAccountId = mapping.contaDreId;
      }

      if (!targetAccountId) {
        console.log('[v0-budget] No target account found for mapping');
        return;
      }

      relevantValues.forEach(val => {
        if (result[targetAccountId!]?.[val.year]?.[val.month]) {
          let calculatedValue = val.value;
          
          if (mapping.tipoCalculo === 'direto') {
            calculatedValue = val.value * mapping.fatorMultiplicador;
          } else if (mapping.tipoCalculo === 'percentual') {
            calculatedValue = (val.value * mapping.fatorMultiplicador) / 100;
          } else if (mapping.tipoCalculo === 'formula' && mapping.formula) {
            const auxPremise = auxiliaryPremises.find(ap => 
              ap.contaDreId === targetAccountId &&
              ap.ano === val.year &&
              (!ap.mes || ap.mes === val.month)
            );
            
            if (auxPremise && mapping.formula.includes('preco_medio')) {
              calculatedValue = val.value * auxPremise.valor;
            } else {
              calculatedValue = val.value * mapping.fatorMultiplicador;
            }
          }
          
          result[targetAccountId!][val.year][val.month].premissas += calculatedValue;
        }
      });
    });

    const previousYear = selectedYear - 1;
    
    if (accountMappings.length > 0) {
      const dreToContabil: Record<string, string[]> = {};
      accountMappings.forEach(m => {
        if (!dreToContabil[m.contaDreId]) {
          dreToContabil[m.contaDreId] = [];
        }
        dreToContabil[m.contaDreId].push(m.contaContabilId);
      });

      monthlyBalances
        .filter(b => b.ano === previousYear && (!selectedCompanyId || b.empresaId === selectedCompanyId))
        .forEach(balance => {
          Object.entries(dreToContabil).forEach(([dreId, contabilIds]) => {
            if (contabilIds.includes(balance.contaContabilId)) {
              const monthName = CALENDAR_MONTHS[balance.mes - 1];
              if (result[dreId]?.[selectedYear]?.[monthName]) {
                result[dreId][selectedYear][monthName].historico += balance.valor;
              }
            }
          });
        });
    }

    Object.keys(result).forEach(accountId => {
      Object.keys(result[accountId]).forEach(yearStr => {
        const year = parseInt(yearStr);
        Object.keys(result[accountId][year]).forEach(month => {
          const data = result[accountId][year][month];
          data.total = data.premissas + data.historico + data.manual + data.importado;
        });
      });
    });

    return result;
  }, [
    dreAccounts, 
    assumptions, 
    assumptionValues, 
    budgetMappings, 
    auxiliaryPremises, 
    monthlyBalances,
    selectedYear, 
    selectedMonths, 
    selectedCompanyId, 
    selectedDepartment,
    accountMappings,
    reportLines,
    departmentMap,
  ]);

  const applyBudgetToAccounts = useMemo(() => {
    return (accounts: FinancialAccount[]): FinancialAccount[] => {
      const applyToAccount = (account: FinancialAccount): FinancialAccount => {
        const updatedAccount = { ...account };
        
        if (!updatedAccount.monthlyData) {
          updatedAccount.monthlyData = {};
        }

        const accountBudget = budgetData[account.id];
        if (accountBudget) {
          Object.entries(accountBudget).forEach(([yearStr, months]) => {
            const year = parseInt(yearStr);
            if (!updatedAccount.monthlyData[year]) {
              updatedAccount.monthlyData[year] = {};
            }
            
            Object.entries(months).forEach(([month, values]) => {
              if (!updatedAccount.monthlyData[year][month]) {
                updatedAccount.monthlyData[year][month] = {} as MonthlyData;
              }
              
              updatedAccount.monthlyData[year][month] = {
                ...updatedAccount.monthlyData[year][month],
                orcadoPremissas: values.premissas,
                orcadoHistorico: values.historico,
                orcadoManual: values.manual,
                orcadoImportado: values.importado,
                orcado: values.total,
              };
            });
          });
        }

        if (account.children && account.children.length > 0) {
          updatedAccount.children = account.children.map(applyToAccount);
        }

        return updatedAccount;
      };

      return accounts.map(applyToAccount);
    };
  }, [budgetData]);

  const updateManualValue = (
    accountId: string, 
    year: number, 
    month: string, 
    value: number
  ): BudgetDataByPeriod => {
    const updated = { ...budgetData };
    if (updated[accountId]?.[year]?.[month]) {
      updated[accountId][year][month].manual = value;
      const data = updated[accountId][year][month];
      data.total = data.premissas + data.historico + data.manual + data.importado;
    }
    return updated;
  };

  const getTotalsByOrigin = useMemo(() => {
    const totals = {
      premissas: 0,
      historico: 0,
      manual: 0,
      importado: 0,
      total: 0,
    };

    Object.values(budgetData).forEach(years => {
      if (years[selectedYear]) {
        selectedMonths.forEach(month => {
          const data = years[selectedYear][month];
          if (data) {
            totals.premissas += data.premissas;
            totals.historico += data.historico;
            totals.manual += data.manual;
            totals.importado += data.importado;
            totals.total += data.total;
          }
        });
      }
    });

    return totals;
  }, [budgetData, selectedYear, selectedMonths]);

  return {
    budgetData,
    applyBudgetToAccounts,
    updateManualValue,
    getTotalsByOrigin,
  };
}

export default useBudgetCalculation;
