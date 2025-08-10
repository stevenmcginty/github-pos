
import React, { useMemo, useState } from 'react';
import { Sale, PaymentMethod } from '../../types';
import Icon from '../Icon';
import { processSalesForDateRange } from '../../utils/analytics';

function StatBox({ title, value, icon, colorClass }: { title: string; value: string; icon: 'pound' | 'chart' | 'card'; colorClass: string; }) {
    return (
        <div className="bg-bg-panel p-4 rounded-lg shadow-md flex items-center">
            <div className={`p-3 rounded-lg mr-4 ${colorClass}`}>
                <Icon name={icon} className="w-6 h-6 text-white" />
            </div>
            <div>
                <p className="text-sm text-text-secondary font-medium">{title}</p>
                <p className="text-2xl font-bold text-text-primary">{value}</p>
            </div>
        </div>
    );
}

interface DashboardHomeProps {
    sales: Sale[];
    onViewSale: (sale: Sale) => void;
    noteText: string;
    onNoteTextChange: (newText: string) => void;
    onSaveNote: () => void;
}

export default function DashboardHome({ sales, onViewSale, noteText, onNoteTextChange, onSaveNote }: DashboardHomeProps) {
    const [noteStatus, setNoteStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    
    const stats = useMemo(() => {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        
        const todaysSales = sales.filter(s => {
            const saleDate = new Date(s.date);
            return saleDate >= todayStart && saleDate <= todayEnd;
        });

        return processSalesForDateRange(todaysSales, todayStart, todayEnd);
    }, [sales]);

    const { kpis, rangeSales } = stats;

    const latestTransactions = useMemo(() => {
        return (rangeSales || [])
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 10);
    }, [rangeSales]);

    const handleSaveClick = () => {
        setNoteStatus('saving');
        try {
            onSaveNote();
            setNoteStatus('saved');
            setTimeout(() => setNoteStatus('idle'), 2000);
        } catch (error) {
            console.error("Error saving note:", error);
            setNoteStatus('error');
        }
    };

    return (
        <div className="p-6 bg-bg-main min-h-full text-text-primary">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-text-primary">Dashboard</h2>
                    <p className="text-text-secondary">
                        Summary for {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}.
                    </p>
                </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6 mb-6">
                <StatBox title="Total Revenue" value={`£${kpis.totalRevenue.toFixed(2)}`} icon="pound" colorClass="bg-green-500" />
                <StatBox title="Net Sales" value={`£${kpis.netSales.toFixed(2)}`} icon="pound" colorClass="bg-green-600" />
                <StatBox title="Total VAT" value={`£${kpis.totalVat.toFixed(2)}`} icon="pound" colorClass="bg-orange-500" />
                <StatBox title="Transactions" value={kpis.transactionCount.toString()} icon="chart" colorClass="bg-blue-500" />
                <StatBox title="Avg. Sale" value={`£${kpis.averageTransaction.toFixed(2)}`} icon="chart" colorClass="bg-sky-500" />
                <StatBox title="Card Payments" value={`${kpis.cardTransactionPercentage.toFixed(0)}%`} icon="card" colorClass="bg-indigo-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-bg-panel p-6 rounded-lg shadow h-full">
                    <h3 className="text-xl font-bold mb-4">Latest Transactions</h3>
                    {latestTransactions.length > 0 ? (
                        <ul className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            {latestTransactions.map(sale => (
                                <li key={sale.id}>
                                    <button onClick={() => onViewSale(sale)} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-bg-main transition-colors text-left">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-full ${sale.paymentMethod === PaymentMethod.Card ? 'bg-blue-500/20' : 'bg-green-500/20'}`}>
                                                <Icon name={sale.paymentMethod === PaymentMethod.Card ? 'card' : 'cash'} className={`w-5 h-5 ${sale.paymentMethod === PaymentMethod.Card ? 'text-blue-500' : 'text-green-500'}`} />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-text-primary">Sale #{sale.id.substring(0, 6)}</p>
                                                <p className="text-sm text-text-secondary">{new Date(sale.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <p className="text-lg font-bold text-text-primary">£{sale.total.toFixed(2)}</p>
                                            <Icon name="chevronRight" className="w-5 h-5 text-text-secondary" />
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="py-10 flex items-center justify-center text-text-secondary">No transactions today.</div>
                    )}
                </div>

                <div className="bg-bg-panel p-6 rounded-lg shadow flex flex-col">
                    <h3 className="text-xl font-bold mb-4">Daily Note</h3>
                    <p className="text-sm text-text-secondary mb-3">Add notes about the day (e.g., weather, special events, stock issues). This will be saved for future reports.</p>
                    <textarea 
                        value={noteText}
                        onChange={(e) => { onNoteTextChange(e.target.value); setNoteStatus('idle'); }}
                        placeholder="e.g., Very sunny today, patio was full all afternoon. Ran out of oat milk by 3pm."
                        className="w-full flex-grow p-3 bg-bg-main border border-border-color rounded-md focus:ring-2 focus:ring-accent focus:border-accent transition min-h-[200px]"
                    />
                    <div className="flex justify-end items-center mt-3">
                        {noteStatus === 'saved' && <span className="text-sm text-green-600 mr-4 transition-opacity duration-500">Saved locally. Will sync automatically.</span>}
                        {noteStatus === 'error' && <span className="text-sm text-red-600 mr-4">Could not save.</span>}
                        <button 
                            onClick={handleSaveClick}
                            disabled={noteStatus === 'saving' || noteStatus === 'saved'}
                            className="bg-accent text-text-on-accent font-bold py-2 px-4 rounded-md hover:bg-accent-hover disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {noteStatus === 'saving' ? 'Saving...' : 'Save Note'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}