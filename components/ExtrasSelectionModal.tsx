
import React, { useMemo } from 'react';
import { Product } from '../types';
import Icon from './Icon';

interface ExtrasSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExtra: (product: Product) => void;
  products: Product[];
}

const ExtrasSelectionModal = ({ isOpen, onClose, onSelectExtra, products }: ExtrasSelectionModalProps) => {
  const extraProducts = useMemo(() => {
    // Case-sensitive check for the EXTRAS category as requested.
    return products.filter(p => p.category === 'EXTRAS').sort((a,b) => a.name.localeCompare(b.name));
  }, [products]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 animate-fade-in-pop" onClick={onClose}>
      <div 
        className="bg-bg-panel rounded-lg shadow-2xl p-6 w-full max-w-3xl text-text-primary flex flex-col h-[70vh]" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="text-2xl font-bold text-accent">Select an Extra</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <Icon name="close" className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-grow overflow-y-auto pr-2 -mr-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {extraProducts.length > 0 ? (
              extraProducts.map(extra => (
                <button
                  key={extra.id}
                  onClick={() => onSelectExtra(extra)}
                  className="bg-bg-main p-4 rounded-lg shadow-md hover:bg-accent hover:text-text-on-accent transition-colors text-left flex flex-col h-28"
                >
                  <p className="font-bold flex-grow">{extra.name}</p>
                  <p className="text-lg font-semibold mt-auto">£{(extra.priceEatIn ?? extra.priceTakeAway ?? 0).toFixed(2)}</p>
                </button>
              ))
            ) : (
              <p className="col-span-full text-center text-text-secondary py-10">No products found in the "EXTRAS" category.</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end flex-shrink-0">
            <button 
              onClick={onClose}
              className="bg-text-secondary text-bg-main font-bold py-2 px-6 rounded-md hover:bg-opacity-90"
            >
                Cancel
            </button>
        </div>
      </div>
    </div>
  );
};

export default ExtrasSelectionModal;
