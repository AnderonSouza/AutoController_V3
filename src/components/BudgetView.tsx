"use client"

import React from 'react';
import type { FinancialAccount, Brand, ReportTemplate } from '../types';
import BudgetTable from './BudgetTable';
import Toolbar from './Toolbar';
import Tabs from './Tabs';

interface StoreOption {
  label: string;
  value: string;
}

interface BudgetViewProps {
  onNavigateBack: () => void;
  accounts: FinancialAccount[];
  onDataChange: (accountId: string, year: number, month: string, field: 'orcado' | 'cg' | 'orcadoManual', value: number) => void;
  selectedPeriod: { years: number[]; months: string[] };
  onPeriodChange: (period: { years: number[]; months: string[] }) => void;
  activeTabContext: string;
  brands: Brand[];
  currentBrand: string;
  onBrandChange: (brand: string) => void;
  storeOptions: StoreOption[];
  currentStore: string;
  onStoreChange: (store: string) => void;
  reportTemplates?: ReportTemplate[];
  currentReportTemplateId?: string | null;
  onReportTemplateChange?: (templateId: string) => void;
  isLoading?: boolean;
  showDetails?: boolean;
  onShowDetailsChange?: (show: boolean) => void;
  showVerticalAnalysis?: boolean;
  onShowVerticalAnalysisChange?: (show: boolean) => void;
  showHorizontalAnalysis?: boolean;
  onShowHorizontalAnalysisChange?: (show: boolean) => void;
  showBenchmark?: boolean;
  onShowBenchmarkChange?: (show: boolean) => void;
  departments?: string[];
  activeDepartment?: string;
  onDepartmentChange?: (department: string) => void;
}

const BudgetView: React.FC<BudgetViewProps> = ({ 
  onNavigateBack,
  accounts,
  onDataChange,
  selectedPeriod,
  onPeriodChange,
  activeTabContext,
  brands,
  currentBrand,
  onBrandChange,
  storeOptions,
  currentStore,
  onStoreChange,
  reportTemplates,
  currentReportTemplateId,
  onReportTemplateChange,
  isLoading = false,
  showDetails = false,
  onShowDetailsChange,
  showVerticalAnalysis = false,
  onShowVerticalAnalysisChange,
  showHorizontalAnalysis = false,
  onShowHorizontalAnalysisChange,
  showBenchmark = false,
  onShowBenchmarkChange,
  departments = [],
  activeDepartment,
  onDepartmentChange,
}) => {

  const handleManualBudgetChange = (accountId: string, year: number, month: string, field: 'orcadoManual', value: number) => {
    onDataChange(accountId, year, month, field, value);
  };

  const showDepartmentTabs = departments.length > 0 && onDepartmentChange;

  return (
    <main className="flex-grow flex flex-col h-full overflow-hidden bg-white">
      <div className="w-full flex flex-col h-full">
        <Toolbar
          storeOptions={storeOptions}
          currentStore={currentStore}
          onStoreChange={onStoreChange}
          brands={brands}
          currentBrand={currentBrand}
          onBrandChange={onBrandChange}
          selectedPeriod={selectedPeriod}
          onPeriodChange={onPeriodChange}
          isLoading={isLoading}
          reportTemplates={reportTemplates}
          currentReportTemplateId={currentReportTemplateId}
          onReportTemplateChange={onReportTemplateChange}
          showReportSelector={true}
          hideBudgetToggle={true}
          showCalculationDetails={showDetails}
          onShowCalculationDetailsChange={onShowDetailsChange}
          showVerticalAnalysis={showVerticalAnalysis}
          onShowVerticalAnalysisChange={onShowVerticalAnalysisChange}
          showHorizontalAnalysis={showHorizontalAnalysis}
          onShowHorizontalAnalysisChange={onShowHorizontalAnalysisChange}
          showBenchmark={showBenchmark}
          onShowBenchmarkChange={onShowBenchmarkChange}
        />
        <div className="flex-grow overflow-auto h-full">
          <BudgetTable 
            data={accounts}
            onDataChange={handleManualBudgetChange}
            activeTab={activeDepartment || activeTabContext}
            selectedPeriod={selectedPeriod}
          />
        </div>
        {showDepartmentTabs && (
          <Tabs 
            tabs={departments} 
            activeTab={activeDepartment || departments[0] || ''} 
            setActiveTab={onDepartmentChange!} 
          />
        )}
      </div>
    </main>
  );
};

export default BudgetView;
