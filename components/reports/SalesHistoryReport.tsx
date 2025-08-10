

import React, { useState, useMemo, useEffect } from 'react';
import { Sale } from '../../types';
import Icon from '../Icon';
import { SyncManager } from '../../utils/syncManager';

const toInputFormat = (date: Date) => date.toISOString().split('T')[0];

const SalesHistoryReport = ({ sales, syncManager, onRequestPrint, onRequestEmail, onRequestShare }: { sales: Sale[], syncManager: SyncManager, onRequestPrint: (sale: Sale) => void, onRequestEmail: (sale: Sale) => void, onRequestShare: (sale: Sale) => void }) => {
  const [startDate, setStartDate] = useState(toInputFormat(new Date()));
  const [endDate, setEndDate] = useState(toInputFormat(new Date()));
  
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    // Check for Web Share API support once.
    if (navigator.canShare && navigator.canShare({ text: "Receipt" })) {
      setCanShare(true);
    }
  }, []);

  const filteredSales = useMemo(() => {
    const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
    const sDate = new Date(sYear, sMonth - 1, sDay);
    sDate.setHours(0,0,0,0);

    const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
    const eDate = new Date(eYear, eMonth - 1, eDay);
    eDate.setHours(23,59,59,999);
    
    if (!startDate || !endDate || sDate > eDate) {
        return [];
    }

    return sales.filter(s => {
      const saleDate = new Date(s.date);
      return saleDate >= sDate && saleDate <= eDate;
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  }, [sales, startDate, endDate]);

  const onDeleteSale = async (sale: Sale) => {
    if (window.confirm(`Are you sure you want to delete sale ${sale.id.slice(0,8)}? This action cannot be undone.`)) {
        try {
            syncManager.deleteItem('sales', sale.id);
        } catch (err: any) {
            alert(`Failed to delete sale: ${err.message}`);
        }
    }
  }

  const renderTable = () => {
    if (filteredSales.length === 0) {
        return <div className="text-center p-8 text-gray-500 bg-white rounded-lg shadow">No sales found for the selected criteria.</div>;
    }

    return (
       <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSales.map(sale => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(sale.date).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}>{sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sale.staffName || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sale.orderType}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sale.paymentMethod}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-800">£{sale.total.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {canShare && <button onClick={() => onRequestShare(sale)} className="p-2 text-gray-500 rounded-md hover:bg-gray-200 hover:text-gray-800" title="Share Receipt"><Icon name="share" className="w-5 h-5"/></button>}
                        <button onClick={() => onRequestEmail(sale)} className="p-2 text-gray-500 rounded-md hover:bg-gray-200 hover:text-gray-800" title="Email Receipt"><Icon name="email" className="w-5 h-5"/></button>
                        <button onClick={() => onRequestPrint(sale)} className="p-2 text-gray-500 rounded-md hover:bg-gray-200 hover:text-gray-800" title="Print Receipt"><Icon name="print" className="w-5 h-5"/></button>
                        <button onClick={() => onDeleteSale(sale)} className="p-2 text-red-500 rounded-md hover:bg-red-100 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed" title="Delete Transaction"><Icon name="trash" className="w-5 h-5"/></button>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
    );
  };

  return (
    <div className="p-6 bg-gray-100 min-h-full text-gray-800">
        <h2 className="text-3xl font-bold text-brand-primary mb-6">Sales History</h2>
        
        <div className="bg-white p-4 rounded-lg shadow mb-6 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between">
            <div className="flex items-center gap-4">
                 <label htmlFor="start-date" className="font-medium">From:</label>
                 <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border rounded-md"/>
                 <label htmlFor="end-date" className="font-medium">To:</label>
                 <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border rounded-md"/>
            </div>
        </div>

        {renderTable()}
    </div>
  );
};
export default SalesHistoryReport;