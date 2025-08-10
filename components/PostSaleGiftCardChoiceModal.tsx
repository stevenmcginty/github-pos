import React from 'react';
import Icon from './Icon';

interface PostSaleGiftCardChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  giftCardValue: number;
  onApplyToCustomer: () => void;
  onCreateShareable: () => void;
}

const PostSaleGiftCardChoiceModal = ({ isOpen, onClose, giftCardValue, onApplyToCustomer, onCreateShareable }: PostSaleGiftCardChoiceModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 animate-fade-in-pop" onClick={onClose}>
      <div className="bg-bg-panel rounded-lg shadow-2xl p-8 w-full max-w-lg text-text-primary" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-accent">Gift Card Purchase Complete</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <Icon name="close" className="w-6 h-6" />
          </button>
        </div>
        
        <div className="text-center my-6">
            <p className="text-lg text-text-secondary">You have sold a gift card with a value of:</p>
            <p className="text-6xl font-bold text-text-primary my-2">£{giftCardValue.toFixed(2)}</p>
            <p className="text-lg text-text-secondary">What would you like to do with this balance?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <button
                onClick={onApplyToCustomer}
                className="flex flex-col items-center justify-center text-center gap-3 bg-blue-600 text-white font-bold p-6 rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
            >
                <Icon name="users" className="w-10 h-10" />
                <span className="text-lg">Apply to Customer Account</span>
                <span className="text-sm font-normal opacity-80">Top-up an existing loyalty member's balance.</span>
            </button>
            <button
                onClick={onCreateShareable}
                className="flex flex-col items-center justify-center text-center gap-3 bg-green-600 text-white font-bold p-6 rounded-lg hover:bg-green-700 transition-colors shadow-lg"
            >
                <Icon name="share" className="w-10 h-10" />
                <span className="text-lg">Create Shareable Gift Card</span>
                <span className="text-sm font-normal opacity-80">Generate a digital card to be given as a gift.</span>
            </button>
        </div>

        <div className="mt-8 text-center">
            <button onClick={onClose} className="text-text-secondary hover:underline">
                Skip for now
            </button>
        </div>
      </div>
    </div>
  );
};

export default PostSaleGiftCardChoiceModal;
