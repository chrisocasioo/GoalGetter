import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { RADIUS, THEME_ORDER, THEMES, type ColorPalette, type ThemeId } from "@/constants/themes";

const THEME_STORAGE_KEY = "@goalgetter/theme";

interface ThemeContextValue {
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => Promise<void>;
  colors: ColorPalette & { radius: number };
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeId: "default",
  setThemeId: async () => {},
  colors: { ...THEMES.default.palette, radius: RADIUS },
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>("default");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (stored && stored in THEMES) {
          setThemeIdState(stored as ThemeId);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const setThemeId = useCallback(async (id: ThemeId) => {
    setThemeIdState(id);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {}
  }, []);

  const theme = THEMES[themeId];
  const colors = { ...theme.palette, radius: RADIUS };

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ themeId, setThemeId, colors, isDark: theme.isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export { THEME_ORDER, THEMES, type ThemeId };
