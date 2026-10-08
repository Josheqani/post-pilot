import { useState, useEffect } from 'react';

export type ColorMode = 'day' | 'night' | 'auto';

const THEME_STORAGE_KEY = 'postpilot_theme';

export function useTheme() {
  const [colorMode, setColorMode] = useState<ColorMode>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ColorMode | null;
    return saved || 'auto';
  });

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, colorMode);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const isSystemDark = mediaQuery.matches;
    const resolvedMode =
      colorMode === 'auto'
        ? isSystemDark
          ? 'dark'
          : 'light'
        : colorMode === 'night'
          ? 'dark'
          : 'light';

    document.documentElement.setAttribute('data-color-mode', resolvedMode);
    document.documentElement.setAttribute('data-light-theme', 'light');
    document.documentElement.setAttribute('data-dark-theme', 'dark');
    document.documentElement.style.colorScheme = resolvedMode;

    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (colorMode === 'auto') {
        const sysMode = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-color-mode', sysMode);
        document.documentElement.style.colorScheme = sysMode;
      }
    };

    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, [colorMode]);

  const toggleTheme = () => {
    setColorMode((prev) => {
      if (prev === 'night') return 'day';
      if (prev === 'day') return 'night';
      // If currently auto, toggle based on current resolved mode
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return isSystemDark ? 'day' : 'night';
    });
  };

  return {
    colorMode,
    setColorMode,
    toggleTheme,
  };
}
