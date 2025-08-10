import React from 'react';
import { useTheme, Theme } from '../../hooks/useTheme';
import Icon from '../Icon';

const themes: { id: Theme; name: string; colors: string[] }[] = [
  { 
    id: 'theme-monochrome-matrix', 
    name: 'Monochrome Matrix', 
    colors: ['#010101', 'rgba(20, 20, 22, 0.6)', '#00E599', '#EAEAEA'] 
  },
  { 
    id: 'theme-frosted-noir', 
    name: 'Frosted Noir', 
    colors: ['#0A0A0B', 'rgba(30, 30, 32, 0.5)', '#00E599', '#F0F0F0'] 
  },
  { 
    id: 'theme-miami-vice', 
    name: 'Miami Vice', 
    colors: ['#1a0a2b', '#3a1a4b', '#ff007f', '#00e5e5'] 
  },
  { 
    id: 'theme-intergalactic', 
    name: 'Intergalactic', 
    colors: ['#05040f', 'rgba(18, 11, 48, 0.6)', '#00ffff', '#e0e0ff'] 
  },
  { 
    id: 'theme-comic-book', 
    name: 'Comic Book', 
    colors: ['#f5f1e8', '#ffffff', '#ffeb3b', '#000000'] 
  },
  { 
    id: 'theme-neon-synthwave', 
    name: 'Neon Synthwave', 
    colors: ['#0c0c2c', '#1a1a3a', '#ff00ff', '#e0e0ff'] 
  },
  { 
    id: 'theme-frosted-glass', 
    name: 'Frosted Glass', 
    colors: ['#0d1117', '#1e293b', '#00f2ea', '#e6f1ff'] 
  },
  { 
    id: 'theme-midnight-gold', 
    name: 'Midnight Gold', 
    colors: ['#121212', '#1F1F1F', '#E0C56E', '#FFFFFF'] 
  },
  { 
    id: 'theme-classic-blue', 
    name: 'Classic Blue', 
    colors: ['#f1f5f9', '#ffffff', '#3b82f6', '#1e293b'] 
  },
  {
    id: 'theme-forest-green',
    name: 'Forest Green',
    colors: ['#1a2a24', '#2d3c36', '#4ade80', '#e0e6e3']
  },
  {
    id: 'theme-crimson-steel',
    name: 'Crimson Steel',
    colors: ['#1f2937', '#374151', '#dc2626', '#f3f4f6']
  },
  {
    id: 'theme-latte-light',
    name: 'Latte Light',
    colors: ['#fdfbf7', '#ffffff', '#a16207', '#44403c']
  },
  {
    id: 'theme-volcanic-ash',
    name: 'Volcanic Ash',
    colors: ['#1c1c1e', '#2c2c2e', '#ff3b30', '#ffffff']
  },
  {
    id: 'theme-deep-ocean',
    name: 'Deep Ocean',
    colors: ['#001f3f', '#002b55', '#7fdbff', '#f0f8ff']
  },
  {
    id: 'theme-corporate-sky',
    name: 'Corporate Sky',
    colors: ['#eef2f9', '#ffffff', '#0052cc', '#172b4d']
  },
  {
    id: 'theme-digital-ocean',
    name: 'Digital Ocean',
    colors: ['#f0f8ff', '#ffffff', '#007bff', '#212529']
  },
  {
    id: 'theme-cyber-yellow',
    name: 'Cyber Yellow',
    colors: ['#0d0d0d', '#1a1a1a', '#facc15', '#f5f5f5']
  },
  {
    id: 'theme-petronas-silver',
    name: 'Petronas Silver',
    colors: ['#181818', '#282828', '#00d2be', '#f5f5f5']
  },
  {
    id: 'theme-zuri-italia-gold',
    name: 'Zuri Italia Gold',
    colors: ['#001f3f', '#002b55', '#E0C56E', '#F0EAD6']
  },
  { 
    id: 'theme-rainbow', 
    name: 'Rainbow', 
    colors: ['#1a1a1d', '#2c2c34', '#ff4757', '#f0f0f5'] 
  },
  {
    id: 'theme-christmas',
    name: 'Christmas',
    colors: ['#0a192f', '#172a45', '#e44d4d', '#e6f1ff']
  },
  {
    id: 'theme-halloween',
    name: 'Halloween',
    colors: ['#120121', '#240d3a', '#ff7900', '#f8f8f8']
  },
  {
    id: 'theme-easter',
    name: 'Easter',
    colors: ['#fffbeb', '#ffffff', '#a7f3d0', '#524e45']
  }
];

const ThemeCard = ({ themeInfo, currentTheme, onSelect }: { themeInfo: typeof themes[0], currentTheme: Theme, onSelect: (theme: Theme) => void }) => {
    const isSelected = themeInfo.id === currentTheme;
    return (
        <button
            onClick={() => onSelect(themeInfo.id)}
            className={`p-4 rounded-lg border-4 transition-all duration-300 ${isSelected ? 'border-accent shadow-2xl scale-105' : 'border-transparent hover:border-gray-300'}`}
            style={{ backgroundColor: themeInfo.colors[1] }}
        >
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold" style={{ color: themeInfo.colors[3] }}>{themeInfo.name}</h3>
                {isSelected && <Icon name="checkCircle" className="w-6 h-6 text-accent" />}
            </div>
            <div className="flex h-16 rounded-md overflow-hidden shadow-inner">
                {themeInfo.colors.map(color => (
                    <div key={color} className="w-1/4 h-full" style={{ backgroundColor: color }} />
                ))}
            </div>
        </button>
    );
};

const ThemeCustomizerReport = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-6 bg-gray-100 min-h-full text-gray-800">
      <h2 className="text-3xl font-bold text-brand-primary mb-2">Theme Customizer</h2>
      <p className="text-gray-600 mb-6 max-w-4xl">
        Select a color scheme for the application. Your choice will be saved on this device.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {themes.map(themeInfo => (
          <ThemeCard 
            key={themeInfo.id}
            themeInfo={themeInfo}
            currentTheme={theme}
            onSelect={setTheme}
          />
        ))}
      </div>
    </div>
  );
};

export default ThemeCustomizerReport;