import React, { useState } from 'react';
import { StaffMember, Shift, SpecialDay, Sale, Product, DailyNote } from '../../types';
import { SyncManager } from '../../utils/syncManager';
import Icon from '../Icon';
import RotaReport from './RotaReport';
import ErrorBoundary from '../ErrorBoundary';
import ImportExportReport from './ImportExportReport';
import Reporting from './Reporting';
import SalesHistoryReport from './SalesHistoryReport';

interface AdminToolsViewProps {
    specialDays: Record<string, string>;
    onSetEventName: (dayKey: string) => void;
    syncManager: SyncManager;
    staff: StaffMember[];
    shifts: Shift[];
    sales: Sale[];
    products: Product[];
    notes: DailyNote[];
    onRequestPrint: (sale: Sale) => void;
    onRequestEmail: (sale: Sale) => void;
    onRequestShare: (sale: Sale) => void;
}

type SubView = 'rota' | 'sales-history' | 'reporting' | 'import-export';

const AdminToolsView = (props: AdminToolsViewProps) => {
    const [activeView, setActiveView] = useState<SubView>('rota');

    const renderContent = () => {
        switch(activeView) {
            case 'rota':
                return (
                    <ErrorBoundary>
                        <RotaReport 
                            specialDays={props.specialDays}
                            onSetEventName={props.onSetEventName}
                            syncManager={props.syncManager}
                            staff={props.staff}
                            shifts={props.shifts}
                        />
                    </ErrorBoundary>
                );
            case 'sales-history':
                return <SalesHistoryReport
                    sales={props.sales}
                    syncManager={props.syncManager}
                    onRequestPrint={props.onRequestPrint}
                    onRequestEmail={props.onRequestEmail}
                    onRequestShare={props.onRequestShare}
                />;
            case 'reporting':
                return <Reporting
                    sales={props.sales}
                    products={props.products}
                    staff={props.staff}
                    specialDays={props.specialDays}
                    notes={props.notes}
                    syncManager={props.syncManager}
                    onRequestPrint={props.onRequestPrint}
                    onRequestEmail={props.onRequestEmail}
                    onRequestShare={props.onRequestShare}
                />;
            case 'import-export':
                return <ImportExportReport />;
            default:
                return null;
        }
    };
    
    return (
        <div className="flex flex-col h-full bg-bg-main text-text-primary">
            <header className="p-4 bg-bg-panel border-b border-border-color shadow-sm flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setActiveView('rota')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                            activeView === 'rota'
                            ? 'bg-accent text-text-on-accent shadow-md scale-105'
                            : 'bg-bg-main text-text-primary hover:bg-opacity-80'
                        }`}
                    >
                        <Icon name="calendar" className="w-5 h-5" />
                        <span>Staff Rota</span>
                    </button>
                    <button
                        onClick={() => setActiveView('sales-history')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                            activeView === 'sales-history'
                            ? 'bg-accent text-text-on-accent shadow-md scale-105'
                            : 'bg-bg-main text-text-primary hover:bg-opacity-80'
                        }`}
                    >
                        <Icon name="history" className="w-5 h-5" />
                        <span>Sales History</span>
                    </button>
                    <button
                        onClick={() => setActiveView('reporting')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                            activeView === 'reporting'
                            ? 'bg-accent text-text-on-accent shadow-md scale-105'
                            : 'bg-bg-main text-text-primary hover:bg-opacity-80'
                        }`}
                    >
                        <Icon name="chart" className="w-5 h-5" />
                        <span>Reporting</span>
                    </button>
                    <button
                        onClick={() => setActiveView('import-export')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                            activeView === 'import-export'
                            ? 'bg-accent text-text-on-accent shadow-md scale-105'
                            : 'bg-bg-main text-text-primary hover:bg-opacity-80'
                        }`}
                    >
                        <Icon name="upload" className="w-5 h-5" />
                        <span>Import / Export</span>
                    </button>
                </div>
            </header>
            <div className="flex-grow overflow-y-auto">
                {renderContent()}
            </div>
        </div>
    );
};

export default AdminToolsView;