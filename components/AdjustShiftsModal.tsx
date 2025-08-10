
import React from 'react';
import { Shift, PayrollSummary } from '../types';
import Icon from './Icon';

interface AdjustShiftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEditShift: (shift: Shift) => void;
  payrollSummary: PayrollSummary | null;
}

const AdjustShiftsModal = ({ isOpen, onClose, onEditShift, payrollSummary }: AdjustShiftsModalProps) => {
  if (!isOpen || !payrollSummary) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-brand-dark rounded-lg shadow-2xl p-8 w-full max-w-2xl text-white flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-brand-secondary">Adjust Hours</h2>
            <p className="text-brand-light">For {payrollSummary.staffName}</p>
          </div>
          <button onClick={onClose} className="text-brand-light hover:text-white">
            <Icon name="close" className="w-6 h-6" />
          </button>
        </div>
        <div className="space-y-2 mb-6 max-h-[60vh] overflow-y-auto pr-2 bg-brand-primary/50 p-4 rounded-lg">
          {payrollSummary.shifts.length > 0 ? (
            payrollSummary.shifts.map(shift => (
              <div key={shift.id} className="flex items-center justify-between p-3 bg-brand-primary rounded-md">
                <div>
                  <p className="font-semibold">{new Date(shift.start).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                  <p className="text-sm text-brand-light">{new Date(shift.start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} - {new Date(shift.end).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <button 
                  onClick={() => onEditShift(shift)}
                  className="flex items-center gap-2 bg-brand-light text-brand-dark font-semibold py-1 px-3 rounded-md hover:bg-opacity-90"
                >
                  <Icon name="edit" className="w-4 h-4"/>
                  Edit
                </button>
              </div>
            ))
          ) : (
            <p className="text-center text-brand-light py-8">No shifts found in this period.</p>
          )}
        </div>
        <div className="flex justify-end">
          <button onClick={onClose} className="bg-brand-secondary text-brand-dark font-bold py-2 px-4 rounded-md hover:bg-brand-accent">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdjustShiftsModal;
