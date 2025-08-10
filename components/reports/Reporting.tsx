import React, { useState } from 'react';
import { Sale, Product, StaffMember, DailyNote, SpecialDay } from '../../types';
import Icon from '../Icon';
import TransactionsReport from './TransactionsReport';
import TopProductsReport from './TopProductsReport';
import { SyncManager } from '../../utils/syncManager';

type ReportView = 'transactions' | 'top-products';

interface ReportingProps {
  sales: Sale[];
  products: Product[];
  staff: StaffMember[];
  specialDays: Record<string, string>;
  onRequestPrint: (sale: Sale) => void;
  onRequestEmail: (sale: Sale) => void;
  onRequestShare: (sale: Sale) => void;
  notes: DailyNote[];
  syncManager: SyncManager;
}

const reportViews: { id: ReportView; name: string; icon: 'chart' | 'star' }[] = [
  { id: 'transactions', name: 'Transactions', icon: 'chart' },
  { id: 'top-products', name: 'Top Products', icon: 'star' },
];

const Reporting = (props: ReportingProps) => {
  const [activeView, setActiveView] = useState<ReportView>('transactions');

  const renderContent = () => {
    switch (activeView) {
      case 'transactions':
        return <TransactionsReport sales={props.sales} staff={props.staff} specialDays={props.specialDays} notes={props.notes} />;
      case 'top-products':
        return <TopProductsReport sales={props.sales} products={props.products} />;
      default:
        return <TransactionsReport sales={props.sales} staff={props.staff} specialDays={props.specialDays} notes={props.notes} />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-main text-text-primary">
      <header className="p-4 bg-bg-panel border-b border-border-color shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          {reportViews.map(view => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                activeView === view.id
                  ? 'bg-accent text-text-on-accent shadow-md scale-105'
                  : 'bg-bg-main text-text-primary hover:bg-opacity-80'
              }`}
            >
              <Icon name={view.icon} className="w-5 h-5" />
              <span>{view.name}</span>
            </button>
          ))}
        </div>
      </header>
      <div className="flex-grow overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default Reporting;