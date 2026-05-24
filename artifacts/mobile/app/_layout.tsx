import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { ClerkProvider, type TokenCache } from "@clerk/expo";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthSync } from "@/context/AuthContext";
import { setBaseUrl } from "@workspace/api-client-react";

// Configure API base URL — must be done outside any component
setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);

// Clerk publishable key and optional proxy URL (empty in dev, auto-set in prod)
const clerkPubKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const clerkProxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL ?? "";

// Token cache using expo-secure-store
const tokenCache: TokenCache = {
  async getToken(key: string) {
    return SecureStore.getItemAsync(key);
  },
  async saveToken(key: string, value: string) {
    return SecureStore.setItemAsync(key, value);
  },
  async clearToken(key: string) {
    return SecureStore.deleteItemAsync(key);
  },
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen
        name="plan/[id]"
        options={{ title: "Plan", headerBackTitle: "Back" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      tokenCache={tokenCache}
      {...(clerkProxyUrl ? { proxyUrl: clerkProxyUrl } : {})}
    >
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView>
              <KeyboardProvider>
                <AuthSync />
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}
