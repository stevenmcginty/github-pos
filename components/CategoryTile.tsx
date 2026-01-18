import React from 'react';
import Icon from './Icon';
import { triggerHapticFeedback } from '../utils/haptics';

interface CategoryTileProps {
  name: string;
  onClick: () => void;
  color: string;
}

const CategoryTile = ({ name, onClick, color }: CategoryTileProps) => {
  const isCustomItem = name === 'Custom Item';
  const isGiftCard = name.toLowerCase().includes('gift card');
  const iconName = isCustomItem ? 'sparkles' : 'star';
  const contrastTextColor = '#FFFFFF'; // Force white text

  // Logic to provide card color as RGB for themes like Frosted Glass
  const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
      } : { r: 128, g: 128, b: 128 }; // Default gray if parse fails
  };
  const { r, g, b } = hexToRgb(color);

  return (
    <div
      onClick={() => {
        triggerHapticFeedback();
        onClick();
      }}
      aria-label={`Open category ${name}`}
      className="group rounded-xl flex flex-col h-36 cursor-pointer overflow-hidden relative border border-white/10 hover:scale-[1.02] hover:brightness-110 transition-all active:scale-95 shadow-lg"
      style={{
        backgroundColor: color,
        color: contrastTextColor,
        '--card-color-r': r,
        '--card-color-g': g,
        '--card-color-b': b,
        '--comic-outline-color': '#000',
        '--comic-shadow-color': 'rgba(0,0,0,0.7)',
      } as React.CSSProperties}
      data-id={name}
      data-name={name}
      data-type="category"
    >
      {/* Color Indicator Circle - visibility is controlled by theme CSS */}
      <span
        className="color-indicator absolute top-2 left-2 w-4 h-4 rounded-full border-2 border-white/50"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />

      {/* Glass overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

      <div className="flex-grow flex flex-col items-center justify-center p-4 text-center relative z-10">
        {!isCustomItem && (
          <div
            className="drag-handle absolute top-1 right-1 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: contrastTextColor }}
            title={`Reorder ${name}`}
          >
            <Icon name="dragHandle" className="w-4 h-4" />
          </div>
        )}

        {(isCustomItem || isGiftCard) && (
            <Icon name={iconName} className="w-10 h-10 mb-2 drop-shadow-lg" style={{ color: contrastTextColor }} />
        )}

        <h3 className="font-black italic uppercase tracking-tight text-xl drop-shadow-md">{name}</h3>
      </div>
    </div>
  );
};

export default CategoryTile;