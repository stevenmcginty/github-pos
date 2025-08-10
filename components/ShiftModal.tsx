
import React, { useState, useEffect } from 'react';
import { Shift, StaffMember, ShiftStatus } from '../types';
import Icon from './Icon';
import { getPayRateForShift } from '../utils/rota';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shift: Omit<Shift, 'id'> & { id?: string }) => void;
  onDelete?: (shift: Shift) => void;
  shiftToEdit: (Omit<Shift, 'id' | 'breaks'> & { id?: string; breaks?: any[] }) | null;
  staff: StaffMember[];
}

const toLocalISOString = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const toInputDateFormat = (date: Date): string => {
    // Use local date components to match the new local-date holiday logic.
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const ShiftModal = ({ isOpen, onClose, onSave, onDelete, shiftToEdit, staff }: ShiftModalProps) => {
  const [staffId, setStaffId] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [status, setStatus] = useState<ShiftStatus>(ShiftStatus.Active);
  const [holidayStartDate, setHolidayStartDate] = useState('');
  const [holidayEndDate, setHolidayEndDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
        if (shiftToEdit) {
            setStaffId(shiftToEdit.staffId);
            setStart(toLocalISOString(new Date(shiftToEdit.start)));
            setEnd(toLocalISOString(new Date(shiftToEdit.end)));
            setStatus(shiftToEdit.status || ShiftStatus.Active);
            if (shiftToEdit.status === ShiftStatus.Holiday) {
                const date = toInputDateFormat(new Date(shiftToEdit.start));
                setHolidayStartDate(date);
                setHolidayEndDate(date);
            } else {
                 const localToday = new Date();
                 const year = localToday.getFullYear();
                 const month = (localToday.getMonth() + 1).toString().padStart(2, '0');
                 const day = localToday.getDate().toString().padStart(2, '0');
                 const todayString = `${year}-${month}-${day}`;
                 setHolidayStartDate(todayString);
                 setHolidayEndDate(todayString);
            }
        } else {
            setStaffId(staff.length > 0 ? staff[0].id : '');
            const defaultStart = new Date();
            const defaultEnd = new Date();
            defaultEnd.setHours(defaultStart.getHours() + 4);
            setStart(toLocalISOString(defaultStart));
            setEnd(toLocalISOString(defaultEnd));
            const localToday = new Date();
            const year = localToday.getFullYear();
            const month = (localToday.getMonth() + 1).toString().padStart(2, '0');
            const day = localToday.getDate().toString().padStart(2, '0');
            const todayString = `${year}-${month}-${day}`;
            setHolidayStartDate(todayString);
            setHolidayEndDate(todayString);
            setStatus(ShiftStatus.Active);
        }
        setError('');
    }
  }, [shiftToEdit, isOpen, staff]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const staffMember = staff.find(s => s.id === staffId);
    if (!staffMember) {
        setError('Selected staff member could not be found.');
        return;
    }

    if (status === ShiftStatus.Holiday) {
        if (!staffId || !holidayStartDate) {
            setError('Please select a staff member and a start date for the holiday.');
            return;
        }
        
        const [sYear, sMonth, sDay] = holidayStartDate.split('-').map(Number);
        const hStartDate = new Date(Date.UTC(sYear, sMonth - 1, sDay));

        const effectiveEndDate = holidayEndDate || holidayStartDate;
        const [eYear, eMonth, eDay] = effectiveEndDate.split('-').map(Number);
        const hEndDate = new Date(Date.UTC(eYear, eMonth - 1, eDay));

        if (hStartDate > hEndDate) {
            setError('Holiday end date cannot be before the start date.');
            return;
        }

        const baseShiftData = {
            staffId,
            status,
            breaks: shiftToEdit?.breaks || [],
            wageAtTimeOfShift: 0, // Holidays have no wage
        };

        if (shiftToEdit?.id && status === ShiftStatus.Holiday) {
            const startOfDay = hStartDate;
            const endOfDay = new Date(startOfDay.getTime());
            endOfDay.setUTCHours(23, 59, 59, 999);
            onSave({ ...baseShiftData, id: shiftToEdit.id, start: startOfDay.toISOString(), end: endOfDay.toISOString() });
        } else {
            let currentDate = new Date(hStartDate.getTime());
            const loopEndDate = new Date(hEndDate.getTime());

            while (currentDate <= loopEndDate) {
                const startOfDay = new Date(currentDate.getTime());
                const endOfDay = new Date(currentDate.getTime());
                endOfDay.setUTCHours(23, 59, 59, 999);

                onSave({ ...baseShiftData, start: startOfDay.toISOString(), end: endOfDay.toISOString() });
                
                currentDate.setUTCDate(currentDate.getUTCDate() + 1);
            }
        }
    } else {
        const parseDateTimeLocal = (dtString: string): Date | null => {
            if (!dtString) return null;
            const [datePart, timePart] = dtString.split('T');
            if (!datePart || !timePart) return null;
            
            const [year, month, day] = datePart.split('-').map(Number);
            const [hours, minutes] = timePart.split(':').map(Number);
            
            if ([year, month, day, hours, minutes].some(isNaN)) return null;

            return new Date(year, month - 1, day, hours, minutes);
        };

        const startDate = parseDateTimeLocal(start);
        const endDate = parseDateTimeLocal(end);

        if (!staffId || !startDate || !endDate || startDate >= endDate) {
          setError('Please select a staff member and ensure the end time is after the start time.');
          return;
        }

        const tempShiftForRateLookup = { start: startDate.toISOString() };
        const wageAtTimeOfShift = getPayRateForShift(staffMember, tempShiftForRateLookup as Pick<Shift, 'start'|'wageAtTimeOfShift'>);

        onSave({
            id: shiftToEdit?.id,
            staffId,
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            status,
            breaks: shiftToEdit?.breaks || [],
            wageAtTimeOfShift
        });
    }

    onClose();
  };

  const handleDelete = () => {
    if (shiftToEdit?.id && onDelete) {
      onDelete(shiftToEdit as Shift);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-bg-panel rounded-lg shadow-2xl p-8 w-full max-w-md text-text-primary" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-accent">{shiftToEdit?.id ? 'Edit Shift' : 'Add Shift'}</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <Icon name="close" className="w-6 h-6" />
          </button>
        </div>
        
        {error && <p className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-md mb-4 text-sm">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="staff-select" className="block text-sm font-medium text-text-secondary">Staff Member</label>
            <select id="staff-select" value={staffId} onChange={e => setStaffId(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-bg-main border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent" required>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

           <div>
            <label htmlFor="shift-status" className="block text-sm font-medium text-text-secondary">Shift Status</label>
            <select id="shift-status" value={status} onChange={e => setStatus(e.target.value as ShiftStatus)} className="mt-1 block w-full px-3 py-2 bg-bg-main border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent">
              <option value={ShiftStatus.Active}>Active</option>
              <option value={ShiftStatus.Holiday}>On Holiday</option>
            </select>
          </div>

          {status === ShiftStatus.Active ? (
            <>
                <div>
                    <label htmlFor="start-time" className="block text-sm font-medium text-text-secondary">Start Time</label>
                    <input type="datetime-local" id="start-time" value={start} onChange={e => setStart(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-bg-main border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent" required />
                </div>
                <div>
                    <label htmlFor="end-time" className="block text-sm font-medium text-text-secondary">End Time</label>
                    <input type="datetime-local" id="end-time" value={end} onChange={e => setEnd(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-bg-main border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent" required />
                </div>
            </>
          ) : (
            <>
                {shiftToEdit?.id ? (
                     <div>
                        <label htmlFor="holiday-date" className="block text-sm font-medium text-text-secondary">Date</label>
                        <input type="date" id="holiday-date" value={holidayStartDate} onChange={e => { setHolidayStartDate(e.target.value); setHolidayEndDate(e.target.value); }} className="mt-1 block w-full px-3 py-2 bg-bg-main border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent" required />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="holiday-start-date" className="block text-sm font-medium text-text-secondary">Start Date</label>
                            <input type="date" id="holiday-start-date" value={holidayStartDate} onChange={e => setHolidayStartDate(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-bg-main border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent" required />
                        </div>
                        <div>
                            <label htmlFor="holiday-end-date" className="block text-sm font-medium text-text-secondary">End Date</label>
                            <input type="date" id="holiday-end-date" value={holidayEndDate} onChange={e => setHolidayEndDate(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-bg-main border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent" required />
                        </div>
                    </div>
                )}
            </>
          )}
         
          <div className="flex justify-between items-center pt-4">
            <div>
              {shiftToEdit?.id && onDelete && (
                <button type="button" onClick={handleDelete} className="text-red-400 hover:text-red-300 hover:bg-red-900/50 px-3 py-2 rounded-md text-sm flex items-center gap-2">
                    <Icon name="trash" className="w-4 h-4" /> Delete
                </button>
              )}
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={onClose} className="bg-text-secondary text-bg-main font-bold py-2 px-4 rounded-md mr-2 hover:bg-opacity-90">Cancel</button>
              <button type="submit" className="bg-accent text-text-on-accent font-bold py-2 px-4 rounded-md hover:bg-accent-hover">Save</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShiftModal;
