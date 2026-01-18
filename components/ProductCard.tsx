import React from 'react';
import { Product, OrderType } from '../types';
import Icon from './Icon';
import { triggerHapticFeedback } from '../utils/haptics';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  orderType: OrderType;
}

const letterColors = [
  "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e", "#10b981", "#14b8a6", 
  "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef", "#ec4899"
];

const getProductColor = (name: string): string => {
  if (!name) return "#64748b"; // slate-500 as a default
  const letterCode = name.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
  if (letterCode < 0 || letterCode > 25) return "#64748b"; // Handle non-alpha characters
  return letterColors[letterCode % letterColors.length];
};

const ProductCard = ({ product, onAddToCart, orderType }: ProductCardProps) => {
  const isEatInActive = orderType === OrderType.EatIn;
  const cardColor = getProductColor(product.name);
  const contrastTextColor = '#FFFFFF'; // Force white text as requested previously

  // Logic to provide card color as RGB for themes like Frosted Glass
  const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
      } : { r: 128, g: 128, b: 128 }; // Default gray if parse fails
  };
  const { r, g, b } = hexToRgb(cardColor);

  return (
    <div
      onClick={() => {
        triggerHapticFeedback();
        onAddToCart(product);
      }}
      aria-label={`Add ${product.name} to cart`}
      className="group rounded-xl flex flex-col h-36 cursor-pointer overflow-hidden relative border border-white/10 hover:scale-[1.02] hover:brightness-110 transition-all active:scale-95 shadow-lg"
      style={{
        backgroundColor: cardColor,
        color: contrastTextColor,
        '--card-color-r': r,
        '--card-color-g': g,
        '--card-color-b': b,
        '--comic-outline-color': '#000',
        '--comic-shadow-color': 'rgba(0,0,0,0.7)',
      } as React.CSSProperties}
      data-id={product.id}
      data-type="product"
    >
      {/* Color Indicator Circle - visibility is controlled by theme CSS */}
      <span
        className="color-indicator absolute top-2 left-2 w-4 h-4 rounded-full border-2 border-white/50"
        style={{ backgroundColor: cardColor }}
        aria-hidden="true"
      />

      {/* Glass overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

      <div className="flex-grow flex flex-col relative z-10">
        <div
            className="drag-handle absolute top-1 right-1 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: contrastTextColor }}
            title={`Reorder ${product.name}`}
        >
            <Icon name="dragHandle" className="w-4 h-4" />
        </div>

        {/* Product Name */}
        <div className="p-3 pl-8 flex-grow flex items-center">
          <h3 className="font-black uppercase tracking-tight text-base leading-tight drop-shadow-md">{product.name}</h3>
        </div>

        {/* Price Section */}
        <div className="p-3 price-section bg-black/20 backdrop-blur-sm" style={{ borderTop: `1px solid rgba(255, 255, 255, 0.1)`}}>
          <div className="flex justify-between items-center text-sm">
            <span className={`font-bold uppercase text-[10px] tracking-widest transition-colors ${isEatInActive ? '' : 'opacity-50'}`}>Eat In</span>
            <span className={`font-mono font-black transition-colors ${isEatInActive ? '' : 'opacity-50'}`}>£{(product.priceEatIn ?? 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-sm mt-1">
            <span className={`font-bold uppercase text-[10px] tracking-widest transition-colors ${!isEatInActive ? '' : 'opacity-50'}`}>Take Away</span>
            <span className={`font-mono font-black transition-colors ${!isEatInActive ? '' : 'opacity-50'}`}>£{(product.priceTakeAway ?? 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;