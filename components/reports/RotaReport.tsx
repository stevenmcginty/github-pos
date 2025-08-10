
import React, { useState, useMemo, useCallback } from 'react';
import { StaffMember, Shift, PayrollSummary, ShiftStatus, SpecialDay } from '../../types';
import Icon from '../Icon';
import StaffModal from '../StaffModal';
import ShiftModal from '../ShiftModal';
import AdjustShiftsModal from '../AdjustShiftsModal';
import { generateRotaCSV } from '../../utils/csv';
import { getWeekStart, calculateRotaDataForWeek, calculatePayrollSummary, getShiftHours, sanitizeRotaData, toLocalDateString, getPayRateForShift } from '../../utils/rota';
import { SyncManager } from '../../utils/syncManager';

interface RotaReportProps {
    specialDays: Record<string, string>;
    onSetEventName: (dayKey: string) => void;
    syncManager: SyncManager;
    staff: StaffMember[];
    shifts: Shift[];
}

const RotaTable = React.memo(({ weekTitle, weeklyLaborCost, weekDays, sanitizedStaff, shiftsByStaffAndDay, dailyLaborCosts, handleOpenShiftModal, specialDays, handleSetEventName }: any) => {
    const formatShiftTime = (start: Date, end: Date) => {
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return "Invalid Time";
        }
        return `${start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
    }

    return (
        <div id="rota-print-area" className="text-text-primary print-section">
             <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-text-primary mb-1">Weekly Rota</h2>
                    <p className="text-xl font-semibold text-text-secondary">{weekTitle}</p>
                </div>
                <div className="text-right print:hidden">
                    <p className="text-sm text-text-secondary font-medium">Total Weekly Labour Cost</p>
                    <p className="text-3xl font-bold text-green-600">£{weeklyLaborCost.toFixed(2)}</p>
                </div>
             </div>
             <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-border-color border border-border-color">
                    <thead className="bg-bg-main">
                        <tr>
                            <th className="px-3 py-3 text-left text-sm font-semibold text-text-primary w-48 border-r border-border-color">Staff</th>
                            {weekDays.map((day: Date) => {
                                const dayKey = toLocalDateString(day);
                                const eventName = specialDays[dayKey];
                                return (
                                <th key={day.toISOString()} className="px-3 py-3 text-center text-sm font-semibold text-text-primary border-r border-border-color">
                                    <div className='flex items-center justify-center gap-1'>
                                        {day.toLocaleDateString('en-GB', { weekday: 'short' })}
                                        <button onClick={() => handleSetEventName(dayKey)} className="print:hidden text-text-secondary hover:text-accent"><Icon name="edit" className="w-3 h-3"/></button>
                                    </div>
                                    <span className="block text-xs font-normal text-text-secondary">{day.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}</span>
                                    {eventName && <span className="block text-xs font-bold text-amber-500 mt-1">{eventName}</span>}
                                </th>
                            )})}
                        </tr>
                    </thead>
                    <tbody className="bg-bg-panel divide-y divide-border-color">
                        {sanitizedStaff.map((member: StaffMember) => (
                            <tr key={member.id}>
                                <td className="px-3 py-3 whitespace-nowrap text-sm font-semibold text-text-primary border-r border-border-color" style={{ borderLeft: `6px solid ${member.color}` }}>
                                    {member.name}
                                    <span className="block text-xs font-normal text-text-secondary print:hidden">£{getPayRateForShift(member, {start: new Date().toISOString()} as Shift).toFixed(2)}/hr</span>
                                </td>
                                {weekDays.map((day: Date) => {
                                    const shiftsForDay = shiftsByStaffAndDay[member.id]?.[toLocalDateString(day)]?.sort((a: Shift,b: Shift) => new Date(a.start).getTime() - new Date(b.start).getTime()) || [];
                                    return (
                                        <td key={day.toISOString()} className="align-top p-2 text-sm text-text-primary border-r border-border-color min-h-[80px]">
                                            <div className="space-y-1">
                                                {shiftsForDay.map((shift: Shift) => {
                                                    const start = new Date(shift.start); const end = new Date(shift.end);
                                                    const isHoliday = shift.status === ShiftStatus.Holiday;
                                                    return (
                                                        <button key={shift.id} onClick={() => handleOpenShiftModal(shift)}
                                                            className={`w-full text-left p-1.5 rounded-md shadow-sm transition-transform hover:scale-105 ${isHoliday ? 'bg-gray-200 text-gray-600' : 'text-white'}`}
                                                            style={isHoliday ? {} : { backgroundColor: member.color }}>
                                                            {isHoliday ? (
                                                                <p className="font-bold text-xs text-center">{ShiftStatus.Holiday}</p>
                                                            ) : (
                                                                <>
                                                                    <p className="font-bold text-xs">{formatShiftTime(start, end)}</p>
                                                                    <p className="text-xs opacity-80">{getShiftHours(start, end).toFixed(2)} hrs</p>
                                                                </>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-bg-main border-t-2 border-border-color print:hidden">
                        <tr>
                            <td className="px-3 py-2 text-left text-sm font-bold text-text-primary">Daily Labour Cost</td>
                            {dailyLaborCosts.map((cost: number, index: number) => <td key={index} className="px-3 py-2 text-center text-sm font-bold text-green-600 border-r border-border-color">£{cost.toFixed(2)}</td>)}
                        </tr>
                    </tfoot>
                </table>
             </div>
        </div>
    );
});

const RotaReport = ({ specialDays, onSetEventName, syncManager, staff, shifts }: RotaReportProps) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isStaffModalOpen, setStaffModalOpen] = useState(false);
    const [isShiftModalOpen, setShiftModalOpen] = useState(false);
    const [isAdjustShiftsModalOpen, setAdjustShiftsModalOpen] = useState(false);
    const [shiftToEdit, setShiftToEdit] = useState<(Omit<Shift, 'id'> & { id?: string }) | null>(null);
    const [payrollSummaryForAdjustment, setPayrollSummaryForAdjustment] = useState<PayrollSummary | null>(null);

    type SummaryPeriod = 'day' | 'week' | 'month' | 'year' | 'custom';
    const [summaryPeriod, setSummaryPeriod] = useState<SummaryPeriod>('week');
    const [customStartDate, setCustomStartDate] = useState(toLocalDateString(new Date()));
    const [customEndDate, setCustomEndDate] = useState(toLocalDateString(new Date()));
    const [selectedDate, setSelectedDate] = useState(toLocalDateString(new Date()));
    const [selectedMonth, setSelectedMonth] = useState(`${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

    const { sanitizedStaff, sanitizedShifts, sanitizedStaffMap } = useMemo(() => {
        return sanitizeRotaData(staff, shifts);
    }, [staff, shifts]);

    const weekStart = useMemo(() => getWeekStart(currentDate), [currentDate]);
    const { shiftsByStaffAndDay, weeklyLaborCost, dailyLaborCosts } = useMemo(() => calculateRotaDataForWeek(sanitizedShifts, sanitizedStaffMap, weekStart), [sanitizedShifts, sanitizedStaffMap, weekStart]);
    
    const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d; }), [weekStart]);
    const weekTitle = `${weekStart.toLocaleDateString('en-GB', {day: '2-digit', month: 'short'})} - ${weekDays[6].toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})}`;

    const handleSaveStaff = useCallback((staffMember: Omit<StaffMember, 'id'> & { id?: string }) => {
        syncManager.saveStaff(staffMember);
    }, [syncManager]);

    const handleDeleteStaff = useCallback((staffMember: StaffMember) => {
        if(window.confirm(`Are you sure you want to delete ${staffMember.name}? All their shifts will also be removed.`)) {
            syncManager.deleteItem('staff', staffMember.id);
        }
    }, [syncManager]);

    const handleSaveShift = useCallback((shift: Omit<Shift, 'id'> & { id?: string }) => {
        syncManager.saveShift(shift);
    }, [syncManager]);

    const handleDeleteShift = useCallback((shift: Shift) => {
        if(window.confirm('Are you sure you want to delete this shift?')) {
            syncManager.deleteItem('shifts', shift.id);
        }
    }, [syncManager]);

    const { summaryStartDate, summaryEndDate } = useMemo(() => {
        let start, end;
        switch (summaryPeriod) {
            case 'day':
                start = new Date(selectedDate); start.setHours(0,0,0,0);
                end = new Date(selectedDate); end.setHours(23,59,59,999);
                break;
            case 'week': {
                const today = new Date();
                start = new Date(today.getFullYear(), today.getMonth(), today.getDate()); // Normalized to start of day
                const dayOfWeek = start.getDay(); // Sunday - 0, Monday - 1...
                const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                start.setDate(start.getDate() - diffToMonday);

                end = new Date(start);
                end.setDate(end.getDate() + 6);
                end.setHours(23, 59, 59, 999);
                break;
            }
            case 'month':
                const [yearM, monthM] = selectedMonth.split('-').map(Number);
                start = new Date(yearM, monthM - 1, 1);
                end = new Date(yearM, monthM, 0); end.setHours(23,59,59,999);
                break;
            case 'year':
                const y = parseInt(selectedYear, 10);
                start = new Date(y, 0, 1); end = new Date(y, 11, 31); end.setHours(23,59,59,999);
                break;
            case 'custom':
                start = new Date(customStartDate); start.setHours(0,0,0,0);
                end = new Date(customEndDate); end.setHours(23,59,59,999);
                break;
            default: start = new Date(); end = new Date();
        }
        return { summaryStartDate: start, summaryEndDate: end };
    }, [summaryPeriod, selectedDate, selectedMonth, selectedYear, customStartDate, customEndDate]);

    const wagesSummary = useMemo(() => calculatePayrollSummary(sanitizedShifts, sanitizedStaff, summaryStartDate, summaryEndDate), [sanitizedShifts, sanitizedStaff, summaryStartDate, summaryEndDate]);
    const totalWages = useMemo(() => wagesSummary.reduce((acc, curr) => acc + curr.totalEarnings, 0), [wagesSummary]);
    const totalHours = useMemo(() => wagesSummary.reduce((acc, curr) => acc + curr.totalHours, 0), [wagesSummary]);

    const handleOpenShiftModal = (shift: any) => { setShiftToEdit(shift); setShiftModalOpen(true); };
    const handleOpenAdjustShiftsModal = (summary: PayrollSummary) => { setPayrollSummaryForAdjustment(summary); setAdjustShiftsModalOpen(true); };
    
    const handlePrint = () => window.print();

    const handleExport = () => {
        const specialDaysArray: SpecialDay[] = Object.entries(specialDays).map(([id, eventName]) => ({
            id,
            eventName,
            lastUpdated: new Date().toISOString()
        }));

        const csvData = generateRotaCSV(sanitizedStaff, sanitizedShifts, specialDaysArray);
        const fileName = `cafe-roma-rota-${weekStart.toISOString().split('T')[0]}.csv`;
        
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const periodButtons: {label: string, value: SummaryPeriod}[] = [
        { label: 'Day', value: 'day'}, { label: 'This Week', value: 'week' }, { label: 'Month', value: 'month' },
        { label: 'Year', value: 'year' }, { label: 'Custom', value: 'custom' },
    ];

    const renderPeriodInputs = () => {
        const inputClasses = "p-2 border border-border-color rounded-md shadow-sm bg-bg-panel text-text-primary";
        switch(summaryPeriod) {
            case 'day': return <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className={inputClasses}/>;
            case 'month': return <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className={inputClasses}/>;
            case 'year': return <input type="number" value={selectedYear} placeholder="YYYY" onChange={e => setSelectedYear(e.target.value)} className={`${inputClasses} w-28`}/>;
            case 'custom':
                return (
                    <div className="flex items-center gap-2">
                        <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className={inputClasses}/>
                        <span>to</span>
                        <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className={inputClasses}/>
                    </div>
                );
            default: return null;
        }
    }

    return (
        <div className="p-6 bg-bg-main min-h-full text-text-primary">
            <div className="flex flex-col lg:flex-row gap-4 lg:justify-between lg:items-center mb-6">
                <h2 className="text-3xl font-bold text-text-primary">Staff Rota</h2>
                <div className="flex flex-wrap items-center gap-2 lg:gap-4">
                    <div className="flex items-center bg-bg-panel p-2 rounded-lg shadow">
                        <button onClick={() => setCurrentDate(d => new Date(d.setDate(d.getDate() - 7)))} className="p-2 rounded-md hover:bg-bg-main"><Icon name="left" className="w-5 h-5"/></button>
                        <span className="mx-4 font-semibold w-56 text-center">{weekTitle}</span>
                        <button onClick={() => setCurrentDate(d => new Date(d.setDate(d.getDate() + 7)))} className="p-2 rounded-md hover:bg-bg-main"><Icon name="right" className="w-5 h-5"/></button>
                    </div>
                    <button onClick={handlePrint} className="bg-text-secondary/80 text-bg-main font-semibold py-2 px-4 rounded-lg shadow hover:bg-text-secondary/100 flex items-center gap-2">
                        <Icon name="print" className="w-5 h-5"/> Print
                    </button>
                    <button onClick={handleExport} className="bg-text-secondary/80 text-bg-main font-semibold py-2 px-4 rounded-lg shadow hover:bg-text-secondary/100 flex items-center gap-2">
                        <Icon name="download" className="w-5 h-5"/> Export CSV
                    </button>
                    <div className="h-8 border-l border-border-color mx-2 hidden lg:block"></div>
                    <button onClick={() => setStaffModalOpen(true)} className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-blue-700">Manage Staff</button>
                    <button onClick={() => handleOpenShiftModal(null)} className="bg-accent text-text-on-accent font-semibold py-2 px-4 rounded-lg shadow hover:bg-accent-hover">Add Shift</button>
                </div>
            </div>

            <div className="bg-bg-panel p-4 rounded-lg shadow" style={{ display: 'block' }}>
              <RotaTable {...{ weekTitle, weeklyLaborCost, weekDays, sanitizedStaff, shiftsByStaffAndDay, dailyLaborCosts, handleOpenShiftModal, specialDays, handleSetEventName: onSetEventName }} />
            </div>

            <div className="mt-8 bg-bg-panel p-6 rounded-lg shadow print:hidden">
                <h3 className="text-2xl font-bold text-text-primary mb-4">Staff Wages Summary</h3>
                <div className="flex flex-wrap items-center gap-4 mb-6 pb-4 border-b border-border-color">
                    <div className="flex items-center gap-2">
                        {periodButtons.map(btn => (
                           <button key={btn.value} onClick={() => setSummaryPeriod(btn.value)} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${summaryPeriod === btn.value ? 'bg-accent text-text-on-accent' : 'bg-bg-main hover:bg-opacity-80'}`}>
                                {btn.label}
                           </button>
                        ))}
                    </div>
                    <div className="flex-grow flex justify-start">
                        {renderPeriodInputs()}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border-color">
                        <thead className="bg-bg-main">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Staff Member</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Total Hours</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Total Earnings</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-bg-panel divide-y divide-border-color">
                            {wagesSummary.length > 0 ? wagesSummary.map(summary => (
                                <tr key={summary.staffId}>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                                        <div className="flex items-center gap-3">
                                            <span className="w-3 h-3 rounded-full" style={{backgroundColor: summary.staffColor}}></span>
                                            {summary.staffName}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-text-primary">{summary.totalHours.toFixed(2)}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-600">£{summary.totalEarnings.toFixed(2)}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-right">
                                        <button onClick={() => handleOpenAdjustShiftsModal(summary)} className="text-blue-500 hover:text-blue-400 font-semibold">Adjust Hours</button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="text-center py-10 text-text-secondary">No wage data for the selected period.</td>
                                </tr>
                            )}
                        </tbody>
                         <tfoot className="bg-bg-main">
                            <tr className="border-t-2 border-border-color">
                                <td className="px-4 py-3 text-left text-sm font-bold text-text-primary">Grand Total</td>
                                <td className="px-4 py-3 text-right text-sm font-bold text-text-primary">{totalHours.toFixed(2)}</td>
                                <td className="px-4 py-3 text-right text-sm font-bold text-green-700" colSpan={2}>£{totalWages.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <StaffModal isOpen={isStaffModalOpen} onClose={() => setStaffModalOpen(false)} onSave={handleSaveStaff} onDelete={handleDeleteStaff} staff={sanitizedStaff} />
            <ShiftModal isOpen={isShiftModalOpen} onClose={() => setShiftModalOpen(false)} onSave={handleSaveShift} onDelete={handleDeleteShift} shiftToEdit={shiftToEdit} staff={sanitizedStaff} />
            <AdjustShiftsModal 
              isOpen={isAdjustShiftsModalOpen}
              onClose={() => setAdjustShiftsModalOpen(false)}
              payrollSummary={payrollSummaryForAdjustment}
              onEditShift={(shift) => {
                  setAdjustShiftsModalOpen(false);
                  setTimeout(() => handleOpenShiftModal(shift), 150); // Delay to allow modals to transition smoothly
              }}
            />
        </div>
    );
};

export default RotaReport;