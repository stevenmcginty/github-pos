

import React, { useState, useMemo } from 'react';
import { Shift, StaffMember } from '../types';
import Icon from './Icon';
import { toLocalDateString, getWeekStart } from '../utils/rota';

interface WeeklyRotaProps {
  shifts: Shift[];
  staff: StaffMember[];
}

const WeeklyRota = ({ shifts, staff }: WeeklyRotaProps) => {
  const staffMap = useMemo(() => new Map(staff.map(s => [s.id, s])), [staff]);
  const [viewDate, setViewDate] = useState(new Date());

  const weekStart = useMemo(() => getWeekStart(viewDate), [viewDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d; }), [weekStart]);
  const weekTitle = `${weekDays[0].toLocaleDateString('en-GB', {day: '2-digit', month: 'short'})} - ${weekDays[6].toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})}`;

  const shiftsForWeek = useMemo(() => {
    const weekEnd = new Date(weekDays[6].getTime() + 24 * 60 * 60 * 1000);
    return shifts
        .filter(shift => {
            const start = new Date(shift.start);
            return start >= weekDays[0] && start < weekEnd;
        })
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [shifts, weekDays]);

  const shiftsByDay = useMemo(() => {
    const grouped: Record<string, Shift[]> = {};
    shiftsForWeek.forEach(shift => {
        const dayKey = toLocalDateString(new Date(shift.start));
        if (!grouped[dayKey]) grouped[dayKey] = [];
        grouped[dayKey].push(shift);
    });
    return grouped;
  }, [shiftsForWeek]);
  
  const formatTime = (date: Date) => date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const navigateWeek = (direction: number) => setViewDate(d => new Date(d.setDate(d.getDate() + direction * 7)));
  
  if (staff.length === 0) {
      return null;
  }

  return (
    <div className="bg-teal-900/50 rounded-lg">
      <div className="w-full p-3 text-left">
        <h3 className="font-semibold text-text-primary">Weekly Rota</h3>
      </div>
      
      <div className="p-3 border-t border-border-color/50">
          <div className="flex items-center justify-between bg-bg-main p-2 rounded-lg mb-4">
            <button onClick={() => navigateWeek(-1)} className="p-2 rounded-md hover:bg-text-secondary/20"><Icon name="left" className="w-5 h-5"/></button>
            <div className="flex flex-col items-center">
                <span className="font-semibold">{weekTitle}</span>
                <button onClick={() => setViewDate(new Date())} className="text-xs text-accent hover:underline">Go to Today</button>
            </div>
            <button onClick={() => navigateWeek(1)} className="p-2 rounded-md hover:bg-text-secondary/20"><Icon name="right" className="w-5 h-5"/></button>
          </div>
          
          <div className="max-h-48 overflow-y-auto space-y-4 pr-2">
          {weekDays.map(day => {
            const dayKey = toLocalDateString(day);
            const dayShifts = shiftsByDay[dayKey] || [];
            return (
              <div key={dayKey}>
                  <h3 className="font-bold text-sm text-text-secondary">{day.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</h3>
                  <div className="mt-2 space-y-2 border-l-2 border-bg-main pl-3">
                      {dayShifts.length > 0 ? dayShifts.map(shift => {
                          const member = staffMap.get(shift.staffId);
                          if (!member) return null;
                          return (
                              <div key={shift.id} className="p-2 rounded-md" style={{backgroundColor: `${member.color}20`}}>
                                  <p className="font-bold text-xs" style={{color: member.color}}>{member.name}</p>
                                  <p className="text-xs text-text-secondary">{formatTime(new Date(shift.start))} - {formatTime(new Date(shift.end))}</p>
                              </div>
                          );
                      }) : (
                          <p className="text-xs text-text-secondary/50 italic">No shifts scheduled.</p>
                      )}
                  </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WeeklyRota;