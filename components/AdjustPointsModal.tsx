
import React, { useState, useEffect } from 'react';
import { Customer, PointTransaction } from '../types';
import Icon from './Icon';

interface AdjustPointsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (customer: Customer, adjustment: number, reason: string) => void;
    customer: Customer | null;
}

const AdjustPointsModal = ({ isOpen, onClose, onSave, customer }: AdjustPointsModalProps) => {
    const [adjustment, setAdjustment] = useState('');
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setAdjustment('');
            setReason('');
            setError('');
        }
    }, [isOpen]);

    if (!isOpen || !customer) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const adjustmentNum = parseInt(adjustment, 10);

        if (isNaN(adjustmentNum) || adjustmentNum === 0) {
            setError('Please enter a valid, non-zero whole number for the adjustment.');
            return;
        }

        if (!reason.trim()) {
            setError('A reason for the adjustment is required.');
            return;
        }

        onSave(customer, adjustmentNum, reason.trim());
        onClose();
    };

    const newTotal = customer.totalLoyaltyPoints + (parseInt(adjustment, 10) || 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-bg-panel rounded-lg shadow-2xl p-8 w-full max-w-md text-text-primary" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-accent">Adjust Loyalty Points</h2>
                        <p className="text-text-secondary">For {customer.name}</p>
                    </div>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><Icon name="close" className="w-6 h-6" /></button>
                </div>

                {error && <p className="bg-red-900/50 text-red-300 p-3 rounded-md mb-4">{error}</p>}

                <div className="bg-bg-main p-4 rounded-lg border border-border-color text-center mb-4">
                    <p className="text-sm text-text-secondary">Current Balance</p>
                    <p className="text-3xl font-bold">{customer.totalLoyaltyPoints.toLocaleString()} points</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="points-adjustment" className="block text-sm font-medium text-text-secondary">Points to Add/Remove</label>
                        <input
                            type="number"
                            id="points-adjustment"
                            value={adjustment}
                            onChange={e => setAdjustment(e.target.value)}
                            placeholder="e.g., 50 or -20"
                            className="mt-1 block w-full px-3 py-2 bg-bg-main border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent"
                            required
                            autoFocus
                        />
                        <p className="text-xs text-text-secondary mt-1">Use a positive number to add points and a negative number to remove them.</p>
                    </div>

                    <div>
                        <label htmlFor="adjustment-reason" className="block text-sm font-medium text-text-secondary">Reason for Adjustment</label>
                        <input
                            type="text"
                            id="adjustment-reason"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="e.g., Goodwill gesture, Manual correction"
                            className="mt-1 block w-full px-3 py-2 bg-bg-main border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent"
                            required
                        />
                    </div>
                    
                    <div className="bg-bg-main p-4 rounded-lg border border-border-color text-center mt-2">
                        <p className="text-sm text-text-secondary">New Balance</p>
                        <p className={`text-3xl font-bold transition-colors ${newTotal > customer.totalLoyaltyPoints ? 'text-green-400' : newTotal < customer.totalLoyaltyPoints ? 'text-red-400' : ''}`}>
                            {newTotal.toLocaleString()} points
                        </p>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button type="button" onClick={onClose} className="bg-text-secondary text-bg-main font-bold py-2 px-4 rounded-md mr-2 hover:bg-opacity-90">Cancel</button>
                        <button type="submit" className="bg-accent text-text-on-accent font-bold py-2 px-4 rounded-md hover:bg-accent-hover">Save Adjustment</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdjustPointsModal;
