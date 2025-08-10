import React from 'react';
import { PaymentMethod } from '../types';
import Icon from './Icon';
import { triggerHapticFeedback } from '../utils/haptics';

interface ConfirmSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  paymentMethod: PaymentMethod;
  total: number;
}

const ConfirmSaleModal = ({ isOpen, onClose, onConfirm, paymentMethod, total }: ConfirmSaleModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-bg-panel rounded-lg shadow-2xl p-8 w-full max-w-sm text-text-primary" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-accent">Confirm Sale</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary" aria-label="Close">
            <Icon name="close" className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-4 text-center">
            <p className="text-text-secondary">Please confirm the payment details.</p>
            
            <div className="bg-bg-main p-6 rounded-lg border border-border-color">
                <p className="text-lg text-text-secondary">Total Amount</p>
                <p className="text-5xl font-bold text-text-primary my-2">£{total.toFixed(2)}</p>
                
                <div className="mt-4 inline-flex items-center gap-3 bg-bg-panel px-4 py-2 rounded-full">
                    <Icon name={paymentMethod === PaymentMethod.Card ? 'card' : 'cash'} className="w-6 h-6 text-accent"/>
                    <span className="text-lg font-semibold text-text-primary">By {paymentMethod}</span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-8">
            <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback();
                  onClose();
                }}
                className="bg-text-secondary text-bg-main font-bold py-3 px-4 rounded-md hover:bg-opacity-90"
            >
                Cancel
            </button>
            <button
                type="button"
                onClick={() => {
                  triggerHapticFeedback();
                  onConfirm();
                }}
                className="bg-green-600 text-white font-bold py-3 px-4 rounded-md hover:bg-green-700"
            >
                Confirm Sale
            </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmSaleModal;