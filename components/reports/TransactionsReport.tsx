import React, { useState, useMemo, useEffect } from 'react';
import { Sale, PaymentMethod, StaffMember, DailyNote } from '../../types';
import Icon from '../Icon';
import DateRangePicker from '../DateRangePicker';
import { processSalesForDateRange, getCumulativeData, toLocalDateString } from '../../utils/analytics';
import { generateSalesCSV } from '../../utils/csv';
import { getWeatherForDay } from '../../utils/weather';

type Preset = 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'thisYear' | 'custom';

const KpiCard = ({ title, value, icon, iconBgColor }: { title: string, value: string, icon: any, iconBgColor: string }) => {
    return (
        <div className="bg-white p-4 rounded-lg shadow flex items-center">
            <div className={`p-3 rounded-lg mr-4 ${iconBgColor}`}>
                <Icon name={icon} className="w-6 h-6 text-white" />
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <p className="text-2xl font-bold text-gray-800">{value}</p>
            </div>
        </div>
    );
};

interface TransactionsReportProps {
    sales: Sale[];
    staff: StaffMember[];
    specialDays: Record<string, string>;
    notes: DailyNote[];
}

const TransactionsReport = ({ sales, staff, specialDays, notes }: TransactionsReportProps) => {
  const [preset, setPreset] = useState<Preset>('today');
  
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [isPickerOpen, setPickerOpen] = useState(false);

  const [paymentFilter, setPaymentFilter] = useState<'all' | PaymentMethod>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [chartMode, setChartMode] = useState<'trend' | 'cumulative'>('trend');

  const [selectedData, setSelectedData] = useState<{ data: any; index: number; dateKey: string } | null>(null);
  const [noteForDay, setNoteForDay] = useState<string | null>(null);
  const [isNoteLoading, setIsNoteLoading] = useState(false);
  const [weatherForDay, setWeatherForDay] = useState<string | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);

  const cashiers = useMemo(() => [...new Set(sales.map(s => s.staffName).filter(Boolean).sort())], [sales]);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to the start of the day

    let start: Date;
    let end: Date;

    switch (preset) {
        case 'today':
            start = new Date(today);
            end = new Date(today);
            break;
        case 'yesterday':
            start = new Date(today);
            start.setDate(start.getDate() - 1);
            end = new Date(start);
            break;
        case 'thisWeek': {
            start = new Date(today);
            const day = start.getDay(); // Sunday - 0, Monday - 1
            const diffToMonday = day === 0 ? 6 : day - 1;
            start.setDate(start.getDate() - diffToMonday);
            end = new Date(start);
            end.setDate(end.getDate() + 6);
            break;
        }
        case 'thisMonth':
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            break;
        case 'thisYear':
            start = new Date(today.getFullYear(), 0, 1);
            end = new Date(today.getFullYear(), 11, 31);
            break;
        case 'custom':
            // Custom range is handled by the picker, do not change dates here.
            return;
        default:
             start = new Date(today);
             end = new Date(today);
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    setStartDate(start);
    setEndDate(end);
  }, [preset]);

  const filteredSales = useMemo(() => {
    if (!startDate || !endDate) return [];
    return sales.filter(s => {
      const saleDate = new Date(s.date);
      const paymentMatch = paymentFilter === 'all' || s.paymentMethod === paymentFilter;
      const staffMatch = staffFilter === 'all' || s.staffName === staffFilter;
      return saleDate >= startDate && saleDate <= endDate && paymentMatch && staffMatch;
    });
  }, [sales, startDate, endDate, paymentFilter, staffFilter]);

  const { kpis, hourlyChartData, dailyChartData, monthlyChartData } = useMemo(() => {
    return processSalesForDateRange(filteredSales, startDate, endDate);
  }, [filteredSales, startDate, endDate]);

  const { chartData, chartGranularity, chartTitle } = useMemo(() => {
      if (!startDate || !endDate) {
          return { chartData: [], chartGranularity: 'daily', chartTitle: 'Daily Sales' };
      }
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 2) {
          const saleHoursWithSales = hourlyChartData.filter(d => d.total > 0).map(d => d.hour);
          const minSaleHour = saleHoursWithSales.length > 0 ? Math.min(...saleHoursWithSales) : 6;
          const maxSaleHour = saleHoursWithSales.length > 0 ? Math.max(...saleHoursWithSales) : 20;

          const startHour = Math.min(6, minSaleHour);
          const endHour = Math.max(20, maxSaleHour);
          
          const filteredHourlyData = hourlyChartData.filter(d => d.hour >= startHour && d.hour <= endHour);

          return { chartData: filteredHourlyData, chartGranularity: 'hourly', chartTitle: 'Hourly Sales' };
      } else if (diffDays <= 90) { // Daily view
          const paddedDaily: { date: string, total: number }[] = [];
          const dataMap = new Map(dailyChartData.map((d) => [d.date, d.total]));
          // Clone dates to avoid mutation issues
          let current = new Date(startDate);
          const end = new Date(endDate);
          
          while (current <= end) {
              const dateKey = toLocalDateString(current);
              paddedDaily.push({ date: dateKey, total: dataMap.get(dateKey) || 0 });
              current.setDate(current.getDate() + 1);
          }
          return { chartData: paddedDaily, chartGranularity: 'daily', chartTitle: 'Daily Sales' };
      } else { // Monthly view
          const paddedMonthly: { month: string, total: number }[] = [];
          const dataMap = new Map(monthlyChartData.map((d) => [d.month, d.total]));
          
          // Clone dates to avoid mutation
          let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
          const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
          
          while(current <= end) {
              const monthKey = `${current.getFullYear()}-${(current.getMonth() + 1).toString().padStart(2, '0')}`;
              paddedMonthly.push({ month: monthKey, total: dataMap.get(monthKey) || 0 });
              current.setMonth(current.getMonth() + 1);
          }
          return { chartData: paddedMonthly, chartGranularity: 'monthly', chartTitle: 'Monthly Sales' };
      }
  }, [hourlyChartData, dailyChartData, monthlyChartData, startDate, endDate]);


  useEffect(() => {
    setSelectedData(null);
    setNoteForDay(null);
    setWeatherForDay(null);
  }, [startDate, endDate, paymentFilter, staffFilter, chartMode]);
  
   useEffect(() => {
    if (selectedData && chartGranularity !== 'monthly') {
        const dateKey = selectedData.dateKey;
        const foundNote = notes.find(n => n.id === dateKey);
        setNoteForDay(foundNote?.note || null);
        
        setIsWeatherLoading(true);
        getWeatherForDay(dateKey)
            .then(summary => setWeatherForDay(summary))
            .catch(err => {
                console.error(`Failed to get weather for ${dateKey}:`, err);
                setWeatherForDay('Could not retrieve weather summary.');
            })
            .finally(() => setIsWeatherLoading(false));
    } else {
        setNoteForDay(null);
        setWeatherForDay(null);
    }
  }, [selectedData, notes, chartGranularity]);

  const finalChartData = useMemo(() => {
      if (chartMode === 'cumulative') {
          return getCumulativeData(chartData);
      }
      return chartData;
  }, [chartData, chartMode]);
  
  const handleBarClick = (data: any, index: number, dateKey: string) => {
    if (selectedData?.index === index) {
        setSelectedData(null);
    } else {
        // Enrich the data object with its label for display purposes before setting state
        let label;
        switch (chartGranularity) {
            case 'hourly': label = `${data.hour.toString().padStart(2, '0')}:00`; break;
            case 'daily': label = new Date(data.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); break;
            case 'monthly': label = new Date(`${data.month}-02`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }); break;
            default: label = '';
        }
        setSelectedData({ data: { ...data, label }, index, dateKey });
    }
  };

  const renderDetailsBox = () => {
    if (!selectedData || chartGranularity === 'monthly') return null;
    
    const dateKey = selectedData.dateKey;
    const eventName = specialDays[dateKey];
    const [year, month, day] = dateKey.split('-').map(Number);
    const dateForDisplay = new Date(year, month - 1, day);

    return (
        <div className="mt-4 bg-sky-50 border border-sky-200 text-sky-800 p-4 rounded-lg shadow-sm transition-all duration-300 ease-in-out">
            <h4 className="font-bold mb-3 text-sky-900">Details for {dateForDisplay.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</h4>
            <div className="space-y-3">
                <div className="flex items-start gap-2 text-sm text-gray-800">
                    <Icon name="edit" className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-500" />
                    <div>
                        <p className='font-bold'>Daily Note</p>
                        {isNoteLoading ? <p className="italic">Loading note...</p> : noteForDay ? <p className="whitespace-pre-wrap">{noteForDay}</p> : <p className="italic text-gray-500">No note was saved for this day.</p>}
                    </div>
                </div>
                 <div className="flex items-start gap-2 text-sm text-gray-800 border-t border-sky-200 pt-3">
                    <Icon name="cloud" className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-500" />
                    <div>
                        <p className='font-bold'>Weather Summary</p>
                        {isWeatherLoading ? <p className="italic">Fetching weather summary...</p> : weatherForDay ? <p className="whitespace-pre-wrap">{weatherForDay}</p> : <p className="italic text-gray-500">No summary available.</p>}
                    </div>
                </div>
                 {eventName && (
                    <div className="flex items-start gap-2 text-sm text-amber-800 border-t border-sky-200 pt-3">
                        <Icon name="star" className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
                        <div>
                            <p className="font-bold">Special Day</p>
                            <p>{eventName}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
  };

  return (
    <div className="p-6 bg-gray-100 min-h-full text-gray-800">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-brand-primary">Transactions Report</h2>
        <button onClick={() => generateSalesCSV(filteredSales)} disabled={filteredSales.length === 0} className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-blue-700 transition-colors disabled:bg-gray-400">
            <Icon name="download" className="w-5 h-5" />
            Export CSV
        </button>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center border border-gray-300 rounded-lg p-1">
                <select value={preset} onChange={(e) => setPreset(e.target.value as Preset)} className="bg-transparent font-semibold text-gray-700 p-2 border-none focus:ring-0">
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="thisWeek">This Week</option>
                    <option value="thisMonth">This Month</option>
                    <option value="thisYear">This Year</option>
                    <option value="custom">Custom...</option>
                </select>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <select value={staffFilter} onChange={e => setStaffFilter(e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5">
                  <option value="all">All Cashiers</option>
                  {cashiers.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value as any)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5">
                  <option value="all">All Methods</option>
                  <option value="Card">Card</option>
                  <option value="Cash">Cash</option>
              </select>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Main KPIs on the left */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-6">
            <KpiCard title="Total Revenue" value={`£${kpis.totalRevenue.toFixed(2)}`} icon="pound" iconBgColor="bg-green-500" />
            <KpiCard title="Transactions" value={kpis.transactionCount.toLocaleString()} icon="chart" iconBgColor="bg-blue-500" />
            <KpiCard title="Avg. Sale" value={`£${kpis.averageTransaction.toFixed(2)}`} icon="tag" iconBgColor="bg-yellow-500" />
            <KpiCard title="Card Payments" value={`${kpis.cardTransactionPercentage.toFixed(0)}%`} icon="card" iconBgColor="bg-indigo-500" />
        </div>

        {/* Highlighted Loyalty KPI on the right */}
        <div className="lg:col-span-1 bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-2xl shadow-2xl text-white flex flex-col items-center justify-center h-full animate-shadow-pulse">
            <Icon name="star" className="w-12 h-12 mb-3 text-yellow-300" />
            <p className="text-lg font-medium text-yellow-300">Loyalty Redemptions</p>
            <p className="text-6xl font-bold my-2">{kpis.redeemedItemsCount.toLocaleString()}</p>
            <p className="text-base opacity-80">items redeemed this period</p>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-start mb-4">
             <div>
                <h3 className="text-xl font-bold text-gray-800">{chartTitle}</h3>
                {selectedData ? (
                  <p className="text-sm text-gray-500 mt-1">
                      Details for <span className="font-semibold text-gray-700">{selectedData.data.label}</span>
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 mt-1">Click a bar to see details</p>
                )}
             </div>

            <div className="flex items-center gap-4">
                <div className="text-right bg-blue-50 p-2 rounded-lg border border-blue-200 min-w-[140px] h-[76px] flex flex-col justify-center">
                    {selectedData ? (
                        <>
                            <p className="text-sm font-medium text-blue-500">Total Sales</p>
                            <p className="text-3xl font-bold text-blue-700">£{selectedData.data.total.toFixed(2)}</p>
                        </>
                    ) : (
                        <p className="text-gray-400">--</p>
                    )}
                </div>
                 <div className="flex gap-1 bg-gray-200 p-1 rounded-lg">
                    <button onClick={() => setChartMode('trend')} className={`px-3 py-1 text-sm font-semibold rounded-md ${chartMode === 'trend' ? 'bg-white shadow' : 'text-gray-600'}`}>Trend</button>
                    <button onClick={() => setChartMode('cumulative')} className={`px-3 py-1 text-sm font-semibold rounded-md ${chartMode === 'cumulative' ? 'bg-white shadow' : 'text-gray-600'}`}>Cumulative</button>
                </div>
            </div>
          </div>
          {finalChartData.length > 0 ? (
            <div className="h-80 w-full pt-4">
                <div className="flex items-end h-full gap-2 border-b-2 border-gray-300 pb-1 overflow-x-auto">
                    {finalChartData.map((d: any, i: number) => {
                        const maxVal = Math.max(...finalChartData.map((v: any) => v.total), 0);
                        let label, dateKey;
                        switch(chartGranularity) {
                            case 'hourly': label = `${d.hour.toString().padStart(2, '0')}:00`; dateKey = toLocalDateString(startDate); break;
                            case 'daily': label = new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); dateKey = d.date; break;
                            case 'monthly': label = new Date(`${d.month}-02`).toLocaleDateString('en-GB', { month: 'short' }); dateKey = d.month; break;
                        }
                        const isClickable = chartGranularity !== 'monthly';
                        const isClicked = isClickable && selectedData?.index === i;
                        const eventName = chartGranularity === 'daily' ? specialDays[dateKey] : null;

                        return (
                            <div key={i} onClick={() => isClickable && handleBarClick(d, i, dateKey)} className={`flex-1 min-w-[2rem] h-full flex flex-col justify-end items-center group relative ${isClickable ? 'cursor-pointer' : ''}`}>
                                {eventName && (
                                    <div className="absolute bottom-6 inset-x-0 h-[calc(100%-1.5rem)] flex items-center justify-center pointer-events-none overflow-hidden">
                                        <span 
                                            style={{ writingMode: 'vertical-rl' }} 
                                            className="transform rotate-180 text-black/20 text-3xl font-bold uppercase tracking-widest select-none whitespace-nowrap"
                                        >
                                            {eventName}
                                        </span>
                                    </div>
                                )}

                                <div className={`w-full group-hover:bg-blue-700 transition-colors duration-300 rounded-t-sm ${isClicked ? 'bg-blue-700' : 'bg-blue-500'}`} style={{ height: maxVal > 0 ? `${(d.total / maxVal) * 100}%` : '0%' }}/>
                                <p className="text-xs text-center text-gray-500 mt-1">{label}</p>
                            </div>
                        )
                    })}
                </div>
            </div>
          ) : (
              <div className="h-80 flex items-center justify-center text-gray-500">No transactions for this period.</div>
          )}
          <div className="text-center mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">{startDate.toLocaleDateString('en-GB')} - {endDate.toLocaleDateString('en-GB')}</p>
          </div>
      </div>
      {renderDetailsBox()}
      <DateRangePicker 
          isOpen={isPickerOpen || preset === 'custom'}
          onClose={() => { setPickerOpen(false); if(preset === 'custom') setPreset('thisWeek'); }}
          initialStartDate={startDate}
          initialEndDate={endDate}
          onApply={(start, end) => {
              setStartDate(start);
              setEndDate(end);
              setPickerOpen(false);
              setPreset('custom');
          }}
      />
    </div>
  );
};

export default TransactionsReport;