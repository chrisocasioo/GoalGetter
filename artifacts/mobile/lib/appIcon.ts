import { Platform } from "react-native";

export type AppIconId = "default" | "midnight" | "ocean" | "forest";

export interface AppIconDefinition {
  id: AppIconId;
  name: string;
  description: string;
  bgColor: string;
  accentColor: string;
}

export const APP_ICONS: AppIconDefinition[] = [
  {
    id: "default",
    name: "Default",
    description: "Classic indigo",
    bgColor: "#5b5fc7",
    accentColor: "#ffffff",
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Deep navy",
    bgColor: "#1a1a2e",
    accentColor: "#818cf8",
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Teal blue",
    bgColor: "#0891b2",
    accentColor: "#ffffff",
  },
  {
    id: "forest",
    name: "Forest",
    description: "Emerald green",
    bgColor: "#16a34a",
    accentColor: "#ffffff",
  },
];

export async function setAppIcon(iconId: AppIconId): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const DynamicAppIcon = await import("expo-dynamic-app-icon");
    if (iconId === "default") {
      await DynamicAppIcon.setAppIcon(null as unknown as string);
    } else {
      await DynamicAppIcon.setAppIcon(iconId);
    }
    return true;
  } catch {
    return false;
  }
}

export async function getAppIcon(): Promise<AppIconId> {
  if (Platform.OS === "web") return "default";
  try {
    const DynamicAppIcon = await import("expo-dynamic-app-icon");
    const current = await DynamicAppIcon.getAppIcon();
    if (current && current in Object.fromEntries(APP_ICONS.map((i) => [i.id, true]))) {
      return current as AppIconId;
    }
    return "default";
  } catch {
    return "default";
  }
}
