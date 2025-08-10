import { useState, useEffect, useCallback } from 'react';
import useLocalStorage from './useLocalStorage';

export type Theme = 'theme-midnight-gold' | 'theme-classic-blue' | 'theme-forest-green' | 'theme-crimson-steel' | 'theme-latte-light' | 'theme-volcanic-ash' | 'theme-deep-ocean' | 'theme-corporate-sky' | 'theme-digital-ocean' | 'theme-christmas' | 'theme-halloween' | 'theme-easter' | 'theme-cyber-yellow' | 'theme-petronas-silver' | 'theme-zuri-italia-gold' | 'theme-frosted-glass' | 'theme-rainbow' | 'theme-neon-synthwave' | 'theme-comic-book' | 'theme-intergalactic' | 'theme-miami-vice' | 'theme-frosted-noir' | 'theme-monochrome-matrix';

const THEME_KEY = 'app-theme';
const DEFAULT_THEME: Theme = 'theme-monochrome-matrix';

export function useTheme() {
    const [savedTheme, setSavedTheme] = useLocalStorage<Theme>(THEME_KEY, DEFAULT_THEME);
    const [theme, setThemeState] = useState<Theme>(savedTheme);

    useEffect(() => {
        // Apply the theme to the root element whenever it changes
        const root = document.body;
        root.classList.remove('theme-midnight-gold', 'theme-classic-blue', 'theme-forest-green', 'theme-crimson-steel', 'theme-latte-light', 'theme-volcanic-ash', 'theme-deep-ocean', 'theme-corporate-sky', 'theme-digital-ocean', 'theme-christmas', 'theme-halloween', 'theme-easter', 'theme-cyber-yellow', 'theme-petronas-silver', 'theme-zuri-italia-gold', 'theme-frosted-glass', 'theme-rainbow', 'theme-neon-synthwave', 'theme-comic-book', 'theme-intergalactic', 'theme-miami-vice', 'theme-frosted-noir', 'theme-monochrome-matrix');
        root.classList.add(theme);
    }, [theme]);

    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
        setSavedTheme(newTheme);
    }, [setSavedTheme]);

    return { theme, setTheme };
}