import { useMemo } from 'react';
import { FinancialAccount, AccountCostCenterMapping } from '../types';

export const useUnmappedAccounts = (
    accountingAccounts: FinancialAccount[],
    mappings: AccountCostCenterMapping[],
    filterType: 'ALL' | 'RESULT' | 'BALANCE' = 'ALL'
) => {
    const unmappedAccounts = useMemo(() => {
        // 1. Get all IDs that are already mapped
        const mappedIds = new Set(mappings.map(m => m.idconta));

        // 2. Filter Accounting Plan:
        // - Must be 'A' (Analytical) because Synthetic accounts don't receive values
        // - Must NOT be in the mapped set
        // - Must match the filterType (Result vs Balance)
        return accountingAccounts.filter(acc => {
            const isAnalytical = acc.accountType === 'A' || acc.accountType === 'ANALITICA';
            const isUnmapped = !mappedIds.has(acc.id);
            
            if (!isAnalytical || !isUnmapped) return false;

            // Check first digit of ID for classification
            // 1 = Asset, 2 = Liability (Balance Sheet)
            // 3, 4, 5... = Result (DRE)
            const firstDigit = acc.id.charAt(0);
            const isBalanceSheet = firstDigit === '1' || firstDigit === '2';

            if (filterType === 'BALANCE') return isBalanceSheet;
            if (filterType === 'RESULT') return !isBalanceSheet;

            return true;
        });
    }, [accountingAccounts, mappings, filterType]);

    return {
        unmappedAccounts,
        count: unmappedAccounts.length,
        hasUnmapped: unmappedAccounts.length > 0
    };
};
