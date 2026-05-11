import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({ dark: true, toggle: () => {} });

export const ThemeProvider = ({ children }) => {
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem('digibank_theme');
      return saved ? saved === 'dark' : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    try {
      localStorage.setItem('digibank_theme', dark ? 'dark' : 'light');
    } catch { /* silent */ }
  }, [dark]);

  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark((d) => !d) }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
