

import React, { useMemo } from 'react';
import { Sale, PaymentMethod } from '../types';
import Icon from './Icon';
import { triggerHapticFeedback } from '../utils/haptics';

interface RecentTransactionsProps {
  sales: Sale[];
  onViewSale: (sale: Sale) => void;
}

const RecentTransactions = ({ sales, onViewSale }: RecentTransactionsProps) => {
  const latestSales = useMemo(() => {
    return sales.slice(0, 10);
  }, [sales]);

  if (latestSales.length === 0) {
    return (
        <div className="bg-purple-900/50 rounded-lg">
            <div className="w-full p-3 text-left">
                <h3 className="font-semibold text-text-primary">Recent Transactions</h3>
            </div>
            <div className="p-3 border-t border-border-color/50">
                <p className="text-sm text-center text-text-secondary/70 py-4">No transactions today.</p>
            </div>
        </div>
    );
  }

  return (
    <div className="bg-purple-900/50 rounded-lg">
      <div className="w-full p-3 text-left">
        <h3 className="font-semibold text-text-primary">Recent Transactions</h3>
      </div>
      <div className="p-3 border-t border-border-color/50">
          <ul className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {latestSales.map(sale => (
              <li key={sale.id} className="flex justify-between items-center bg-bg-main/70 p-2 rounded-md">
                <div className="flex items-center gap-3">
                    <Icon 
                        name={sale.paymentMethod === PaymentMethod.Card ? 'card' : 'cash'} 
                        className="w-5 h-5 text-accent flex-shrink-0" 
                    />
                    <div>
                        <p className="text-sm font-semibold">£{sale.total.toFixed(2)}</p>
                        <p className="text-xs text-text-secondary">{new Date(sale.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>
                <button
                  onClick={() => {
                    triggerHapticFeedback();
                    onViewSale(sale);
                  }}
                  className="bg-text-secondary text-bg-main text-xs font-bold py-1 px-3 rounded-md hover:bg-opacity-90 transition-colors"
                >
                  View
                </button>
              </li>
            ))}
          </ul>
        </div>
    </div>
  );
};

export default RecentTransactions;