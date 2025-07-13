import { useState, useEffect } from 'react';

export const useTheme = () => {
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    // Get initial theme from system
    const getInitialTheme = async () => {
      try {
        const systemIsDark = await window.electronAPI.theme.get();
        setIsDark(systemIsDark);
        document.documentElement.setAttribute('data-theme', systemIsDark ? 'dark' : 'light');
      } catch (error) {
        console.error('Failed to get initial theme:', error);
      }
    };

    getInitialTheme();

    // Listen for theme changes
    const handleThemeChange = (systemIsDark: boolean) => {
      setIsDark(systemIsDark);
      document.documentElement.setAttribute('data-theme', systemIsDark ? 'dark' : 'light');
    };

    window.electronAPI.theme.onChange(handleThemeChange);

    return () => {
      window.electronAPI.theme.removeChangeListener();
    };
  }, []);

  return { isDark };
};