import React, { useState, useEffect, useMemo } from 'react';
import Icon from './Icon';

interface DateRangePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (start: Date, end: Date) => void;
  initialStartDate?: Date;
  initialEndDate?: Date;
}

const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
const isBetween = (date: Date, start: Date, end: Date) => date > start && date < end;

const DateRangePicker = ({ isOpen, onClose, onApply, initialStartDate, initialEndDate }: DateRangePickerProps) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [startDate, setStartDate] = useState<Date | null>(initialStartDate || null);
  const [endDate, setEndDate] = useState<Date | null>(initialEndDate || null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  useEffect(() => {
      if (isOpen) {
        setStartDate(initialStartDate || null);
        setEndDate(initialEndDate || null);
        setViewDate(initialStartDate || new Date());
      }
  }, [isOpen, initialStartDate, initialEndDate]);

  const handleDateClick = (day: Date) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(day);
      setEndDate(null);
    } else if (startDate && !endDate) {
      if (day < startDate) {
        setEndDate(startDate);
        setStartDate(day);
      } else {
        setEndDate(day);
      }
    }
  };
  
  const handleApplyClick = () => {
    if (startDate && endDate) {
      onApply(startDate, endDate);
    } else if(startDate && !endDate) {
      onApply(startDate, startDate);
    }
  };

  const handlePreset = (preset: 'today' | 'week' | 'month' | 'year' | 'all') => {
    const today = new Date();
    let start = new Date();
    let end = new Date();
    
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);

    switch(preset) {
        case 'today':
            // start and end are already today
            break;
        case 'week':
            const dayOfWeek = today.getDay();
            const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            start = new Date(today.setDate(diff));
            start.setHours(0,0,0,0);
            end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23,59,59,999);
            break;
        case 'month':
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
        case 'year':
            start = new Date(today.getFullYear(), 0, 1);
            end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
            break;
        case 'all':
             start = new Date(2020, 0, 1);
             end = new Date();
             end.setHours(23,59,59,999);
             break;
    }
    setStartDate(start);
    setEndDate(end);
    setViewDate(start);
  };

  const calendar = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const dayOffset = (firstDay === 0) ? 6 : firstDay - 1;

    const days = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
    const blanks = Array.from({ length: dayOffset }, () => null);
    return [...blanks, ...days];
  }, [viewDate]);
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 print:hidden" onClick={onClose}>
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl flex" onClick={e => e.stopPropagation()}>
            {/* Presets Column */}
            <div className="w-48 bg-gray-50 p-4 border-r border-gray-200 rounded-l-lg">
                <h3 className="font-bold text-gray-700 mb-4">Date Ranges</h3>
                <div className="space-y-2">
                    {['Today', 'This Week', 'This Month', 'This Year', 'All Time'].map(preset => (
                        <button key={preset} onClick={() => handlePreset(preset.toLowerCase().replace(' ', '') as any)} className="w-full text-left px-3 py-2 text-sm text-gray-600 rounded-md hover:bg-blue-100 hover:text-blue-800">
                            {preset}
                        </button>
                    ))}
                </div>
            </div>

            {/* Calendar Column */}
            <div className="p-6 flex-grow">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="p-2 rounded-full hover:bg-gray-100"><Icon name="left" className="w-5 h-5 text-gray-600" /></button>
                    <p className="font-bold text-lg text-gray-800">{viewDate.toLocaleString('en-GB', { month: 'long', year: 'numeric' })}</p>
                    <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="p-2 rounded-full hover:bg-gray-100"><Icon name="right" className="w-5 h-5 text-gray-600" /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-sm text-gray-500 mb-2">
                    {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => <div key={day}>{day}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {calendar.map((day, i) => {
                        if (!day) return <div key={`blank-${i}`} />;
                        const isSelectedStart = startDate && isSameDay(day, startDate);
                        const isSelectedEnd = endDate && isSameDay(day, endDate);
                        const inRange = startDate && endDate && isBetween(day, startDate, endDate);
                        const isHovering = startDate && !endDate && hoverDate && (day > startDate && day <= hoverDate);

                        let classes = "w-10 h-10 flex items-center justify-center rounded-lg transition-colors text-sm ";
                        if (isSelectedStart || isSelectedEnd) {
                            classes += 'bg-blue-600 text-white font-bold';
                        } else if (inRange || isHovering) {
                            classes += 'bg-blue-100 text-blue-800';
                        } else {
                            classes += 'hover:bg-gray-100 cursor-pointer';
                        }

                        return (
                            <div key={day.toISOString()} onClick={() => handleDateClick(day)} onMouseEnter={() => setHoverDate(day)} onMouseLeave={() => setHoverDate(null)} className={classes}>
                                {day.getDate()}
                            </div>
                        );
                    })}
                </div>
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      {startDate ? startDate.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'}) : 'Select start date'}
                      {endDate && ` - ${endDate.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'})}`}
                    </p>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
                        <button onClick={handleApplyClick} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">Apply</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default DateRangePicker;