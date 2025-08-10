

import React, { useMemo } from 'react';
import { Sale, StaffMember, Shift, Customer } from '../types';
import Icon from './Icon';
import RecentTransactions from './RecentTransactions';
import WeeklyRota from './WeeklyRota';
import { SyncManager } from '../utils/syncManager';
import { calculateAvailablePoints } from '../utils/loyalty';
import { triggerHapticFeedback } from '../utils/haptics';

interface NavMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenDashboard: () => void;
    onOpenTablePlan: () => void;
    onViewSale: (sale: Sale) => void;
    sales: Sale[];
    staff: StaffMember[];
    shifts: Shift[];
    syncManager: SyncManager;
    customerId?: string;
    customers: Customer[];
}

const NavMenu = ({ isOpen, onClose, onOpenDashboard, onOpenTablePlan, onViewSale, sales, staff, shifts, syncManager, customerId, customers }: NavMenuProps) => {

  const todaysSales = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return sales.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= today && saleDate < tomorrow;
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales]);
  
  const linkedCustomer = useMemo(() => {
    if (!customerId || !customers) return null;
    return customers.find(c => c.id === customerId);
  }, [customerId, customers]);
  
  const availablePoints = useMemo(() => calculateAvailablePoints(linkedCustomer || undefined), [linkedCustomer]);

  return (
  <>
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 z-20 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={onClose}
    ></div>
    <div
      className={`fixed top-0 left-0 w-96 h-full bg-bg-panel shadow-2xl z-30 p-4 text-text-primary flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <h2 className="text-xl font-bold text-accent">Menu</h2>
            <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
                <Icon name="close" className="w-6 h-6" />
            </button>
        </div>
        
        <div className="mb-4 bg-bg-main/50 rounded-lg p-3 border border-border-color/50 flex-shrink-0">
            <h3 className="font-semibold text-text-secondary text-sm mb-2">Linked Customer</h3>
            {linkedCustomer ? (
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent rounded-full">
                        <Icon name="star" className="w-5 h-5 text-text-on-accent" />
                    </div>
                    <div>
                        <p className="font-bold text-text-primary">{linkedCustomer.name}</p>
                        <p className="text-sm text-accent font-semibold">{availablePoints.toLocaleString()} points available</p>
                        <p className="text-sm text-cyan-400 font-semibold">£{(linkedCustomer.giftCardBalance ?? 0).toFixed(2)} on Gift Card</p>
                    </div>
                </div>
            ) : (
                <p className="text-sm text-text-secondary/70 italic text-center py-2">No customer linked to order.</p>
            )}
        </div>
        
        <div className="overflow-y-auto flex-grow pr-2 space-y-4">
             <button 
              onClick={() => {
                triggerHapticFeedback();
                onOpenTablePlan();
                onClose();
              }} 
              className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors bg-sky-900/60 hover:bg-sky-800/80 text-white shadow-md"
            >
                <Icon name="tableCells" className="w-5 h-5" />
                <span>Table Plan</span>
            </button>
            <RecentTransactions sales={todaysSales} onViewSale={onViewSale} />
            <WeeklyRota shifts={shifts} staff={staff} />
        </div>
        
        <div className="mt-4 pt-4 border-t border-border-color/50 flex-shrink-0">
            <button 
              onClick={() => {
                triggerHapticFeedback();
                onOpenDashboard();
                onClose();
              }} 
              className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors bg-indigo-900/60 hover:bg-indigo-800/80 text-white shadow-md"
            >
                <Icon name="dashboard" className="w-5 h-5" />
                <span>Admin Dashboard</span>
            </button>
        </div>
    </div>
  </>
)};

export default NavMenu;