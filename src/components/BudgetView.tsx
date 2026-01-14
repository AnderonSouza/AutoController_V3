import React from 'react';
import { FinancialAccount } from '../types';
import BudgetTable from './BudgetTable';

interface BudgetViewProps {
  onNavigateBack: () => void;
  // Props for the Planning Table
  accounts: FinancialAccount[];
  onDataChange: (accountId: string, year: number, month: string, field: 'orcado' | 'cg' | 'orcadoManual', value: number) => void;
  selectedPeriod: { years: number[]; months: string[] };
  activeTabContext: string;
}

const BudgetView: React.FC<BudgetViewProps> = ({ 
    onNavigateBack,
    accounts,
    onDataChange,
    selectedPeriod,
    activeTabContext
}) => {

  // Wrapper for data change to limit to 'orcadoManual' which is relevant for this view's table
  const handleManualBudgetChange = (accountId: string, year: number, month: string, field: 'orcadoManual', value: number) => {
      onDataChange(accountId, year, month, field, value);
  };

  return (
      <div className="flex-grow flex flex-col h-full overflow-hidden p-3 md:p-4">
          <div className="flex-grow flex flex-col bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
               <div className="flex-grow overflow-auto h-full">
                   <BudgetTable 
                        data={accounts}
                        onDataChange={handleManualBudgetChange}
                        activeTab={activeTabContext}
                        selectedPeriod={selectedPeriod}
                   />
               </div>
          </div>
      </div>
  );
};

export default BudgetView;
