import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  useDeleteMyAccount,
  useGetMyProfile,
} from "@workspace/api-client-react";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn, signOut } = useAuth();

  const { data: profile } = useGetMyProfile({ query: { enabled: !!isSignedIn } });
  const deleteAccount = useDeleteMyAccount();
  const [copiedCode, setCopiedCode] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all your plans. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount.mutateAsync();
              await signOut();
            } catch {
              Alert.alert("Error", "Could not delete your account. Please try again.");
            }
          },
        },
      ],
    );
  };

  const handleCopyReferral = () => {
    if (profile?.referralCode) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const s = makeStyles(colors, insets);

  if (!isSignedIn) {
    return (
      <View style={s.container}>
        <View style={s.unauthContent}>
          <View style={s.unauthIcon}>
            <Feather name="user" size={36} color={colors.mutedForeground} />
          </View>
          <Text style={s.unauthTitle}>Sign in to sync your plans</Text>
          <Text style={s.unauthSubtitle}>
            Save unlimited plans across devices and unlock Pro features
          </Text>
          <Pressable
            style={({ pressed }) => [s.signInButton, pressed && s.buttonPressed]}
            onPress={() => router.push("/(auth)/sign-in")}
          >
            <Text style={s.signInButtonText}>Sign In</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.signUpButton, pressed && s.buttonPressed]}
            onPress={() => router.push("/(auth)/sign-up")}
          >
            <Text style={s.signUpButtonText}>Create Account</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.avatarSection}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>
            {(profile?.email?.[0] ?? "?").toUpperCase()}
          </Text>
        </View>
        <Text style={s.email}>{profile?.email ?? "Loading…"}</Text>
        <View style={s.badge}>
          <Text style={s.badgeText}>
            {profile?.subscriptionStatus === "pro" ? "Pro" : "Free"}
          </Text>
        </View>
      </View>

      {profile?.referralCode && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Referral Code</Text>
          <Pressable style={s.referralCard} onPress={handleCopyReferral}>
            <Text style={s.referralCode}>{profile.referralCode}</Text>
            <Feather
              name={copiedCode ? "check" : "copy"}
              size={16}
              color={copiedCode ? colors.primary : colors.mutedForeground}
            />
          </Pressable>
          <Text style={s.referralHint}>
            Share your code to earn free plans for you and a friend
          </Text>
        </View>
      )}

      <View style={s.section}>
        <Text style={s.sectionTitle}>Account</Text>
        <Pressable
          style={({ pressed }) => [s.menuItem, pressed && s.menuItemPressed]}
          onPress={handleSignOut}
        >
          <Feather name="log-out" size={18} color={colors.foreground} />
          <Text style={s.menuItemText}>Sign Out</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            s.menuItem,
            s.menuItemDanger,
            pressed && s.menuItemPressed,
          ]}
          onPress={handleDeleteAccount}
        >
          <Feather name="trash-2" size={18} color={colors.destructive} />
          <Text style={[s.menuItemText, { color: colors.destructive }]}>
            Delete Account
          </Text>
          <Feather name="chevron-right" size={16} color={colors.destructive} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

function makeStyles(
  colors: ReturnType<typeof useColors>,
  insets: ReturnType<typeof useSafeAreaInsets>,
) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingBottom: insets.bottom + 24,
    },
    unauthContent: {
      flex: 1,
      paddingHorizontal: 28,
      justifyContent: "center",
      alignItems: "center",
      paddingBottom: insets.bottom + 40,
    },
    unauthIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    unauthTitle: {
      fontSize: 22,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
      textAlign: "center",
      marginBottom: 8,
    },
    unauthSubtitle: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      marginBottom: 32,
      lineHeight: 20,
    },
    signInButton: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 15,
      width: "100%",
      alignItems: "center",
      marginBottom: 12,
    },
    signInButtonText: {
      color: colors.primaryForeground,
      fontSize: 16,
      fontWeight: "600" as const,
      fontFamily: "Inter_600SemiBold",
    },
    signUpButton: {
      backgroundColor: colors.secondary,
      borderRadius: colors.radius,
      paddingVertical: 15,
      width: "100%",
      alignItems: "center",
    },
    signUpButtonText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: "600" as const,
      fontFamily: "Inter_600SemiBold",
    },
    buttonPressed: {
      opacity: 0.8,
    },
    avatarSection: {
      alignItems: "center",
      paddingTop: 32,
      paddingBottom: 24,
      paddingHorizontal: 24,
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    avatarText: {
      fontSize: 28,
      fontWeight: "700" as const,
      color: colors.primaryForeground,
      fontFamily: "Inter_700Bold",
    },
    email: {
      fontSize: 16,
      color: colors.foreground,
      fontFamily: "Inter_500Medium",
      marginBottom: 8,
    },
    badge: {
      backgroundColor: colors.secondary,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 4,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: "600" as const,
      color: colors.primary,
      fontFamily: "Inter_600SemiBold",
    },
    section: {
      marginHorizontal: 20,
      marginTop: 24,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: "600" as const,
      color: colors.mutedForeground,
      fontFamily: "Inter_600SemiBold",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 10,
      paddingHorizontal: 4,
    },
    referralCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 8,
    },
    referralCode: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.primary,
      fontFamily: "Inter_700Bold",
      letterSpacing: 2,
    },
    referralHint: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      paddingHorizontal: 4,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 8,
      gap: 12,
    },
    menuItemDanger: {
      borderColor: colors.destructive + "33",
    },
    menuItemPressed: {
      opacity: 0.7,
    },
    menuItemText: {
      flex: 1,
      fontSize: 15,
      color: colors.foreground,
      fontFamily: "Inter_500Medium",
    },
  });
}
