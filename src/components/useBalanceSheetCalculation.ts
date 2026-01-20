import { useCallback } from 'react';
import { FinancialAccount, ReportTemplate, ReportLine, AccountCostCenterMapping } from '../types';
import { createEmptyYearlyData, MONTHS } from '../constants';

interface MonthlyBalanceEntry {
  id?: string
  empresaId: string
  contaContabilId: string
  ano: number
  mes: string
  valor: number
}

export const useBalanceSheetCalculation = () => {
    
    const calculateBalanceSheet = useCallback((
        template: ReportTemplate,
        reportLines: ReportLine[],
        monthlyBalances: MonthlyBalanceEntry[],
        accountMappings: AccountCostCenterMapping[],
        selectedPeriod: { years: number[], months: string[] },
        filterCompanyIds: string[] = []
    ): FinancialAccount[] => {
        if (!reportLines || reportLines.length === 0) return [];

        const years = selectedPeriod.years;
        const lineMap = new Map<string, FinancialAccount>();

        const balanceAccountMap = new Map<string, string>();
        accountMappings.forEach(m => {
            if (m.contaContabilId && m.contaBalancoId) {
                balanceAccountMap.set(m.contaContabilId, m.contaBalancoId)
            }
        })

        reportLines.forEach(line => {
            lineMap.set(line.id, {
                id: line.id,
                name: line.name,
                isTotal: line.type === 'total',
                isSubTotal: line.type === 'header',
                monthlyData: createEmptyYearlyData(years),
                children: []
            });
        });

        monthlyBalances.forEach(balance => {
            if (filterCompanyIds.length > 0 && !filterCompanyIds.includes(balance.empresaId)) return;

            const balanceAccountId = balanceAccountMap.get(balance.contaContabilId)
            if (!balanceAccountId) return

            reportLines.forEach(line => {
                // Use dreAccountId since linhas_relatorio stores balance account IDs in conta_dre_id column
                if (line.type === 'data_bucket' && line.dreAccountId === balanceAccountId) {
                    const acc = lineMap.get(line.id);
                    const entryMonth = balance.mes?.toUpperCase() || '';
                    const monthKey = MONTHS.find(m => m.toUpperCase() === entryMonth) || balance.mes;
                    
                    if (acc && acc.monthlyData[balance.ano] && acc.monthlyData[balance.ano][monthKey]) {
                        acc.monthlyData[balance.ano][monthKey].balancete += balance.valor;
                    }
                }
            });
        });

        const buildTree = (parentId: string | null): FinancialAccount[] => {
            return reportLines
                .filter(l => l.parentId === parentId)
                .sort((a, b) => a.order - b.order)
                .map(line => {
                    const node = lineMap.get(line.id)!;
                    node.children = buildTree(line.id);

                    if (line.type !== 'data_bucket' && node.children.length > 0) {
                        node.children.forEach(child => {
                            years.forEach(y => {
                                MONTHS.forEach(m => {
                                    const c = child.monthlyData[y]?.[m];
                                    const p = node.monthlyData[y]?.[m];
                                    if (c && p) {
                                        const sign = line.sign === -1 ? -1 : 1;
                                        p.balancete += c.balancete * sign;
                                    }
                                });
                            });
                        });
                    }
                    return node;
                });
        };

        return buildTree(null);
    }, []);

    return { calculateBalanceSheet };
};
