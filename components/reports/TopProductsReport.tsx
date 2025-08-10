import React, { useState, useMemo, useEffect } from 'react';
import { Product, Sale } from '../../types';
import DateRangePicker from '../DateRangePicker';
import { processSalesData } from '../../utils/analytics';
import Icon from '../Icon';


const toInputFormat = (date: Date) => date.toISOString().split('T')[0];
const todayStart = new Date();
todayStart.setHours(0,0,0,0);
const todayEnd = new Date();
todayEnd.setHours(23,59,59,999);


const TopProductsReport = ({ sales, products }: { sales: Sale[], products: Product[] }) => {
  const [allCategoryPaths, setAllCategoryPaths] = useState<string[]>([]);

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewBy, setViewBy] = useState<'count' | 'revenue'>('count');
  
  const [startDate, setStartDate] = useState<Date>(todayStart);
  const [endDate, setEndDate] = useState<Date>(todayEnd);
  const [isPickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (products.length > 0) {
      const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
      setAllCategoryPaths(uniqueCategories);
    }
  }, [products]);

  const salesInRange = useMemo(() => {
    if (!startDate || !endDate) return [];
    const start = new Date(startDate); start.setHours(0, 0, 0, 0);
    const end = new Date(endDate); end.setHours(23, 59, 59, 999);
    return sales.filter(s => {
      const saleDate = new Date(s.date);
      return saleDate >= start && saleDate <= end;
    });
  }, [sales, startDate, endDate]);

  const { topProducts } = useMemo(() => {
    if (categoryFilter === 'all') {
      return processSalesData(salesInRange, products);
    } else {
        const salesWithFilteredItems = salesInRange
            .map(sale => {
                const itemsInCategory = sale.items.filter(item => {
                    const productDetails = products.find(p => p.id === item.id || p.name === item.name);
                    return productDetails?.category.startsWith(categoryFilter);
                });
                return { ...sale, items: itemsInCategory };
            })
            .filter(sale => sale.items.length > 0);
        
        return processSalesData(salesWithFilteredItems, products);
    }
  }, [salesInRange, products, categoryFilter]);
  
  const sortedProducts = useMemo(() => {
    const data = viewBy === 'count' ? 
      [...topProducts].sort((a,b) => b.quantity - a.quantity) :
      [...topProducts].sort((a,b) => b.revenue - a.revenue);
    return data.filter(p => viewBy === 'count' ? p.quantity > 0 : p.revenue > 0);
  }, [topProducts, viewBy]);

  const chartProducts = useMemo(() => sortedProducts.slice(0, 10), [sortedProducts]);
  const listProducts = useMemo(() => sortedProducts.slice(0, 100), [sortedProducts]);

  const maxVal = useMemo(() => {
    if(chartProducts.length === 0) return 0;
    return viewBy === 'count' ? 
        Math.max(...chartProducts.map(p => p.quantity)) :
        Math.max(...chartProducts.map(p => p.revenue));
  }, [chartProducts, viewBy]);


  const barColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'
  ];
  
  const renderContent = () => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
                 <h3 className="text-xl font-bold mb-4">Top 10 Products by {viewBy}</h3>
                 {chartProducts.length > 0 ? (
                    <div className="h-[450px] w-full pt-4">
                        <div className="flex flex-col h-full gap-2">
                            {chartProducts.map((p, index) => {
                                const value = viewBy === 'count' ? p.quantity : p.revenue;
                                const width = maxVal > 0 ? (value / maxVal) * 100 : 0;
                                return (
                                    <div key={p.name} className="flex items-center gap-2 group">
                                        <p className="w-2/5 text-sm truncate" title={p.name}>{p.name}</p>
                                        <div className="w-3/5 h-8 bg-gray-200 rounded-r-md">
                                            <div 
                                                className="h-full rounded-r-md transition-all duration-500 flex items-center pr-2 justify-end"
                                                style={{ width: `${width}%`, backgroundColor: barColors[index % barColors.length] }}
                                            >
                                                <span className="text-white text-xs font-bold">{viewBy === 'count' ? value : `£${value.toFixed(2)}`}</span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                 ) : (
                     <div className="h-80 flex items-center justify-center text-gray-500">No product data for this filter.</div>
                 )}
            </div>
            <div className="bg-white p-6 rounded-lg shadow flex flex-col">
                 <h3 className="text-xl font-bold mb-4">Detailed List (Top 100)</h3>
                 <div className="flex-grow overflow-auto" style={{ maxHeight: '450px' }}>
                    {listProducts.length > 0 ? (
                        <ul className="space-y-3 pr-2">
                            {listProducts.map((p, index) => (
                               <li key={p.name} className="flex items-center justify-between p-2 rounded-md even:bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-gray-400 w-6 text-center">{index + 1}.</span>
                                        <span className="font-semibold">{p.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold">{p.quantity} <span className="text-sm font-normal text-gray-500">sold</span></p>
                                        <p className="text-green-600 font-semibold text-sm">£{p.revenue.toFixed(2)}</p>
                                    </div>
                               </li>
                            ))}
                        </ul>
                    ) : (
                         <p className="text-center text-gray-500 py-4">No data to show.</p>
                    )}
                 </div>
            </div>
        </div>
    );
  }

  return (
     <div className="p-6 bg-gray-100 min-h-full text-gray-800">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-brand-primary">Top Products Report</h2>
        </div>

        <div className="bg-white p-4 rounded-lg shadow mb-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="relative">
                  <button onClick={() => setPickerOpen(true)} className="flex items-center gap-2 font-semibold text-gray-700 bg-gray-100 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200">
                    <Icon name="calendar" className="w-5 h-5"/>
                    <span>{`${startDate.toLocaleDateString('en-GB')} - ${endDate.toLocaleDateString('en-GB')}`}</span>
                    <Icon name="chevronRight" className="w-5 h-5 rotate-90"/>
                  </button>
              </div>
              <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                      <label htmlFor="categoryFilter" className="text-sm font-medium">Category:</label>
                      <select 
                          id="categoryFilter" 
                          value={categoryFilter} 
                          onChange={e => setCategoryFilter(e.target.value as any)}
                          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
                      >
                          <option value="all">All Categories</option>
                          {allCategoryPaths.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                  </div>
                  <div className="flex gap-1 bg-gray-200 p-1 rounded-lg">
                      <button onClick={() => setViewBy('count')} className={`px-3 py-1 text-sm font-semibold rounded-md ${viewBy === 'count' ? 'bg-white shadow' : 'text-gray-600'}`}>Count</button>
                      <button onClick={() => setViewBy('revenue')} className={`px-3 py-1 text-sm font-semibold rounded-md ${viewBy === 'revenue' ? 'bg-white shadow' : 'text-gray-600'}`}>Revenue</button>
                  </div>
              </div>
            </div>
        </div>
        {renderContent()}
         <DateRangePicker 
            isOpen={isPickerOpen}
            onClose={() => setPickerOpen(false)}
            initialStartDate={startDate}
            initialEndDate={endDate}
            onApply={(start, end) => {
                setStartDate(start);
                setEndDate(end);
                setPickerOpen(false);
            }}
        />
     </div>
  );
};
export default TopProductsReport;