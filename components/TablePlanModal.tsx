
import React, { useMemo } from 'react';
import { Table, OrderType, OpenTab } from '../types';
import Icon from './Icon';
import { useCart } from '../hooks/useCart';
import { triggerHapticFeedback } from '../utils/haptics';

type TablePlanModalProps = {
  isOpen: boolean;
  onClose: () => void;
  tables: Table[];
  openTabs: Record<string, OpenTab>;
  cartHook: ReturnType<typeof useCart>;
};

const getOccupancyTime = (startTime: string): string => {
    const start = new Date(startTime).getTime();
    if (isNaN(start)) return '-';
    
    const now = Date.now();
    const diffMs = now - start;
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins < 60) {
        return `${diffMins}m`;
    }
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    return `${diffHours}h ${remainingMins}m`;
};

const TableCard = ({ table, isOccupied, tabData, total, onSelect, onCloseTab }: { 
    table: Table, 
    isOccupied: boolean, 
    tabData: OpenTab | undefined,
    total: number, 
    onSelect: () => void,
    onCloseTab?: (e: React.MouseEvent) => void
}) => {
    if (isOccupied && tabData) {
        const isZeroTotal = total === 0;
        const cardColor = isZeroTotal ? 'bg-red-800' : 'bg-green-800';
        const hoverColor = isZeroTotal ? 'hover:bg-red-700' : 'hover:bg-green-700';
        
        return (
            <div 
                onClick={onSelect}
                className={`relative rounded-lg shadow-lg p-3 flex flex-col h-48 text-white ${cardColor} ${hoverColor} hover:-translate-y-1 cursor-pointer group transition-all`}
            >
                {isZeroTotal && onCloseTab && (
                    <button 
                        onClick={onCloseTab} 
                        className="absolute top-2 right-2 p-1.5 bg-black/30 rounded-full hover:bg-black/50 z-10"
                        title="Close Empty Table"
                    >
                        <Icon name="close" className="w-4 h-4" />
                    </button>
                )}

                <p className="text-2xl font-bold">{table.name}</p>

                <div className="flex flex-col items-center justify-center flex-grow text-center my-2">
                    <p className="text-4xl font-bold">£{total.toFixed(2)}</p>
                </div>
                
                <div className="flex justify-start items-center text-xs mt-auto font-semibold opacity-80">
                    <div className="flex items-center gap-1.5">
                        <Icon name="clock" className="w-3 h-3" />
                        <span>{getOccupancyTime(tabData.createdAt)}</span>
                    </div>
                </div>
            </div>
        );
    } else {
        // Available Table View
        return (
            <div
                onClick={onSelect}
                className="relative rounded-lg shadow-md p-3 flex flex-col h-48 bg-green-800/60 border-2 border-green-600 hover:bg-green-700/80 hover:border-green-500 cursor-pointer group transition-all"
            >
                <div className="flex-grow flex flex-col items-center justify-center text-center">
                    <p className="text-2xl font-bold text-text-primary">{table.name}</p>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                         <p className="text-lg text-green-400 mt-4 font-semibold">Start New Tab</p>
                    </div>
                </div>
            </div>
        );
    }
};

const TablePlanModal = ({ isOpen, onClose, tables, openTabs: syncedOpenTabs, cartHook }: TablePlanModalProps) => {
  const { loadTab, createEmptyTab, deleteTab } = cartHook;

  const handleSelectTable = (table: Table) => {
    triggerHapticFeedback();
    const isOccupied = !!syncedOpenTabs[table.id];
    
    if (isOccupied) {
        loadTab(table.id);
    } else {
        createEmptyTab(table);
    }
    onClose();
  };
  
  const handleCloseTab = (tableId: string, tableName: string, e: React.MouseEvent) => {
    triggerHapticFeedback();
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to close the empty tab for table "${tableName}"?`)) {
        if(deleteTab) {
            deleteTab(tableId);
        }
    }
  };

  const calculateTabTotal = (tab: OpenTab): number => {
      if (!tab || !tab.cart) return 0;
      const { cart, orderType, discount } = tab;

      const grossTotal = cart.reduce((acc, item) => {
        let itemPrice = (orderType === OrderType.EatIn ? item.priceEatIn : item.priceTakeAway) || 0;
        if (item.linkedItems) {
            itemPrice += item.linkedItems.reduce((extraAcc, extra) => extraAcc + ((orderType === OrderType.EatIn ? extra.priceEatIn : extra.priceTakeAway) || 0), 0);
        }
        return acc + (itemPrice * item.quantity);
      }, 0);

      const discountVal = parseFloat(discount);
      const discountPercent = !isNaN(discountVal) ? Math.max(0, Math.min(100, discountVal)) : 0;
      const discountAmount = (grossTotal * discountPercent) / 100;

      return grossTotal - discountAmount;
  };
  
  const groupedTables = useMemo(() => {
    return tables.reduce((acc, table) => {
        const groupName = table.group?.trim() || 'Uncategorized';
        if (!acc[groupName]) acc[groupName] = [];
        acc[groupName].push(table);
        return acc;
    }, {} as Record<string, Table[]>);
  }, [tables]);

  const sortedGroups = useMemo(() => Object.keys(groupedTables).sort((a,b) => {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return a.localeCompare(b);
  }), [groupedTables]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-bg-panel rounded-lg shadow-2xl p-6 w-full max-w-7xl text-text-primary flex flex-col h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="text-3xl font-bold text-accent">Table Plan</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <Icon name="close" className="w-8 h-8" />
          </button>
        </div>
        
        <div className="flex-grow overflow-y-auto pr-4 -mr-4">
            {tables.length > 0 ? (
                sortedGroups.map(groupName => (
                    <div key={groupName} className="mb-8">
                        {groupName !== 'Uncategorized' && <h3 className="text-xl font-semibold text-text-secondary border-b-2 border-border-color mb-4 pb-2">{groupName}</h3>}
                         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                            {groupedTables[groupName].sort((a,b) => a.name.localeCompare(b.name, undefined, {numeric: true})).map(table => {
                                const tabData = syncedOpenTabs[table.id];
                                const isOccupied = !!tabData;
                                const total = isOccupied ? calculateTabTotal(tabData) : 0;
                                return (
                                    <TableCard
                                        key={table.id}
                                        table={table}
                                        isOccupied={isOccupied}
                                        tabData={tabData}
                                        total={total}
                                        onSelect={() => handleSelectTable(table)}
                                        onCloseTab={(e) => handleCloseTab(table.id, table.name, e)}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-20">
                    <p className="text-lg text-text-secondary">No tables have been set up.</p>
                    <p className="text-sm text-text-secondary/70">Go to Admin Dashboard > Manage Tables to add some.</p>
                </div>
            )}
        </div>
        
        <div className="flex justify-end pt-6 mt-auto border-t border-border-color/20 flex-shrink-0">
          <button onClick={onClose} className="bg-text-secondary text-bg-main font-bold py-2 px-6 rounded-md hover:bg-opacity-90 text-lg">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TablePlanModal;
