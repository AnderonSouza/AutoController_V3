import { useCallback } from 'react';
import { 
    FinancialAccount, ReportTemplate, ReportLine, 
    TrialBalanceEntry, AdjustmentEntry, CgEntry, ManagementTransfer, MonthlyData,
    OperationalValueEntry
} from '../types';
import { createEmptyYearlyData, MONTHS } from '../constants';

export const useDreCalculation = () => {
    
    const calculateEffectiveResult = (data: MonthlyData): number => {
        return (data.balancete || 0) + 
               (data.transfGerencial || 0) + 
               (data.ajusteContabil || 0) + 
               (data.cgGerencial || 0) + 
               (data.cg || 0);
    };

    const calculateDynamicReport = useCallback((
        template: ReportTemplate,
        reportLines: ReportLine[],
        accountingEntries: TrialBalanceEntry[],
        adjustments: AdjustmentEntry[],
        cgEntries: CgEntry[],
        transfers: ManagementTransfer[],
        selectedPeriod: { years: number[], months: string[] },
        filterStore: string = 'Consolidado',
        filterCostCenterIds: string[] | null = null,
        operationalValues: OperationalValueEntry[] = [],
        filterDepartmentId: string | null = null
    ): FinancialAccount[] => {
        if (!reportLines || reportLines.length === 0) return [];

        const years = selectedPeriod.years;
        const lineMap = new Map<string, FinancialAccount>();

        // 1. Inicializar estrutura
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

        // 2. Processar Realizado (Lançamentos Contábeis)
        accountingEntries.forEach(entry => {
            if (filterStore !== 'Consolidado' && entry.companyId !== filterStore) return;
            if (filterCostCenterIds && filterCostCenterIds.length > 0 && !filterCostCenterIds.includes((entry as any).costCenterId)) return;

            const entryDreId = (entry as any).dreAccountId || entry.idconta;
            
            reportLines.forEach(line => {
                if (line.type === 'data_bucket' && line.dreAccountId === entryDreId) {
                    const acc = lineMap.get(line.id);
                    const entryMonth = entry.month?.toUpperCase() || '';
                    const monthKey = MONTHS.find(m => m.toUpperCase() === entryMonth) || entry.month;
                    
                    if (acc && acc.monthlyData[entry.year] && acc.monthlyData[entry.year][monthKey]) {
                        const val = entry.natureza === 'D' ? -entry.valor : entry.valor;
                        acc.monthlyData[entry.year][monthKey].balancete += val;
                    }
                }
            });
        });

        // 2.5. Processar Linhas Operacionais (Dados não-financeiros)
        reportLines.forEach(line => {
            if (line.type === 'operational' && line.operationalFormulaId) {
                const acc = lineMap.get(line.id);
                if (!acc) return;

                const indicadorId = line.operationalFormulaId;

                years.forEach(year => {
                    MONTHS.forEach(month => {
                        const matchingValues = operationalValues.filter(v => {
                            if (v.indicadorId !== indicadorId) return false;
                            if (v.ano !== year) return false;
                            
                            const normalizedMonth = month.toUpperCase();
                            const valueMonth = (v.mes || '').toUpperCase();
                            if (normalizedMonth !== valueMonth && !valueMonth.startsWith(normalizedMonth.substring(0, 3))) return false;

                            if (filterStore !== 'Consolidado' && v.empresaId && v.empresaId !== filterStore) return false;
                            if (filterDepartmentId && v.departamentoId && v.departamentoId !== filterDepartmentId) return false;

                            return true;
                        });

                        const totalValue = matchingValues.reduce((sum, v) => sum + (v.valor || 0), 0);
                        
                        if (acc.monthlyData[year] && acc.monthlyData[year][month]) {
                            acc.monthlyData[year][month].balancete = totalValue;
                        }
                    });
                });
            }
        });

        // 3. Processar Ajustes
        const addAjuste = (items: AdjustmentEntry[], field: keyof MonthlyData) => {
            items.forEach(item => {
                if (filterStore !== 'Consolidado' && item.companyId !== filterStore) return;
                reportLines.forEach(line => {
                    if (line.dreAccountId === item.dreAccountName) {
                        const acc = lineMap.get(line.id);
                        if (acc && acc.monthlyData[item.year]) {
                            (acc.monthlyData[item.year][item.month] as any)[field] += item.value;
                        }
                    }
                });
            });
        };

        addAjuste(adjustments, 'ajusteContabil');
        addAjuste(cgEntries, 'cg');
        addAjuste(transfers, 'transfGerencial');

        // 4. Resolver Hierarquia e Totais
        const buildTree = (parentId: string | null): FinancialAccount[] => {
            return reportLines
                .filter(l => l.parentId === parentId)
                .sort((a, b) => a.order - b.order)
                .map(line => {
                    const node = lineMap.get(line.id)!;
                    node.children = buildTree(line.id);

                    // Se não for analítico, soma os filhos (exceto linhas operacionais que já foram preenchidas)
                    if (line.type !== 'data_bucket' && line.type !== 'operational' && node.children.length > 0) {
                        node.children.forEach(child => {
                            years.forEach(y => {
                                MONTHS.forEach(m => {
                                    const c = child.monthlyData[y][m];
                                    const p = node.monthlyData[y][m];
                                    const sign = child.id.includes('subtracao') ? -1 : 1;

                                    p.balancete += c.balancete * sign;
                                    p.ajusteContabil! += (c.ajusteContabil || 0) * sign;
                                    p.cg! += (c.cg || 0) * sign;
                                    p.transfGerencial! += (c.transfGerencial || 0) * sign;
                                });
                            });
                        });
                    }
                    return node;
                });
        };

        return buildTree(null);
    }, []);

    return { calculateDynamicReport, calculateEffectiveResult };
};
