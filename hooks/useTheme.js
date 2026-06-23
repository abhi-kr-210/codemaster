import { useEffect, useState } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('cm-theme') : null;
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cm-theme', theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return { theme, toggle, isDark: theme === 'dark' };
}
