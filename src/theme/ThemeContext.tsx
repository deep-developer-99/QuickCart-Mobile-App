import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTheme, lightTheme, type AppTheme } from './themes';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  theme: AppTheme;
  mode: ThemeMode;
  toggleTheme: () => void;
}

const STORAGE_KEY = '@quickcart_theme_mode';
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    let mounted = true;
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (mounted && (saved === 'light' || saved === 'dark')) {
          setMode(saved);
        }
      } catch (error) {
        console.warn('Failed to load theme preference:', error);
      }
    };
    loadTheme();
    return () => {
      mounted = false;
    };
  }, []);

  const toggleTheme = () => {
    setMode(current => {
      const next = current === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(STORAGE_KEY, next).catch(error =>
        console.warn('Failed to save theme preference:', error),
      );
      return next;
    });
  };

  const theme = useMemo(
    () => (mode === 'dark' ? darkTheme : lightTheme),
    [mode],
  );

  return (
    <ThemeContext.Provider value={{ theme, mode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return context;
};
