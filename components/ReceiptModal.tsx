
import React, { useEffect, useState } from 'react';
import { Sale } from '../types';
import Icon from './Icon';
import ReceiptContent from './ReceiptContent';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onRequestEmail: (sale: Sale) => void;
  onRequestShare: (sale: Sale) => void;
}

const ReceiptModal = ({ isOpen, onClose, sale, onRequestEmail, onRequestShare }: ReceiptModalProps) => {
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (navigator.canShare && sale) {
        setCanShare(navigator.canShare({ text: "Receipt" }));
    } else {
        setCanShare(false);
    }
  }, [isOpen, sale]);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen || !sale) return null;

  return (
    <>
      {/* Modal displayed on screen */}
      <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 print:hidden" aria-modal="true" role="dialog">
        <div className="bg-bg-panel rounded-lg shadow-2xl p-6 w-full max-w-sm flex flex-col" role="document">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-accent">Sale Complete</h2>
            <button onClick={onClose} className="text-text-secondary hover:text-text-primary" aria-label="Close">
              <Icon name="close" className="w-6 h-6" />
            </button>
          </div>

          <div className="overflow-y-auto max-h-[50vh] bg-white rounded-md shadow-inner">
            <ReceiptContent sale={sale} />
          </div>
          
          <div className="mt-6">
            <div className={`grid gap-4 ${canShare ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {canShare && (
                <button
                  onClick={() => onRequestShare(sale)}
                  className="flex flex-col items-center justify-center gap-1 bg-text-secondary text-bg-main font-bold py-3 rounded-lg hover:bg-opacity-90 transition-colors"
                >
                  <Icon name="share" className="w-5 h-5" />
                  <span className="text-xs">Share</span>
                </button>
              )}
               <button 
                onClick={() => onRequestEmail(sale)} 
                className="flex flex-col items-center justify-center gap-1 bg-text-secondary text-bg-main font-bold py-3 rounded-lg hover:bg-opacity-90 transition-colors"
              >
                <Icon name="email" className="w-5 h-5" />
                <span className="text-xs">Email</span>
              </button>
              <button 
                onClick={handlePrint} 
                className="flex flex-col items-center justify-center gap-1 bg-text-secondary text-bg-main font-bold py-3 rounded-lg hover:bg-opacity-90 transition-colors"
              >
                 <Icon name="print" className="w-5 h-5" />
                 <span className="text-xs">Print</span>
              </button>
            </div>
             <button 
              onClick={onClose} 
              className="w-full mt-4 bg-accent text-text-on-accent font-bold py-3 rounded-lg hover:bg-accent-hover transition-colors"
            >
              New Sale
            </button>
          </div>
        </div>
      </div>

      {/* Hidden element that is styled for printing */}
      <div className="print-section">
        <ReceiptContent sale={sale} />
      </div>
    </>
  );
};

export default ReceiptModal;