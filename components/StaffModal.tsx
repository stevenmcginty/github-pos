
import React, { useState, useEffect } from 'react';
import { StaffMember, PayRate } from '../types';
import Icon from './Icon';

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (staffMember: Omit<StaffMember, 'id'> & { id?: string }) => void;
  onDelete: (staffMember: StaffMember) => void;
  staff: StaffMember[];
}

const colorSwatches = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899', '#14b8a6'
];

const toInputFormat = (date: Date) => date.toISOString().split('T')[0];
const getCurrentRate = (payRates: PayRate[]) => {
    if (!payRates || payRates.length === 0) return 0;
    const sorted = [...payRates].sort((a,b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
    return sorted[0].rate;
};

// --- Sub-components moved outside the main component to prevent re-rendering issues ---

interface ListViewProps {
    staff: StaffMember[];
    onClose: () => void;
    onEdit: (member: StaffMember) => void;
    onDelete: (member: StaffMember) => void;
    onAddNew: () => void;
}

const ListView = ({ staff, onClose, onEdit, onDelete, onAddNew }: ListViewProps) => (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-accent">Manage Staff</h2>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <Icon name="close" className="w-6 h-6" />
        </button>
      </div>
      <div className="space-y-2 mb-6 max-h-[60vh] overflow-y-auto pr-2">
        {staff.map(member => (
          <div key={member.id} className="flex items-center justify-between p-3 bg-bg-main rounded-md">
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 rounded-full" style={{backgroundColor: member.color}}></span>
              <span className="font-semibold">{member.name}</span>
              {member.isContracted && <span className="text-xs text-accent/80 font-semibold">(Contracted)</span>}
              <span className="text-sm text-text-secondary">£{getCurrentRate(member.payRates).toFixed(2)}/hr</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onEdit(member)} className="text-gray-400 hover:text-white"><Icon name="edit" className="w-5 h-5"/></button>
              <button onClick={() => onDelete(member)} className="text-red-500 hover:text-red-400"><Icon name="trash" className="w-5 h-5"/></button>
            </div>
          </div>
        ))}
         {staff.length === 0 && <p className="text-center text-text-secondary py-8">No staff members found.</p>}
      </div>
      <div className="flex justify-end">
        <button onClick={onAddNew} className="bg-accent text-text-on-accent font-bold py-2 px-4 rounded-md hover:bg-accent-hover flex items-center gap-2">
            <Icon name="plus" className="w-5 h-5" /> Add New Staff
        </button>
      </div>
    </>
);


interface FormViewProps {
    staffToEdit: StaffMember | null;
    error: string;
    onClose: () => void;
    onBack: () => void;
    onSubmit: (e: React.FormEvent) => void;
    name: string; setName: (val: string) => void;
    payRates: PayRate[]; setPayRates: (val: PayRate[]) => void;
    color: string; setColor: (val: string) => void;
    isContracted: boolean; setIsContracted: (val: boolean) => void;
}

const FormView = (props: FormViewProps) => {
    const { staffToEdit, error, onClose, onBack, onSubmit, name, setName, payRates, setPayRates, color, setColor, isContracted, setIsContracted } = props;
    const [newRate, setNewRate] = useState('');
    const [newEffectiveDate, setNewEffectiveDate] = useState(toInputFormat(new Date()));

    const handleAddRate = () => {
        const rate = parseFloat(newRate);
        if (isNaN(rate) || rate <= 0 || !newEffectiveDate) {
            alert("Please enter a valid positive rate and effective date.");
            return;
        }
        
        const [year, month, day] = newEffectiveDate.split('-').map(Number);
        if ([year, month, day].some(isNaN)) {
            alert("The effective date is invalid.");
            return;
        }
        const effectiveDateObj = new Date(year, month - 1, day);

        const newPayRate: PayRate = { id: crypto.randomUUID(), rate, effectiveDate: effectiveDateObj.toISOString() };
        setPayRates([...payRates, newPayRate].sort((a,b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()));
        setNewRate('');
        setNewEffectiveDate(toInputFormat(new Date()));
    };

    return (
        <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-accent">{staffToEdit ? 'Edit Staff Member' : 'Add Staff Member'}</h2>
            <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><Icon name="close" className="w-6 h-6" /></button>
          </div>
          
          {error && <p className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-md mb-4 text-sm">{error}</p>}
    
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="staff-name" className="block text-sm font-medium text-text-secondary">Staff Name</label>
              <input type="text" id="staff-name" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-bg-main border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent" required />
            </div>
            
            <div className="bg-bg-main/50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-accent mb-3">Pay Rates</h4>
                <div className="space-y-2 mb-4 max-h-32 overflow-y-auto pr-2">
                    {payRates.length > 0 ? payRates.map(pr => (
                        <div key={pr.id} className="flex justify-between items-center bg-bg-panel/50 p-2 rounded-md">
                            <span className="font-semibold">£{pr.rate.toFixed(2)} / hr</span>
                            <span className="text-sm text-text-secondary">{new Date(pr.effectiveDate).toLocaleDateString()}</span>
                        </div>
                    )) : <p className="text-text-secondary text-sm italic">No pay rates set. Add one below.</p>}
                </div>
                <div className="flex items-end gap-2 border-t border-border-color/20 pt-3">
                    <div className="flex-grow">
                        <label className="text-xs text-text-secondary">New Rate (£/hr)</label>
                        <input type="number" value={newRate} onChange={e => setNewRate(e.target.value)} step="0.01" min="0" placeholder="e.g. 11.50" className="mt-1 block w-full px-3 py-2 bg-bg-main border border-border-color rounded-md shadow-sm"/>
                    </div>
                    <div>
                        <label className="text-xs text-text-secondary">Effective Date</label>
                        <input type="date" value={newEffectiveDate} onChange={e => setNewEffectiveDate(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-bg-main border border-border-color rounded-md shadow-sm"/>
                    </div>
                    <button type="button" onClick={handleAddRate} className="bg-text-secondary text-bg-main font-bold py-2 px-4 rounded-md hover:bg-opacity-90">Add</button>
                </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-secondary">Display Color</label>
              <div className="mt-2 flex gap-2">{colorSwatches.map(swatch => (<button key={swatch} type="button" onClick={() => setColor(swatch)} className={`w-8 h-8 rounded-full transition-transform duration-200 ${color === swatch ? 'ring-2 ring-offset-2 ring-offset-bg-panel ring-white' : ''}`} style={{ backgroundColor: swatch }} />))}</div>
            </div>

            <div>
              <label className="flex items-center gap-3 text-sm font-medium text-text-secondary cursor-pointer">
                <input type="checkbox" checked={isContracted} onChange={(e) => setIsContracted(e.target.checked)} className="w-4 h-4 rounded bg-bg-main border-border-color text-accent focus:ring-accent"/> Contracted Staff Member
              </label>
              <p className="text-xs text-text-secondary mt-1 ml-7">If checked, unpaid breaks will be automatically deducted for shifts over 6 and 9 hours.</p>
            </div>
            <div className="flex justify-end pt-4 gap-2">
                <button type="button" onClick={onBack} className="bg-text-secondary text-bg-main font-bold py-2 px-4 rounded-md hover:bg-opacity-90">Back to List</button>
                <button type="submit" className="bg-accent text-text-on-accent font-bold py-2 px-4 rounded-md hover:bg-accent-hover">Save</button>
            </div>
          </form>
        </>
    );
};


const StaffModal = ({ isOpen, onClose, onSave, onDelete, staff }: StaffModalProps) => {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [staffToEdit, setStaffToEdit] = useState<StaffMember | null>(null);
  
  const [name, setName] = useState('');
  const [payRates, setPayRates] = useState<PayRate[]>([]);
  const [color, setColor] = useState(colorSwatches[0]);
  const [isContracted, setIsContracted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setView('list');
        setStaffToEdit(null);
      }, 300); // Delay to allow animation
    }
  }, [isOpen]);

  useEffect(() => {
    if (view === 'form') {
      if (staffToEdit) {
        setName(staffToEdit.name);
        setPayRates([...staffToEdit.payRates].sort((a,b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()));
        setColor(staffToEdit.color);
        setIsContracted(staffToEdit.isContracted);
      } else {
        setName('');
        setPayRates([]);
        setColor(colorSwatches[Math.floor(Math.random() * colorSwatches.length)]);
        setIsContracted(false);
      }
      setError('');
    }
  }, [view, staffToEdit]);

  if (!isOpen) return null;

  const handleEditClick = (member: StaffMember) => {
    setStaffToEdit(member);
    setView('form');
  };

  const handleAddNewClick = () => {
    setStaffToEdit(null);
    setView('form');
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || payRates.length === 0) {
      setError('Please provide a valid name and at least one pay rate.');
      return;
    }
    onSave({
      id: staffToEdit?.id,
      name,
      payRates,
      color,
      isContracted,
    });
    setView('list');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-bg-panel rounded-lg shadow-2xl p-8 w-full max-w-lg text-text-primary" onClick={e => e.stopPropagation()}>
        {view === 'list' ? (
            <ListView 
                staff={staff}
                onClose={onClose}
                onEdit={handleEditClick}
                onDelete={onDelete}
                onAddNew={handleAddNewClick}
            />
        ) : (
            <FormView 
                staffToEdit={staffToEdit}
                error={error}
                onClose={onClose}
                onBack={() => setView('list')}
                onSubmit={handleSaveSubmit}
                name={name} setName={setName}
                payRates={payRates} setPayRates={setPayRates}
                color={color} setColor={setColor}
                isContracted={isContracted} setIsContracted={setIsContracted}
            />
        )}
      </div>
    </div>
  );
};

export default StaffModal;