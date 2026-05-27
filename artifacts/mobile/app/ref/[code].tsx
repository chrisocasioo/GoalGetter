import { useRouter, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { useEffect } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useAuth } from "@clerk/expo";

export const REFERRAL_CODE_KEY = "pendingReferralCode";

export default function ReferralDeepLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { isSignedIn } = useAuth();

  useEffect(() => {
    async function handleReferral() {
      if (code) {
        try {
          await SecureStore.setItemAsync(REFERRAL_CODE_KEY, code);
        } catch {
        }
      }

      if (isSignedIn) {
        router.replace("/");
      } else {
        router.replace("/(auth)/sign-up");
      }
    }

    handleReferral();
  }, [code, isSignedIn, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
