import React from 'react';
import Icon from './Icon';

interface ConfirmActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  confirmIcon?: 'trash' | 'checkCircle';
  confirmColor?: string;
}

const ConfirmActionModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  confirmIcon = 'checkCircle',
  confirmColor = 'bg-green-600 hover:bg-green-700',
}: ConfirmActionModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-bg-panel rounded-lg shadow-2xl p-8 w-full max-w-md text-text-primary" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-accent">{title}</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary" aria-label="Close">
            <Icon name="close" className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-4">
            {description}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-8">
            <button
                type="button"
                onClick={onClose}
                className="bg-text-secondary text-bg-main font-bold py-3 px-4 rounded-md hover:bg-opacity-90"
            >
                Cancel
            </button>
            <button
                type="button"
                onClick={onConfirm}
                className={`text-white font-bold py-3 px-4 rounded-md flex items-center justify-center gap-2 ${confirmColor}`}
            >
                <Icon name={confirmIcon} className="w-5 h-5" />
                {confirmText}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmActionModal;
