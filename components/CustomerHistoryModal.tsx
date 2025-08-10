import React, { useMemo } from 'react';
import { Customer, PointTransaction } from '../types';
import Icon from './Icon';

interface CustomerHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: Customer;
}

const CustomerHistoryModal = ({ isOpen, onClose, customer }: CustomerHistoryModalProps) => {

    const historyLastSixMonths = useMemo(() => {
        if (!customer.pointsHistory) return [];
        
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        return customer.pointsHistory
            .filter(tx => new Date(tx.date) >= sixMonthsAgo)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [customer.pointsHistory]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-bg-panel rounded-lg shadow-2xl p-8 w-full max-w-2xl text-text-primary flex flex-col h-[80vh]" onClick={e => e.stopPropagation()}>
                <div className="w-full flex justify-between items-center mb-4 flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-accent">Point History</h2>
                        <p className="text-text-secondary">For {customer.name}</p>
                    </div>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><Icon name="close" className="w-6 h-6" /></button>
                </div>

                <div className="flex-grow bg-bg-main rounded-lg p-4 overflow-y-auto">
                    {historyLastSixMonths.length > 0 ? (
                        <ul className="space-y-3">
                            {historyLastSixMonths.map(tx => (
                                <li key={tx.id} className="flex items-center justify-between p-3 bg-bg-panel rounded-md">
                                    <div>
                                        <p className="font-semibold">{tx.reason}</p>
                                        <p className="text-xs text-text-secondary">{new Date(tx.date).toLocaleString('en-GB')}</p>
                                    </div>
                                    <p className={`text-lg font-bold ${tx.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {tx.change > 0 ? '+' : ''}{tx.change.toLocaleString()}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="h-full flex items-center justify-center">
                            <p className="text-text-secondary italic">No point history in the last 6 months.</p>
                        </div>
                    )}
                </div>

                <div className="mt-6 text-right flex-shrink-0">
                    <p className="text-sm text-text-secondary">Current Balance</p>
                    <p className="text-3xl font-bold text-accent">{customer.totalLoyaltyPoints.toLocaleString()} Points</p>
                </div>
            </div>
        </div>
    );
};

export default CustomerHistoryModal;
