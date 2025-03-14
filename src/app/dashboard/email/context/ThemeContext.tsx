'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

// Define color palette interface
interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

// Define theme interface
interface Theme {
  colors: ColorPalette;
  borderRadius: string;
  animation: {
    duration: string;
    easing: string;
  };
}

// Theme context interface
interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  theme: Theme;
}

// Create default light theme
const lightTheme: Theme = {
  colors: {
    primary: 'rgb(59, 130, 246)', // blue-500
    secondary: 'rgb(79, 70, 229)', // indigo-600
    accent: 'rgb(147, 51, 234)', // purple-600
    success: 'rgb(34, 197, 94)', // green-500
    warning: 'rgb(245, 158, 11)', // amber-500
    error: 'rgb(239, 68, 68)', // red-500
    info: 'rgb(14, 165, 233)', // sky-500
  },
  borderRadius: '0.5rem',
  animation: {
    duration: '300ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

// Create default dark theme
const darkTheme: Theme = {
  colors: {
    primary: 'rgb(96, 165, 250)', // blue-400
    secondary: 'rgb(129, 140, 248)', // indigo-400
    accent: 'rgb(192, 132, 252)', // purple-400
    success: 'rgb(74, 222, 128)', // green-400
    warning: 'rgb(251, 191, 36)', // amber-400
    error: 'rgb(248, 113, 113)', // red-400
    info: 'rgb(56, 189, 248)', // sky-400
  },
  borderRadius: '0.5rem',
  animation: {
    duration: '300ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

// Create context with default values
const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {},
  theme: lightTheme,
});

// Custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext);

// Theme provider component
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const [theme, setTheme] = useState<Theme>(lightTheme);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Set initial theme
    const initialIsDark = savedTheme ? savedTheme === 'dark' : prefersDark;
    setIsDark(initialIsDark);
    setTheme(initialIsDark ? darkTheme : lightTheme);
    
    // Apply theme to document
    if (initialIsDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Toggle theme function
  const toggleTheme = () => {
    setIsDark(prev => {
      const newIsDark = !prev;
      
      // Update theme
      setTheme(newIsDark ? darkTheme : lightTheme);
      
      // Update document class
      if (newIsDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      // Save preference to localStorage
      localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
      
      return newIsDark;
    });
  };

  // Context value
  const contextValue = {
    isDark,
    toggleTheme,
    theme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider; 