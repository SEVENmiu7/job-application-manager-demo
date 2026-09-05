import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ThemeProvider as NextThemeProvider } from 'next-themes';

export const ACCENT_STORAGE_KEY = 'qz-accent';
export type AccentName = 'original' | 'jade' | 'ocean' | 'indigo' | 'graphite';
export interface AccentOption {
  value: AccentName;
  label: string;
  swatch: string;
}
export const ACCENT_OPTIONS: AccentOption[] = [
  // Before theme support: 4670961, tailwind-theme.css --primary: hsl(182 88% 27%).
  { value: 'original', label: '原版青色', swatch: '#087D81' },
  { value: 'jade', label: '青玉', swatch: '#0F766E' },
  { value: 'ocean', label: '海洋蓝', swatch: '#2563EB' },
  { value: 'indigo', label: '靛蓝', swatch: '#4F46E5' },
  { value: 'graphite', label: '石墨', swatch: '#475569' },
];
interface AccentContextValue {
  accent: AccentName;
  setAccent: (accent: AccentName) => void;
}
const AccentContext = createContext<AccentContextValue | null>(null);
function validAccent(value: string | null): AccentName {
  return (
    ACCENT_OPTIONS.find((option: AccentOption) => option.value === value)
      ?.value || 'original'
  );
}
function readStoredAccent(): AccentName {
  if (typeof document === 'undefined') return 'original';
  const initial: string | null =
    document.documentElement.getAttribute('data-accent');
  if (initial) return validAccent(initial);
  try {
    return validAccent(localStorage.getItem(ACCENT_STORAGE_KEY));
  } catch {
    return 'original';
  }
}
/** next-themes owns mode; this single context owns the independent brand accent. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState] = useState<AccentName>(readStoredAccent);
  const setAccent = useCallback((value: AccentName): void => {
    setAccentState(value);
    document.documentElement.setAttribute('data-accent', value);
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, value);
    } catch {
      /* Session still works. */
    }
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accent);
  }, [accent]);
  useEffect(() => {
    const sync = (event: StorageEvent): void => {
      if (event.key === ACCENT_STORAGE_KEY || event.key === null) {
        const value: AccentName = validAccent(event.newValue);
        setAccentState(value);
        document.documentElement.setAttribute('data-accent', value);
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const value = useMemo(() => ({ accent, setAccent }), [accent, setAccent]);
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      enableColorScheme
      storageKey="qz-theme"
      disableTransitionOnChange
    >
      <AccentContext.Provider value={value}>{children}</AccentContext.Provider>
    </NextThemeProvider>
  );
}
export function useAccent(): AccentContextValue {
  const value = useContext(AccentContext);
  if (!value) throw new Error('useAccent requires ThemeProvider');
  return value;
}


