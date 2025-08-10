

import React from 'react';
import Icon from './Icon';
import { triggerHapticFeedback } from '../utils/haptics';

interface BreadcrumbProps {
  path: string[];
  onNavigate: (newPath: string[]) => void;
}

const Breadcrumb = ({ path, onNavigate }: BreadcrumbProps) => {
  const handleNavigate = (index: number) => {
    triggerHapticFeedback();
    onNavigate(path.slice(0, index));
  };

  return (
    <nav className="flex items-center text-sm font-medium text-text-secondary bg-bg-panel p-1.5 rounded-lg shadow-inner" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1">
        <li>
          <button 
            onClick={() => handleNavigate(0)} 
            className="flex items-center gap-2 px-3 py-1 bg-accent text-text-on-accent font-bold rounded-md hover:bg-accent-hover transition-colors"
          >
            <Icon name="home" className="w-4 h-4" />
            <span>Home</span>
          </button>
        </li>
        {path.map((name, index) => (
          <li key={name}>
            <div className="flex items-center">
              <Icon name="chevronRight" className="w-5 h-5 text-text-secondary/50" />
              <button
                onClick={() => handleNavigate(index + 1)}
                className="ml-1 px-3 py-1 rounded-md text-text-primary hover:bg-bg-main transition-colors"
                aria-current={index === path.length - 1 ? 'page' : undefined}
              >
                {name}
              </button>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumb;