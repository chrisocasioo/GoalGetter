import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";
import { getGetMyProfileQueryKey } from "@workspace/api-client-react";

const PRO_FEATURES = [
  { icon: "zap" as const, text: "Unlimited goal plans" },
  { icon: "layers" as const, text: "Infinite step drill-down" },
  { icon: "droplet" as const, text: "Exclusive Pro themes" },
  { icon: "image" as const, text: "Custom app icons" },
  { icon: "smartphone" as const, text: "Sync across all devices" },
];

export default function PaywallScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { offerings, purchase, restore, isPurchasing, isRestoring, isSubscribed } =
    useSubscription();

  const [selectedIndex, setSelectedIndex] = useState(0); // default to annual (best value)
  const [confirmPkg, setConfirmPkg] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentOffering = offerings?.current;
  const packages = currentOffering?.availablePackages ?? [];

  // Order: annual first (best value), monthly second — but display annual as index 1
  const monthlyPkg = packages.find((p) => p.packageType === "MONTHLY") ?? packages[0];
  const annualPkg = packages.find((p) => p.packageType === "ANNUAL") ?? packages[1];
  const orderedPkgs = [annualPkg, monthlyPkg].filter(Boolean);

  const selectedPkg = orderedPkgs[selectedIndex] ?? orderedPkgs[0];

  const handleSubscribe = () => {
    if (!selectedPkg) return;
    setErrorMsg(null);
    if (__DEV__) {
      setConfirmPkg(selectedPkg);
    } else {
      doPurchase(selectedPkg);
    }
  };

  const doPurchase = async (pkg: any) => {
    setConfirmPkg(null);
    try {
      await purchase(pkg);
      // Call backend sync endpoint — it verifies entitlement server-to-server with
      // RevenueCat and updates the DB immediately so plan-generation gating reflects
      // Pro status without waiting for webhook delivery.
      try {
        const token = await getToken();
        if (token) {
          await fetch(
            `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/subscription/sync`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            },
          );
        }
      } catch {
        // Non-fatal — webhook will update DB if sync fails
      }
      queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
      router.back();
    } catch (err: any) {
      if (err?.userCancelled) return;
      setErrorMsg(err?.message ?? "Purchase failed. Please try again.");
    }
  };

  const handleRestore = async () => {
    setErrorMsg(null);
    try {
      await restore();
      if (isSubscribed) router.back();
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Restore failed. Please try again.");
    }
  };

  const formatAnnualSavings = () => {
    if (!monthlyPkg || !annualPkg) return null;
    const monthlyPrice = monthlyPkg.product.price;
    const annualPrice = annualPkg.product.price;
    if (!monthlyPrice || !annualPrice) return null;
    const monthlyAnnual = monthlyPrice * 12;
    const savings = Math.round(((monthlyAnnual - annualPrice) / monthlyAnnual) * 100);
    return savings > 0 ? `Save ${savings}%` : null;
  };

  const savings = formatAnnualSavings();
  const s = makeStyles(colors, insets);

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Pressable
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}
          onPress={() => router.back()}
        >
          <Feather name="x" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={s.headerTitle}>GoalGetter Pro</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero badge */}
        <View style={s.heroBadge}>
          <Feather name="award" size={36} color={colors.primaryForeground} />
        </View>
        <Text style={s.heroTitle}>Unlock Your Full Potential</Text>
        <Text style={s.heroSubtitle}>
          Everything you need to crush any goal, without limits.
        </Text>

        {/* Feature list */}
        <View style={s.featureList}>
          {PRO_FEATURES.map((f) => (
            <View key={f.text} style={s.featureRow}>
              <View style={s.featureIconWrap}>
                <Feather name={f.icon} size={16} color={colors.primary} />
              </View>
              <Text style={s.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Pricing cards */}
        {packages.length === 0 ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
        ) : (
          <View style={s.pricingSection}>
            {orderedPkgs.map((pkg, idx) => {
              const isAnnual = pkg.packageType === "ANNUAL";
              const isSelected = selectedIndex === idx;
              return (
                <Pressable
                  key={pkg.identifier}
                  style={({ pressed }) => [
                    s.priceCard,
                    isSelected && s.priceCardSelected,
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={() => setSelectedIndex(idx)}
                >
                  {isAnnual && savings && (
                    <View style={s.savingsBadge}>
                      <Text style={s.savingsBadgeText}>{savings}</Text>
                    </View>
                  )}
                  <View style={s.radioOuter}>
                    {isSelected && <View style={s.radioInner} />}
                  </View>
                  <View style={s.priceCardBody}>
                    <Text style={s.priceCardTitle}>
                      {isAnnual ? "Annual" : "Monthly"}
                    </Text>
                    <Text style={s.priceCardDetail}>
                      {pkg.product.priceString}
                      {isAnnual ? " / year" : " / month"}
                    </Text>
                    {isAnnual && monthlyPkg && (
                      <Text style={s.perMonth}>
                        Just{" "}
                        {pkg.product.currencyCode}
                        {(pkg.product.price / 12).toFixed(2)}/mo
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Error */}
        {errorMsg && <Text style={s.errorText}>{errorMsg}</Text>}

        {/* Subscribe button */}
        <Pressable
          style={({ pressed }) => [
            s.subscribeBtn,
            (isPurchasing || isRestoring) && { opacity: 0.6 },
            pressed && { opacity: 0.8 },
          ]}
          onPress={handleSubscribe}
          disabled={isPurchasing || isRestoring || !selectedPkg}
        >
          {isPurchasing ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={s.subscribeBtnText}>
              Subscribe · {selectedPkg?.product.priceString ?? "…"}
            </Text>
          )}
        </Pressable>

        {/* Restore */}
        <Pressable
          style={({ pressed }) => [s.restoreBtn, pressed && { opacity: 0.6 }]}
          onPress={handleRestore}
          disabled={isRestoring || isPurchasing}
        >
          {isRestoring ? (
            <ActivityIndicator size="small" color={colors.mutedForeground} />
          ) : (
            <Text style={s.restoreBtnText}>Restore Purchases</Text>
          )}
        </Pressable>

        <Text style={s.legal}>
          Payment will be charged to your {Platform.OS === "android" ? "Google Play" : "App Store"} account.
          Subscription auto-renews unless cancelled at least 24 hours before the renewal date.
          You can manage or cancel subscriptions in your account settings.
        </Text>
      </ScrollView>

      {/* Test-mode confirmation modal (never show in production) */}
      <Modal
        visible={!!confirmPkg}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmPkg(null)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setConfirmPkg(null)}>
          <Pressable style={s.modalCard} onPress={() => {}}>
            <Text style={s.modalTitle}>Test Purchase</Text>
            <Text style={s.modalBody}>
              You are in test mode. This will simulate a purchase of{" "}
              <Text style={{ fontFamily: "Inter_600SemiBold" }}>
                {confirmPkg?.product.title ?? confirmPkg?.identifier}
              </Text>{" "}
              at{" "}
              <Text style={{ fontFamily: "Inter_600SemiBold" }}>
                {confirmPkg?.product.priceString}
              </Text>
              .{"\n\n"}No real payment will occur.
            </Text>
            <View style={s.modalActions}>
              <Pressable
                style={({ pressed }) => [s.modalCancel, pressed && { opacity: 0.7 }]}
                onPress={() => setConfirmPkg(null)}
              >
                <Text style={s.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [s.modalConfirm, pressed && { opacity: 0.7 }]}
                onPress={() => doPurchase(confirmPkg)}
              >
                <Text style={s.modalConfirmText}>Confirm Purchase</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function makeStyles(
  colors: ReturnType<typeof useColors>,
  insets: ReturnType<typeof useSafeAreaInsets>,
) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: insets.top + 8,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    backBtn: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    scroll: {
      paddingHorizontal: 24,
      paddingTop: 32,
      alignItems: "center",
    },
    heroBadge: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    heroTitle: {
      fontSize: 24,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
      textAlign: "center",
      marginBottom: 8,
    },
    heroSubtitle: {
      fontSize: 15,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 28,
    },
    featureList: {
      width: "100%",
      marginBottom: 28,
      gap: 12,
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    featureIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    featureText: {
      fontSize: 15,
      color: colors.foreground,
      fontFamily: "Inter_500Medium",
    },
    pricingSection: {
      width: "100%",
      gap: 12,
      marginBottom: 24,
    },
    priceCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 14,
      overflow: "hidden",
    },
    priceCardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.secondary,
    },
    savingsBadge: {
      position: "absolute",
      top: 0,
      right: 0,
      backgroundColor: colors.primary,
      borderBottomLeftRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    savingsBadgeText: {
      fontSize: 11,
      fontWeight: "700" as const,
      color: colors.primaryForeground,
      fontFamily: "Inter_700Bold",
    },
    radioOuter: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    radioInner: {
      width: 11,
      height: 11,
      borderRadius: 6,
      backgroundColor: colors.primary,
    },
    priceCardBody: { flex: 1 },
    priceCardTitle: {
      fontSize: 16,
      fontWeight: "600" as const,
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
      marginBottom: 2,
    },
    priceCardDetail: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    perMonth: {
      fontSize: 12,
      color: colors.primary,
      fontFamily: "Inter_500Medium",
      marginTop: 2,
    },
    errorText: {
      color: colors.destructive,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      marginBottom: 12,
    },
    subscribeBtn: {
      width: "100%",
      backgroundColor: colors.primary,
      borderRadius: 50,
      paddingVertical: 16,
      alignItems: "center",
      marginBottom: 14,
    },
    subscribeBtnText: {
      color: colors.primaryForeground,
      fontSize: 16,
      fontWeight: "700" as const,
      fontFamily: "Inter_700Bold",
    },
    restoreBtn: {
      paddingVertical: 10,
      marginBottom: 16,
    },
    restoreBtnText: {
      color: colors.mutedForeground,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      textDecorationLine: "underline",
    },
    legal: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      lineHeight: 16,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    modalCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 24,
      width: "100%",
      maxWidth: 360,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
      marginBottom: 12,
    },
    modalBody: {
      fontSize: 14,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
      lineHeight: 20,
      marginBottom: 24,
    },
    modalActions: {
      flexDirection: "row",
      gap: 12,
    },
    modalCancel: {
      flex: 1,
      backgroundColor: colors.secondary,
      borderRadius: 50,
      paddingVertical: 12,
      alignItems: "center",
    },
    modalCancelText: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    modalConfirm: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 50,
      paddingVertical: 12,
      alignItems: "center",
    },
    modalConfirmText: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.primaryForeground,
      fontFamily: "Inter_600SemiBold",
    },
  });
}
