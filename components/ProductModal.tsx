





import React, { useState, useEffect, useMemo } from 'react';
import { Product } from '../types';
import Icon from './Icon';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Omit<Product, 'id'> & { id?: string }) => void;
  productToEdit: Product | null;
  allCategoryPaths: string[];
}

const ProductModal = ({ isOpen, onClose, onSave, productToEdit, allCategoryPaths }: ProductModalProps) => {
  const [name, setName] = useState('');
  const [priceEatIn, setPriceEatIn] = useState('');
  const [priceTakeAway, setPriceTakeAway] = useState('');
  const [vatRateEatIn, setVatRateEatIn] = useState('20');
  const [vatRateTakeAway, setVatRateTakeAway] = useState('20');
  const [category, setCategory] = useState('');
  const [loyaltyPoints, setLoyaltyPoints] = useState('');
  const [pointsToRedeem, setPointsToRedeem] = useState('');
  const [isRedeemable, setIsRedeemable] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setPriceEatIn(productToEdit.priceEatIn.toString());
      setPriceTakeAway(productToEdit.priceTakeAway.toString());
      setVatRateEatIn(productToEdit.vatRateEatIn.toString());
      setVatRateTakeAway(productToEdit.vatRateTakeAway.toString());
      setCategory(productToEdit.category);
      setLoyaltyPoints((productToEdit.loyaltyPoints || '').toString());
      setPointsToRedeem((productToEdit.pointsToRedeem || '').toString());
      setIsRedeemable(productToEdit.isRedeemable || false);
    } else {
      // Reset form for new product
      setName('');
      setPriceEatIn('');
      setPriceTakeAway('');
      setVatRateEatIn('20');
      setVatRateTakeAway('20');
      setCategory('');
      setLoyaltyPoints('');
      setPointsToRedeem('');
      setIsRedeemable(false);
    }
    setError('');
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Allow empty price fields, treating them as 0.
    const priceEatInNum = parseFloat(priceEatIn || '0');
    const priceTakeAwayNum = parseFloat(priceTakeAway || '0');
    
    const vatRateEatInNum = parseFloat(vatRateEatIn);
    const vatRateTakeAwayNum = parseFloat(vatRateTakeAway);
    const loyaltyPointsNum = parseInt(loyaltyPoints || '0', 10);
    const pointsToRedeemNum = parseInt(pointsToRedeem || '0', 10);

    if (!name.trim() || !category.trim() || isNaN(priceEatInNum) || priceEatInNum < 0 || isNaN(priceTakeAwayNum) || priceTakeAwayNum < 0 || isNaN(vatRateEatInNum) || vatRateEatInNum < 0 || isNaN(vatRateTakeAwayNum) || vatRateTakeAwayNum < 0 || isNaN(loyaltyPointsNum) || loyaltyPointsNum < 0 || isNaN(pointsToRedeemNum) || pointsToRedeemNum < 0) {
      setError('Please fill in all fields with valid values. Prices, VAT rates, and points cannot be negative.');
      return;
    }
    
    onSave({
      id: productToEdit?.id,
      name: name.trim(),
      priceEatIn: priceEatInNum,
      priceTakeAway: priceTakeAwayNum,
      vatRateEatIn: vatRateEatInNum,
      vatRateTakeAway: vatRateTakeAwayNum,
      category: category.trim(),
      loyaltyPoints: loyaltyPointsNum > 0 ? loyaltyPointsNum : undefined,
      pointsToRedeem: pointsToRedeemNum > 0 ? pointsToRedeemNum : undefined,
      isRedeemable: isRedeemable,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-bg-panel rounded-lg shadow-2xl p-8 w-full max-w-md text-text-primary" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-accent">{productToEdit ? 'Edit Product' : 'Add New Product'}</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <Icon name="close" className="w-6 h-6" />
          </button>
        </div>
        
        {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-text-secondary">Product Name</label>
            <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-bg-main border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent" required />
          </div>
           <div>
              <label htmlFor="category-path" className="block text-sm font-medium text-text-secondary">Category Path</label>
              <input
                type="text"
                id="category-path"
                list="category-suggestions"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Hot Drinks/Coffee"
                className="mt-1 block w-full px-3 py-2 bg-bg-main border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent"
                required
              />
              <datalist id="category-suggestions">
                {allCategoryPaths.map((path) => (
                  <option key={path} value={path} />
                ))}
              </datalist>
              <p className="text-xs text-text-secondary mt-1">Use / to create sub-categories.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="priceEatIn" className="block text-sm font-medium text-text-secondary">Price (Eat In)</label>
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary">£</span>
                    <input type="number" id="priceEatIn" value={priceEatIn} onChange={e => setPriceEatIn(e.target.value)} step="0.01" min="0" className="pl-7 mt-1 block w-full px-3 py-2 bg-bg-main border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent" />
                </div>
            </div>
             <div>
                <label htmlFor="priceTakeAway" className="block text-sm font-medium text-text-secondary">Price (Take Away)</label>
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary">£</span>
                    <input type="number" id="priceTakeAway" value={priceTakeAway} onChange={e => setPriceTakeAway(e.target.value)} step="0.01" min="0" className="pl-7 mt-1 block w-full px-3 py-2 bg-bg-main border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent" />
                </div>
            </div>
          </div>
           <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="vatRateEatIn" className="block text-sm font-medium text-text-secondary">VAT Rate (Eat In)</label>
                <div className="relative">
                     <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary">%</span>
                    <input type="number" id="vatRateEatIn" value={vatRateEatIn} onChange={e => setVatRateEatIn(e.target.value)} min="0" className="pr-7 mt-1 block w-full px-3 py-2 bg-bg-main border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent" required />
                </div>
            </div>
            <div>
                <label htmlFor="vatRateTakeAway" className="block text-sm font-medium text-text-secondary">VAT Rate (Take Away)</label>
                <div className="relative">
                     <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary">%</span>
                    <input type="number" id="vatRateTakeAway" value={vatRateTakeAway} onChange={e => setVatRateTakeAway(e.target.value)} min="0" className="pr-7 mt-1 block w-full px-3 py-2 bg-bg-main border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent" required />
                </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="loyaltyPoints" className="block text-sm font-medium text-text-secondary">Loyalty Points Awarded</label>
              <input type="number" id="loyaltyPoints" value={loyaltyPoints} onChange={e => setLoyaltyPoints(e.target.value)} min="0" placeholder="e.g., 10" className="mt-1 block w-full px-3 py-2 bg-bg-main border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent" />
            </div>
            <div>
              <label htmlFor="pointsToRedeem" className="block text-sm font-medium text-text-secondary">Points to Redeem</label>
              <input type="number" id="pointsToRedeem" value={pointsToRedeem} onChange={e => setPointsToRedeem(e.target.value)} min="0" placeholder="e.g., 100" className="mt-1 block w-full px-3 py-2 bg-bg-main border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent" />
            </div>
          </div>
           <div className="bg-bg-main p-3 rounded-lg border border-border-color space-y-3">
            <label className="flex items-center gap-3 text-sm font-medium text-text-secondary cursor-pointer pt-2 first:pt-0">
              <input 
                type="checkbox" 
                checked={isRedeemable}
                onChange={(e) => setIsRedeemable(e.target.checked)}
                className="w-4 h-4 rounded bg-bg-main border-border-color text-accent focus:ring-accent"
              />
              <div>
                Eligible for Loyalty Redemption?
                <p className="text-xs text-text-secondary/80 font-normal">If checked, customers can use loyalty points to redeem this item (e.g. Drinks).</p>
              </div>
            </label>
          </div>
          <div className="flex justify-end pt-4">
            <button type="button" onClick={onClose} className="bg-text-secondary text-bg-main font-bold py-2 px-4 rounded-md mr-2 hover:bg-opacity-90">Cancel</button>
            <button type="submit" className="bg-accent text-text-on-accent font-bold py-2 px-4 rounded-md hover:bg-accent-hover">Save Product</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;