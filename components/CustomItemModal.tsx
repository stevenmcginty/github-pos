

import React, { useState, useEffect } from 'react';
import Icon from './Icon';

interface CustomItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, price: number, vatRate: number, loyaltyPoints: number) => void;
}

const CustomItemModal = ({ isOpen, onClose, onSave }: CustomItemModalProps) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [vatRate, setVatRate] = useState('20');
  const [loyaltyPoints, setLoyaltyPoints] = useState('0');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setName('');
      setPrice('');
      setVatRate('20');
      setLoyaltyPoints('0');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(price || '0');
    const vatRateNum = parseFloat(vatRate);
    const loyaltyPointsNum = parseInt(loyaltyPoints || '0', 10);

    if (!name.trim() || isNaN(priceNum) || priceNum < 0 || isNaN(vatRateNum) || vatRateNum < 0 || isNaN(loyaltyPointsNum) || loyaltyPointsNum < 0) {
      setError('Please provide a valid name, a non-negative price, VAT rate, and loyalty points.');
      return;
    }
    
    onSave(name.trim(), priceNum, vatRateNum, loyaltyPointsNum);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-bg-panel rounded-lg shadow-2xl p-8 w-full max-w-md text-text-primary" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-accent">Add Custom Item</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <Icon name="close" className="w-6 h-6" />
          </button>
        </div>
        
        {error && <p className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-md mb-4 text-sm">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="custom-item-name" className="block text-sm font-medium text-text-secondary">Item Name</label>
            <input 
                type="text" 
                id="custom-item-name" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="mt-1 block w-full px-3 py-2 bg-bg-main border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent" 
                required 
                autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="custom-item-price" className="block text-sm font-medium text-text-secondary">Price</label>
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary">£</span>
                    <input 
                        type="number" 
                        id="custom-item-price" 
                        value={price} 
                        onChange={e => setPrice(e.target.value)} 
                        step="0.01" 
                        min="0" 
                        className="pl-7 mt-1 block w-full px-3 py-2 bg-bg-main border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent"
                        required
                    />
                </div>
            </div>
             <div>
                <label htmlFor="custom-item-vat" className="block text-sm font-medium text-text-secondary">VAT Rate</label>
                <div className="relative">
                     <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary">%</span>
                    <input 
                        type="number" 
                        id="custom-item-vat" 
                        value={vatRate} 
                        onChange={e => setVatRate(e.target.value)} 
                        min="0" 
                        className="pr-7 mt-1 block w-full px-3 py-2 bg-bg-main border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent" 
                        required 
                    />
                </div>
            </div>
          </div>
          <div>
            <label htmlFor="custom-loyalty-points" className="block text-sm font-medium text-text-secondary">Loyalty Points</label>
            <input 
                type="number" 
                id="custom-loyalty-points" 
                value={loyaltyPoints} 
                onChange={e => setLoyaltyPoints(e.target.value)} 
                min="0" 
                className="mt-1 block w-full px-3 py-2 bg-bg-main border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent"
            />
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

export default CustomItemModal;