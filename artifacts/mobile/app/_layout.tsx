import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { ClerkProvider, useAuth, useUser, type TokenCache } from "@clerk/expo";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Alert } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import Purchases from "react-native-purchases";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthSync } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { initializeRevenueCat, SubscriptionProvider } from "@/lib/revenuecat";
import { setBaseUrl } from "@workspace/api-client-react";

setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);

try {
  initializeRevenueCat();
} catch (err: any) {
  Alert.alert("RevenueCat Unavailable", err?.message ?? "Unknown error");
}

const clerkPubKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const clerkProxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL ?? "";

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

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RevenueCatAuth() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (isSignedIn && user?.id) {
      Purchases.logIn(user.id).catch(() => {});
    } else if (!isSignedIn) {
      Purchases.logOut().catch(() => {});
    }
  }, [isSignedIn, user?.id]);

  return null;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen
        name="plan/[id]"
        options={{ title: "Plan", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="paywall"
        options={{ title: "GoalGetter Pro", headerShown: false }}
      />
      <Stack.Screen
        name="ref/[code]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="legal/privacy"
        options={{ title: "Privacy Policy", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="legal/terms"
        options={{ title: "Terms of Service", headerBackTitle: "Back" }}
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
          <ThemeProvider>
            <QueryClientProvider client={queryClient}>
              <SubscriptionProvider>
                <GestureHandlerRootView>
                  <KeyboardProvider>
                    <AuthSync />
                    <RevenueCatAuth />
                    <RootLayoutNav />
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </SubscriptionProvider>
            </QueryClientProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}
