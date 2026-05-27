export type ThemeId = "default" | "midnight" | "ocean" | "forest";

export interface ColorPalette {
  text: string;
  tint: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  isDark: boolean;
  palette: ColorPalette;
  iconName: string;
  previewBg: string;
  previewAccent: string;
}

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  default: {
    id: "default",
    name: "Default",
    isDark: false,
    iconName: "default",
    previewBg: "#f8f9ff",
    previewAccent: "#5b5fc7",
    palette: {
      text: "#0f0a2e",
      tint: "#5b5fc7",
      background: "#f8f9ff",
      foreground: "#0f0a2e",
      card: "#ffffff",
      cardForeground: "#0f0a2e",
      primary: "#5b5fc7",
      primaryForeground: "#ffffff",
      secondary: "#eef0ff",
      secondaryForeground: "#3d3f7d",
      muted: "#eef0ff",
      mutedForeground: "#7c7ea8",
      accent: "#eef0ff",
      accentForeground: "#3d3f7d",
      destructive: "#ef4444",
      destructiveForeground: "#ffffff",
      border: "#e4e6f5",
      input: "#e4e6f5",
    },
  },
  midnight: {
    id: "midnight",
    name: "Midnight",
    isDark: true,
    iconName: "midnight",
    previewBg: "#0d0d1a",
    previewAccent: "#818cf8",
    palette: {
      text: "#e8e9ff",
      tint: "#818cf8",
      background: "#0d0d1a",
      foreground: "#e8e9ff",
      card: "#161628",
      cardForeground: "#e8e9ff",
      primary: "#818cf8",
      primaryForeground: "#0d0d1a",
      secondary: "#1e1e3a",
      secondaryForeground: "#c7c9f8",
      muted: "#1e1e3a",
      mutedForeground: "#7c7ea8",
      accent: "#1e1e3a",
      accentForeground: "#c7c9f8",
      destructive: "#f87171",
      destructiveForeground: "#0d0d1a",
      border: "#2a2a4a",
      input: "#2a2a4a",
    },
  },
  ocean: {
    id: "ocean",
    name: "Ocean",
    isDark: false,
    iconName: "ocean",
    previewBg: "#f0fdfe",
    previewAccent: "#0891b2",
    palette: {
      text: "#083344",
      tint: "#0891b2",
      background: "#f0fdfe",
      foreground: "#083344",
      card: "#ffffff",
      cardForeground: "#083344",
      primary: "#0891b2",
      primaryForeground: "#ffffff",
      secondary: "#cffafe",
      secondaryForeground: "#164e63",
      muted: "#cffafe",
      mutedForeground: "#5b8899",
      accent: "#cffafe",
      accentForeground: "#164e63",
      destructive: "#ef4444",
      destructiveForeground: "#ffffff",
      border: "#a5f3fc",
      input: "#a5f3fc",
    },
  },
  forest: {
    id: "forest",
    name: "Forest",
    isDark: false,
    iconName: "forest",
    previewBg: "#f0fdf4",
    previewAccent: "#16a34a",
    palette: {
      text: "#052e16",
      tint: "#16a34a",
      background: "#f0fdf4",
      foreground: "#052e16",
      card: "#ffffff",
      cardForeground: "#052e16",
      primary: "#16a34a",
      primaryForeground: "#ffffff",
      secondary: "#dcfce7",
      secondaryForeground: "#14532d",
      muted: "#dcfce7",
      mutedForeground: "#4a9a6e",
      accent: "#dcfce7",
      accentForeground: "#14532d",
      destructive: "#ef4444",
      destructiveForeground: "#ffffff",
      border: "#bbf7d0",
      input: "#bbf7d0",
    },
  },
};

export const THEME_ORDER: ThemeId[] = ["default", "midnight", "ocean", "forest"];

export const RADIUS = 12;
