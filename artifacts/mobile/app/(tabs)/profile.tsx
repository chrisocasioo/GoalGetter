import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { ICON_STORAGE_KEY, THEME_ORDER, THEMES, type ThemeId, useTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";
import { APP_ICONS, type AppIconId, getAppIcon, setAppIcon } from "@/lib/appIcon";
import { useSubscription } from "@/lib/revenuecat";
import {
  useDeleteMyAccount,
  useGetMyProfile,
  useGetMyReferrals,
} from "@workspace/api-client-react";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn, signOut } = useAuth();
  const { themeId, setThemeId } = useTheme();

  const { data: profile } = useGetMyProfile({
    query: { enabled: !!isSignedIn },
  });
  const { data: referralStats } = useGetMyReferrals({
    query: { enabled: !!isSignedIn },
  });
  const deleteAccount = useDeleteMyAccount();
  const [copiedLink, setCopiedLink] = useState(false);
  const [currentIconId, setCurrentIconId] = useState<AppIconId>("default");
  const [settingIcon, setSettingIcon] = useState(false);
  const { isSubscribed: rcSubscribed, expirationDate: rcExpirationDate } = useSubscription();

  // Use server-verified subscription state (from DB/webhook) as primary source,
  // fall back to RC client state for immediate feedback right after purchase
  const serverIsSubscribed = profile?.subscriptionStatus === "pro";
  const isSubscribed = serverIsSubscribed || rcSubscribed;

  useEffect(() => {
    // Load stored icon preference first; fall back to OS-level icon query
    AsyncStorage.getItem(ICON_STORAGE_KEY)
      .then((stored) => {
        if (stored && APP_ICONS.some((i) => i.id === stored)) {
          setCurrentIconId(stored as AppIconId);
        } else {
          return getAppIcon().then(setCurrentIconId);
        }
      })
      .catch(() => getAppIcon().then(setCurrentIconId).catch(() => {}));
  }, []);

  const handleSelectTheme = (id: ThemeId) => {
    if (!isSubscribed && id !== "default") {
      router.push("/paywall");
      return;
    }
    setThemeId(id);
  };

  const handleSelectIcon = async (iconId: AppIconId) => {
    if (!isSubscribed && iconId !== "default") {
      router.push("/paywall");
      return;
    }
    if (iconId === currentIconId) return;
    setSettingIcon(true);
    try {
      const ok = await setAppIcon(iconId);
      if (ok) {
        // Native icon actually changed — update state and persist
        setCurrentIconId(iconId);
        await AsyncStorage.setItem(ICON_STORAGE_KEY, iconId).catch(() => {});
      } else {
        // Native API unavailable (dev/simulator) — save preference for native build
        // but keep the currently-shown icon unchanged in the UI
        await AsyncStorage.setItem(ICON_STORAGE_KEY, iconId).catch(() => {});
        Alert.alert(
          "Preference Saved",
          "Your icon choice is saved and will take effect after installing from the app store.",
        );
      }
    } catch {
      Alert.alert("Error", "Could not change app icon. Please try again.");
    } finally {
      setSettingIcon(false);
    }
  };
  const expirationDate =
    (profile?.subscriptionExpiresAt ? new Date(profile.subscriptionExpiresAt) : null) ??
    rcExpirationDate;

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

  const referralLink = referralStats?.referralLink ?? (
    profile?.referralCode ? `mobile://ref/${profile.referralCode}` : null
  );

  const handleCopyReferral = async () => {
    if (!referralLink) return;
    await Clipboard.setStringAsync(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareReferral = async () => {
    if (!referralLink) return;
    try {
      await Share.share({
        message: `Try GoalGetter — use my link to get a free trial: ${referralLink}`,
        url: referralLink,
      });
    } catch {
    }
  };

  const handleManageSubscription = () => {
    const url =
      Platform.OS === "android"
        ? "https://play.google.com/store/account/subscriptions"
        : "https://apps.apple.com/account/subscriptions";
    Linking.openURL(url).catch(() => {
      Alert.alert("Couldn't Open", "Please manage your subscription through your device settings.");
    });
  };

  const formatExpiry = (date: Date | null) => {
    if (!date) return null;
    return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
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
            style={({ pressed }) => [s.signInButton, pressed && { opacity: 0.8 }]}
            onPress={() => router.push("/(auth)/sign-in")}
          >
            <Text style={s.signInButtonText}>Sign In</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.signUpButton, pressed && { opacity: 0.8 }]}
            onPress={() => router.push("/(auth)/sign-up")}
          >
            <Text style={s.signUpButtonText}>Create Account</Text>
          </Pressable>

          <View style={s.legalRow}>
            <Pressable onPress={() => router.push("/legal/privacy")}>
              <Text style={s.legalLink}>Privacy Policy</Text>
            </Pressable>
            <Text style={s.legalSep}>·</Text>
            <Pressable onPress={() => router.push("/legal/terms")}>
              <Text style={s.legalLink}>Terms of Service</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar */}
      <View style={s.avatarSection}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>
            {(profile?.email?.[0] ?? "?").toUpperCase()}
          </Text>
        </View>
        <Text style={s.email}>{profile?.email ?? "Loading…"}</Text>
        <View style={[s.badge, isSubscribed && s.badgePro]}>
          <Text style={[s.badgeText, isSubscribed && s.badgeTextPro]}>
            {isSubscribed ? "Pro" : "Free"}
          </Text>
        </View>
      </View>

      {/* Subscription section */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Subscription</Text>
        {isSubscribed ? (
          <>
            <View style={s.subCard}>
              <View style={s.subCardLeft}>
                <View style={s.subIconWrap}>
                  <Feather name="award" size={18} color={colors.primaryForeground} />
                </View>
                <View>
                  <Text style={s.subCardTitle}>GoalGetter Pro</Text>
                  {expirationDate && (
                    <Text style={s.subCardRenew}>
                      Renews {formatExpiry(expirationDate)}
                    </Text>
                  )}
                </View>
              </View>
              <View style={s.subActiveBadge}>
                <Text style={s.subActiveBadgeText}>Active</Text>
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [s.menuItem, pressed && { opacity: 0.7 }]}
              onPress={handleManageSubscription}
            >
              <Feather name="settings" size={18} color={colors.foreground} />
              <Text style={s.menuItemText}>Manage Subscription</Text>
              <Feather name="external-link" size={16} color={colors.mutedForeground} />
            </Pressable>
          </>
        ) : (
          <Pressable
            style={({ pressed }) => [s.upgradeCard, pressed && { opacity: 0.85 }]}
            onPress={() => router.push("/paywall")}
          >
            <View style={s.upgradeLeft}>
              <View style={s.upgradeIcon}>
                <Feather name="award" size={20} color={colors.primaryForeground} />
              </View>
              <View style={s.upgradeText}>
                <Text style={s.upgradeTitle}>Upgrade to Pro</Text>
                <Text style={s.upgradeSubtitle}>Unlimited plans · Pro themes · Icons</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={colors.primary} />
          </Pressable>
        )}
      </View>

      {/* Referral */}
      {profile?.referralCode && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Invite a Friend</Text>
          <View style={s.referralCard}>
            <View style={s.referralLinkRow}>
              <Text style={s.referralLinkText} numberOfLines={1} ellipsizeMode="middle">
                {referralLink ?? ""}
              </Text>
              <Pressable
                style={({ pressed }) => [s.referralIconBtn, pressed && { opacity: 0.7 }]}
                onPress={handleCopyReferral}
                accessibilityLabel="Copy referral link"
              >
                <Feather
                  name={copiedLink ? "check" : "copy"}
                  size={16}
                  color={copiedLink ? colors.primary : colors.mutedForeground}
                />
              </Pressable>
            </View>
            <Pressable
              style={({ pressed }) => [s.shareButton, pressed && { opacity: 0.85 }]}
              onPress={handleShareReferral}
            >
              <Feather name="share-2" size={15} color={colors.primaryForeground} />
              <Text style={s.shareButtonText}>Share Link</Text>
            </Pressable>
          </View>
          <Text style={s.referralHint}>
            Earn 1 free month of Pro when a friend subscribes
          </Text>

          {/* Referral history */}
          {referralStats && referralStats.items.length > 0 && (
            <View style={s.referralHistory}>
              <Text style={s.referralHistoryTitle}>Referral History</Text>
              {referralStats.items.map((item) => (
                <View key={item.id} style={s.referralHistoryItem}>
                  <Feather
                    name={item.status === "credited" ? "check-circle" : "clock"}
                    size={14}
                    color={item.status === "credited" ? "#16a34a" : colors.mutedForeground}
                  />
                  <View style={s.referralHistoryText}>
                    {item.status === "credited" ? (
                      <>
                        <Text style={s.referralHistoryLabel}>Earned 1 month Pro</Text>
                        {item.creditedAt && (
                          <Text style={s.referralHistoryDate}>
                            {new Date(item.creditedAt).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </Text>
                        )}
                      </>
                    ) : (
                      <>
                        <Text style={s.referralHistoryLabel}>Waiting for friend to subscribe</Text>
                        <Text style={s.referralHistoryDate}>
                          Referred{" "}
                          {new Date(item.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </Text>
                      </>
                    )}
                  </View>
                  <View
                    style={[
                      s.referralStatusBadge,
                      item.status === "credited" && s.referralStatusBadgeCredited,
                    ]}
                  >
                    <Text
                      style={[
                        s.referralStatusBadgeText,
                        item.status === "credited" && s.referralStatusBadgeTextCredited,
                      ]}
                    >
                      {item.status === "credited" ? "Credited" : "Pending"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Appearance — Themes */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Themes</Text>
        {THEME_ORDER.map((id) => {
          const theme = THEMES[id];
          const isActive = themeId === id;
          const isLocked = !isSubscribed && id !== "default";
          return (
            <Pressable
              key={id}
              style={({ pressed }) => [
                s.themeRow,
                isActive && s.themeRowActive,
                pressed && { opacity: 0.75 },
              ]}
              onPress={() => handleSelectTheme(id)}
              accessibilityLabel={`Apply ${theme.name} theme`}
            >
              <View style={s.themeSwatchGroup}>
                <View style={[s.themeSwatchBig, { backgroundColor: theme.previewBg }]}>
                  <View style={[s.themeSwatchDot, { backgroundColor: theme.previewAccent }]} />
                </View>
              </View>
              <Text style={s.themeRowName}>{theme.name}</Text>
              {isLocked && (
                <View style={s.proLockBadge}>
                  <Text style={s.proLockBadgeText}>Pro</Text>
                </View>
              )}
              {isActive && !isLocked && (
                <Feather name="check-circle" size={16} color={colors.primary} />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Appearance — App Icons */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>App Icon</Text>
        <View style={s.iconGrid}>
          {APP_ICONS.map((icon) => {
            const isActive = currentIconId === icon.id;
            const isLocked = !isSubscribed && icon.id !== "default";
            return (
              <Pressable
                key={icon.id}
                style={({ pressed }) => [
                  s.iconTile,
                  isActive && s.iconTileActive,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => !settingIcon && handleSelectIcon(icon.id)}
                accessibilityLabel={`Select ${icon.name} app icon`}
              >
                <View style={[s.iconPreview, { backgroundColor: icon.bgColor }]}>
                  <View style={[s.iconRing1, { borderColor: icon.accentColor + "80" }]}>
                    <View style={[s.iconRingDot, { backgroundColor: icon.accentColor }]} />
                  </View>
                </View>
                <Text style={s.iconTileName}>{icon.name}</Text>
                {isLocked ? (
                  <View style={s.proLockBadge}>
                    <Text style={s.proLockBadgeText}>Pro</Text>
                  </View>
                ) : isActive ? (
                  <Feather name="check" size={12} color={colors.primary} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
        <Text style={s.iconHint}>
          Icon switching requires a native build via the app stores
        </Text>
      </View>

      {/* Account actions */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Account</Text>
        <Pressable
          style={({ pressed }) => [s.menuItem, pressed && { opacity: 0.7 }]}
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
            pressed && { opacity: 0.7 },
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

      {/* Legal */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Legal</Text>
        <Pressable
          style={({ pressed }) => [s.menuItem, pressed && { opacity: 0.7 }]}
          onPress={() => router.push("/legal/privacy")}
        >
          <Feather name="shield" size={18} color={colors.foreground} />
          <Text style={s.menuItemText}>Privacy Policy</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [s.menuItem, pressed && { opacity: 0.7 }]}
          onPress={() => router.push("/legal/terms")}
        >
          <Feather name="file-text" size={18} color={colors.foreground} />
          <Text style={s.menuItemText}>Terms of Service</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <Text style={s.version}>GoalGetter v1.0</Text>
    </ScrollView>
  );
}

function makeStyles(
  colors: ReturnType<typeof useColors>,
  insets: ReturnType<typeof useSafeAreaInsets>,
) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingTop: 8 },
    unauthContent: {
      flex: 1,
      paddingHorizontal: 28,
      justifyContent: "center",
      alignItems: "center",
      paddingTop: 40,
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
      marginBottom: 28,
    },
    signUpButtonText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: "600" as const,
      fontFamily: "Inter_600SemiBold",
    },
    legalRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    legalLink: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      textDecorationLine: "underline",
    },
    legalSep: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    avatarSection: {
      alignItems: "center",
      paddingVertical: 28,
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
      fontSize: 15,
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
    badgePro: { backgroundColor: colors.primary },
    badgeText: {
      fontSize: 12,
      fontWeight: "600" as const,
      color: colors.primary,
      fontFamily: "Inter_600SemiBold",
    },
    badgeTextPro: { color: colors.primaryForeground },
    section: {
      marginHorizontal: 20,
      marginTop: 24,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: "600" as const,
      color: colors.mutedForeground,
      fontFamily: "Inter_600SemiBold",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    subCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.secondary,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 8,
    },
    subCardLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    subIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    subCardTitle: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    subCardRenew: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 2,
    },
    subActiveBadge: {
      backgroundColor: "#16a34a",
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    subActiveBadgeText: {
      fontSize: 11,
      fontWeight: "600" as const,
      color: "#ffffff",
      fontFamily: "Inter_600SemiBold",
    },
    upgradeCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.secondary,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    upgradeLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    upgradeIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    upgradeText: { flex: 1 },
    upgradeTitle: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.primary,
      fontFamily: "Inter_600SemiBold",
    },
    upgradeSubtitle: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 2,
    },
    referralCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 12,
      marginBottom: 6,
      gap: 10,
    },
    referralLinkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    referralLinkText: {
      flex: 1,
      fontSize: 13,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
    },
    referralIconBtn: {
      padding: 4,
    },
    shareButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 10,
      gap: 6,
    },
    shareButtonText: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.primaryForeground,
      fontFamily: "Inter_600SemiBold",
    },
    referralHint: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 2,
    },
    referralHistory: {
      marginTop: 12,
      gap: 8,
    },
    referralHistoryTitle: {
      fontSize: 11,
      fontWeight: "600" as const,
      color: colors.mutedForeground,
      fontFamily: "Inter_600SemiBold",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 4,
    },
    referralHistoryItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 10,
    },
    referralHistoryText: {
      flex: 1,
    },
    referralHistoryLabel: {
      fontSize: 13,
      color: colors.foreground,
      fontFamily: "Inter_500Medium",
    },
    referralHistoryDate: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 1,
    },
    referralStatusBadge: {
      backgroundColor: colors.muted,
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    referralStatusBadgeCredited: {
      backgroundColor: "#dcfce7",
    },
    referralStatusBadgeText: {
      fontSize: 11,
      fontWeight: "600" as const,
      color: colors.mutedForeground,
      fontFamily: "Inter_600SemiBold",
    },
    referralStatusBadgeTextCredited: {
      color: "#16a34a",
    },
    themeRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 8,
      gap: 12,
    },
    themeRowActive: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    themeSwatchGroup: {
      width: 44,
      height: 44,
      borderRadius: 10,
      overflow: "hidden",
    },
    themeSwatchBig: {
      width: 44,
      height: 44,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    themeSwatchDot: {
      width: 18,
      height: 18,
      borderRadius: 9,
    },
    themeRowName: {
      flex: 1,
      fontSize: 15,
      color: colors.foreground,
      fontFamily: "Inter_500Medium",
    },
    proLockBadge: {
      backgroundColor: colors.primary,
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    proLockBadgeText: {
      fontSize: 11,
      fontWeight: "600" as const,
      color: colors.primaryForeground,
      fontFamily: "Inter_600SemiBold",
    },
    iconGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    iconTile: {
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      minWidth: 70,
    },
    iconTileActive: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    iconPreview: {
      width: 52,
      height: 52,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    iconRing1: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 3,
      alignItems: "center",
      justifyContent: "center",
    },
    iconRingDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    iconTileName: {
      fontSize: 11,
      color: colors.foreground,
      fontFamily: "Inter_500Medium",
    },
    iconHint: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 6,
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
      borderColor: `${colors.destructive}44`,
    },
    menuItemText: {
      flex: 1,
      fontSize: 15,
      color: colors.foreground,
      fontFamily: "Inter_500Medium",
    },
    version: {
      textAlign: "center",
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 32,
    },
  });
}
