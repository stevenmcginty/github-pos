
import React, { useState, useMemo } from 'react';
import { Customer, PointTransaction } from '../../types';
import { SyncManager } from '../../utils/syncManager';
import Icon from '../Icon';
import CustomerQRCodeModal from '../CustomerQRCodeModal';
import CustomerHistoryModal from '../CustomerHistoryModal';
import AdjustPointsModal from '../AdjustPointsModal';

interface ManageCustomersReportProps {
    customers: Customer[];
    syncManager: SyncManager;
    onLinkCustomerToSale: (customerId: string) => void;
    onRequestNew: () => void;
    onRequestEdit: (customer: Customer) => void;
}

const ManageCustomersReport = ({ customers, syncManager, onLinkCustomerToSale, onRequestNew, onRequestEdit }: ManageCustomersReportProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [customerForQR, setCustomerForQR] = useState<Customer | null>(null);
    const [customerForHistory, setCustomerForHistory] = useState<Customer | null>(null);
    const [customerToAdjustPoints, setCustomerToAdjustPoints] = useState<Customer | null>(null);

    const filteredCustomers = useMemo(() => {
        const lowercasedTerm = searchTerm.toLowerCase();
        return customers
            .filter(c =>
                c.name.toLowerCase().includes(lowercasedTerm) ||
                (c.email || '').toLowerCase().includes(lowercasedTerm) ||
                (c.phone || '').includes(searchTerm)
            )
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [customers, searchTerm]);

    const handleDeleteCustomer = (customerId: string) => {
        if (window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
            syncManager.deleteItem('customers', customerId);
        }
    };

    const handleSavePointsAdjustment = (customer: Customer, adjustment: number, reason: string) => {
        if (!syncManager) return;
        
        const transaction: PointTransaction = {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            change: adjustment,
            reason: reason,
        };

        const updatedCustomer: Customer = {
            ...customer,
            totalLoyaltyPoints: (customer.totalLoyaltyPoints || 0) + adjustment,
            pointsHistory: [...(customer.pointsHistory || []), transaction],
        };

        syncManager.saveItem('customers', updatedCustomer);
    };
    
    return (
        <>
            <div className="p-6 bg-bg-main min-h-full text-text-primary">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold">Manage Customers</h2>
                    <button onClick={onRequestNew} className="flex items-center gap-2 bg-accent text-text-on-accent font-semibold py-2 px-4 rounded-lg shadow hover:bg-accent-hover">
                        <Icon name="plus" className="w-5 h-5" />
                        Add New Customer
                    </button>
                </div>

                <div className="bg-bg-panel p-4 rounded-lg shadow mb-6">
                    <input
                        type="text"
                        placeholder="Search by name, email, or phone..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full md:w-1/3 p-2 border border-border-color rounded-lg bg-bg-main focus:ring-accent focus:border-accent"
                    />
                </div>

                <div className="bg-bg-panel rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border-color">
                            <thead className="bg-bg-main">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Contact</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase">Loyalty Points</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase">Gift Card Balance</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-bg-panel divide-y divide-border-color">
                                {filteredCustomers.map(customer => (
                                    <tr key={customer.id} className="hover:bg-bg-main">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-text-primary">{customer.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                            {customer.email && <div><Icon name="email" className="w-4 h-4 inline mr-2 opacity-60"/>{customer.email}</div>}
                                            {customer.phone && <div className="mt-1"><Icon name="cash" className="w-4 h-4 inline mr-2 opacity-60"/>{customer.phone}</div>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-accent">
                                            {customer.totalLoyaltyPoints.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-cyan-400">£{(customer.giftCardBalance ?? 0).toFixed(2)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right space-x-1">
                                            <button onClick={() => onLinkCustomerToSale(customer.id)} className="p-2 text-blue-500 rounded-md hover:bg-blue-500/10 hover:text-blue-400" title="Link to current sale">
                                                <Icon name="shoppingCart" className="w-5 h-5"/>
                                            </button>
                                            <button onClick={() => setCustomerForHistory(customer)} className="p-2 text-text-secondary rounded-md hover:text-accent" title="View Point History"><Icon name="history" className="w-5 h-5" /></button>
                                            <button onClick={() => setCustomerForQR(customer)} className="p-2 text-text-secondary rounded-md hover:text-accent" title="View QR Code"><Icon name="link" className="w-5 h-5" /></button>
                                            <button onClick={() => setCustomerToAdjustPoints(customer)} className="p-2 text-text-secondary rounded-md hover:text-accent" title="Adjust Points"><Icon name="plus" className="w-5 h-5" /></button>
                                            <button onClick={() => onRequestEdit(customer)} className="p-2 text-text-secondary rounded-md hover:text-text-primary" title="Edit Customer"><Icon name="edit" className="w-5 h-5"/></button>
                                            <button onClick={() => handleDeleteCustomer(customer.id)} className="p-2 text-red-500 rounded-md hover:text-red-400" title="Delete Customer"><Icon name="trash" className="w-5 h-5"/></button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredCustomers.length === 0 && (
                                  <tr>
                                    <td colSpan={5} className="text-center py-10 text-text-secondary">
                                      No customers found.
                                    </td>
                                  </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {customerForQR && (
                <CustomerQRCodeModal
                    isOpen={!!customerForQR}
                    onClose={() => setCustomerForQR(null)}
                    customer={customerForQR}
                />
            )}
             {customerForHistory && (
                <CustomerHistoryModal
                    isOpen={!!customerForHistory}
                    onClose={() => setCustomerForHistory(null)}
                    customer={customerForHistory}
                />
            )}
            {customerToAdjustPoints && (
                <AdjustPointsModal
                    isOpen={!!customerToAdjustPoints}
                    onClose={() => setCustomerToAdjustPoints(null)}
                    customer={customerToAdjustPoints}
                    onSave={handleSavePointsAdjustment}
                />
            )}
        </>
    );
};

export default ManageCustomersReport;