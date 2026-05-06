import { createContext, useContext, useState } from 'react';

const ThemeContext = createContext({ dark: true, toggle: () => {} });

export const ThemeProvider = ({ children }) => {
  const [dark, setDark] = useState(true);
  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark((d) => !d) }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
