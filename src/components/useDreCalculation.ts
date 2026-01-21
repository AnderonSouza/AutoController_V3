import { useCallback } from 'react';
import { 
    FinancialAccount, ReportTemplate, ReportLine, 
    TrialBalanceEntry, AdjustmentEntry, CgEntry, ManagementTransfer, MonthlyData,
    DreAccount
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
        dreAccounts: DreAccount[] = []
    ): FinancialAccount[] => {
        if (!reportLines || reportLines.length === 0) return [];

        const years = selectedPeriod.years;
        const lineMap = new Map<string, FinancialAccount>();
        const analyticalAccountMap = new Map<string, FinancialAccount>();

        // 1. Inicializar estrutura das linhas do relatório
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

        // 1b. Criar linhas analíticas a partir do plano de contas DRE
        dreAccounts.forEach(account => {
            const analyticalNode: FinancialAccount = {
                id: `dre-${account.id}`,
                name: account.name,
                isTotal: false,
                isSubTotal: false,
                monthlyData: createEmptyYearlyData(years),
                children: [],
                levelAdjustment: 1
            };
            analyticalAccountMap.set(account.id, analyticalNode);
        });

        // 2. Processar Realizado (Lançamentos Contábeis)
        // Entries now come with dreAccountId already resolved from mapeamento_contas
        accountingEntries.forEach(entry => {
            if (filterStore !== 'Consolidado' && entry.companyId !== filterStore) return;
            if (filterCostCenterIds && filterCostCenterIds.length > 0 && !filterCostCenterIds.includes((entry as any).costCenterId)) return;

            const entryDreId = (entry as any).dreAccountId || entry.idconta;
            const entryMonth = entry.month?.toUpperCase() || '';
            const monthKey = MONTHS.find(m => m.toUpperCase() === entryMonth) || entry.month;
            const val = entry.natureza === 'D' ? -entry.valor : entry.valor;
            
            // Populate analytical account if it exists
            const analyticalAcc = analyticalAccountMap.get(entryDreId);
            if (analyticalAcc && analyticalAcc.monthlyData[entry.year] && analyticalAcc.monthlyData[entry.year][monthKey]) {
                analyticalAcc.monthlyData[entry.year][monthKey].balancete += val;
            }
            
            // Also populate report line directly if it matches
            reportLines.forEach(line => {
                if (line.type === 'data_bucket' && line.dreAccountId === entryDreId) {
                    const acc = lineMap.get(line.id);
                    if (acc && acc.monthlyData[entry.year] && acc.monthlyData[entry.year][monthKey]) {
                        acc.monthlyData[entry.year][monthKey].balancete += val;
                    }
                }
            });
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
                    
                    // Build children from report lines first
                    const reportLineChildren = buildTree(line.id);
                    
                    // For data_bucket lines, add analytical accounts as children
                    let analyticalChildren: FinancialAccount[] = [];
                    if (line.type === 'data_bucket' && dreAccounts.length > 0) {
                        // Find DRE accounts that belong to this line (grupoConta matches dreAccountId)
                        const matchingAccounts = dreAccounts.filter(
                            acc => acc.grupoConta === line.dreAccountId || acc.id === line.dreAccountId
                        );
                        
                        analyticalChildren = matchingAccounts
                            .map(acc => analyticalAccountMap.get(acc.id))
                            .filter((acc): acc is FinancialAccount => acc !== undefined);
                    }
                    
                    node.children = [...reportLineChildren, ...analyticalChildren];

                    // Se não for analítico, soma os filhos
                    if (line.type !== 'data_bucket' && node.children.length > 0) {
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
