import { useTheme } from "@/context/ThemeContext";

/**
 * Returns the design tokens for the active theme.
 *
 * The active theme is set by the user in Profile > Themes and persisted
 * in AsyncStorage. Free users are locked to the Default theme; Pro users
 * can choose any theme. The ThemeProvider handles loading the saved choice
 * before the first render so there is no flash of wrong theme.
 */
export function useColors() {
  const { colors } = useTheme();
  return colors;
}
