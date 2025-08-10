
import React, { useState, useEffect } from 'react';
import Icon from './Icon';

interface CustomGiftCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (amount: number) => void;
}

const CustomGiftCardModal = ({ isOpen, onClose, onSave }: CustomGiftCardModalProps) => {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount || '0');

    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please provide a valid, positive amount for the gift card.');
      return;
    }
    
    onSave(amountNum);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-bg-panel rounded-lg shadow-2xl p-8 w-full max-w-md text-text-primary" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-accent">Custom Gift Card Amount</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <Icon name="close" className="w-6 h-6" />
          </button>
        </div>
        
        {error && <p className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-md mb-4 text-sm">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="custom-gc-amount" className="block text-sm font-medium text-text-secondary">Amount</label>
            <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary">£</span>
                <input 
                    type="number" 
                    id="custom-gc-amount" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                    step="0.01" 
                    min="0.01"
                    className="pl-7 text-lg block w-full px-3 py-2 bg-bg-main border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent" 
                    required 
                    autoFocus
                />
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <button type="button" onClick={onClose} className="bg-text-secondary text-bg-main font-bold py-2 px-4 rounded-md mr-2 hover:bg-opacity-90">Cancel</button>
            <button type="submit" className="bg-accent text-text-on-accent font-bold py-2 px-4 rounded-md hover:bg-accent-hover">Add to Order</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomGiftCardModal;
