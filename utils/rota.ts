
import { Shift, StaffMember, PayrollSummary, ShiftStatus, Break, PayRate } from '../types';

export type PayrollPeriod = 'thisWeek' | 'lastWeek' | 'thisMonth' | 'last30Days';

const colorSwatches = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899', '#14b8a6'
];

export const toLocalDateString = (date: Date): string => {
    // Switched to local date getters (getFullYear, getMonth, getDate) to ensure
    // consistency between how rota dates are keyed and how shift dates are displayed.
    // This resolves timezone-related "off-by-one" errors.
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diffToMonday);
    return d;
};

export const getShiftHours = (start: Date, end: Date): number => {
    if (!(start instanceof Date) || isNaN(start.getTime()) || !(end instanceof Date) || isNaN(end.getTime()) || end <= start) {
        return 0;
    }
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
};

export const getPayableHours = (shift: Shift, isContracted: boolean): number => {
    if (shift.status === ShiftStatus.Holiday) {
        return 0;
    }
    const totalHours = getShiftHours(new Date(shift.start), new Date(shift.end));
    if (!isContracted || totalHours <= 6) {
        return totalHours;
    }
    if (totalHours > 9) {
        return totalHours - 1;
    }
    return totalHours - 0.5;
};

export const getPayRateForShift = (member: StaffMember | undefined, shift: Pick<Shift, 'start' | 'wageAtTimeOfShift'>): number => {
    // If a wage was recorded at the time of the shift, use that for historical accuracy.
    if (typeof shift.wageAtTimeOfShift === 'number') {
        return shift.wageAtTimeOfShift;
    }
    
    // Add a guard clause for when the member might be undefined (e.g., if staff was deleted).
    if (!member) {
        return 0;
    }

    // Fallback for older shifts: find the correct rate from pay history.
    if (!member.payRates || member.payRates.length === 0) {
        // Legacy fallback for staff members created before pay history was a feature
        return (member as any).hourlyRate || 0;
    }

    const shiftStartDate = new Date(shift.start);
    
    const applicableRates = member.payRates
        .filter(rate => new Date(rate.effectiveDate) <= shiftStartDate)
        .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());

    return applicableRates.length > 0 ? applicableRates[0].rate : 0;
};

export const sanitizeRotaData = (rawStaff: StaffMember[], rawShifts: Shift[]) => {
    const sanitizedStaffMap = new Map<string, StaffMember>();

    (rawStaff || []).forEach(s => {
        if (!s || !s.id) return;
        const payRates = (s.payRates || []).map(pr => ({ ...pr }));
        if (payRates.length === 0 && typeof (s as any).hourlyRate === 'number') {
            payRates.push({ id: `legacy-${s.id}`, rate: (s as any).hourlyRate, effectiveDate: new Date(0).toISOString() });
        }

        sanitizedStaffMap.set(s.id, {
            id: s.id,
            name: s.name || 'Unnamed Staff',
            payRates: payRates,
            color: (typeof s.color === 'string' && s.color.startsWith('#')) ? s.color : colorSwatches[s.id.charCodeAt(0) % colorSwatches.length],
            isContracted: typeof s.isContracted === 'boolean' ? s.isContracted : false,
        });
    });

    const sanitizedShifts: Shift[] = (rawShifts || []).filter(shift => {
        if (!shift || !shift.id || !shift.staffId || !shift.start || !shift.end) return false;
        if (!sanitizedStaffMap.has(shift.staffId)) return false; 
        const start = new Date(shift.start);
        const end = new Date(shift.end);
        return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start < end;
    }).map(shift => {
        const cleanShift: Shift = {
            id: shift.id,
            staffId: shift.staffId,
            start: shift.start,
            end: shift.end,
            status: shift.status || ShiftStatus.Active,
            breaks: shift.breaks || [],
            wageAtTimeOfShift: shift.wageAtTimeOfShift,
        };
        return cleanShift;
    });

    const sanitizedStaff = Array.from(sanitizedStaffMap.values());
    
    return { sanitizedStaff, sanitizedShifts, sanitizedStaffMap };
};

export const calculateRotaDataForWeek = (shifts: Shift[], staffMap: Map<string, StaffMember>, weekStart: Date): any => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const shiftsByStaffAndDay: Record<string, Record<string, Shift[]>> = {};
    staffMap.forEach((_, memberId) => { shiftsByStaffAndDay[memberId] = {}; });
    
    let weeklyLaborCost = 0;
    const dailyLaborCosts = Array(7).fill(0);

    shifts.forEach(shift => {
        const member = staffMap.get(shift.staffId);
        if (!member) return;
        const start = new Date(shift.start);
        if (start >= weekStart && start < weekEnd) {
            const dayKey = toLocalDateString(start);
            if (!shiftsByStaffAndDay[member.id][dayKey]) shiftsByStaffAndDay[member.id][dayKey] = [];
            shiftsByStaffAndDay[member.id][dayKey].push(shift);
            
            const payableHours = getPayableHours(shift, member.isContracted);
            const rateForShift = getPayRateForShift(member, shift);
            const cost = payableHours * rateForShift;
            weeklyLaborCost += cost;
            const dayIndex = (start.getDay() + 6) % 7;
            if (dayIndex >= 0 && dayIndex < 7) dailyLaborCosts[dayIndex] += cost;
        }
    });
    return { shiftsByStaffAndDay, weeklyLaborCost, dailyLaborCosts };
};

export const calculatePayrollSummary = (shifts: Shift[], staff: StaffMember[], startDate: Date, endDate: Date): PayrollSummary[] => {
    if (!startDate || !endDate || startDate > endDate) return [];
    
    const staffMap = new Map(staff.map(s => [s.id, s]));
    const payrollMap = new Map<string, { totalHours: number, totalEarnings: number, shifts: Shift[] }>();

    shifts.forEach(shift => {
        const shiftStart = new Date(shift.start);
        if (shiftStart < startDate || shiftStart > endDate) return;
        
        const member = staffMap.get(shift.staffId);
        if (!member) return;
        
        if(shift.status === ShiftStatus.Holiday) return;

        const payableHours = getPayableHours(shift, member.isContracted);
        if (payableHours > 0) {
            const current = payrollMap.get(member.id) || { totalHours: 0, totalEarnings: 0, shifts: [] };
            const rateForShift = getPayRateForShift(member, shift);
            current.totalHours += payableHours;
            current.totalEarnings += payableHours * rateForShift;
            current.shifts.push(shift);
            payrollMap.set(member.id, current);
        }
    });
    
    const summary: PayrollSummary[] = [];
    staff.forEach(member => {
        const data = payrollMap.get(member.id);
        summary.push({
            staffId: member.id,
            staffName: member.name,
            staffColor: member.color,
            totalHours: data?.totalHours || 0,
            totalEarnings: data?.totalEarnings || 0,
            shifts: data?.shifts.sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime()) || [],
        });
    });

    return summary.sort((a,b) => a.staffName.localeCompare(b.staffName));
};