import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { useGuestSession } from "@/hooks/useGuestSession";
import {
  useGeneratePlan,
  useGetUsage,
  useListPlans,
  useDeletePlan,
  getListPlansQueryKey,
  getGetUsageQueryKey,
} from "@workspace/api-client-react";
import type { Plan } from "@workspace/api-client-react";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const guestSessionId = useGuestSession();
  const queryClient = useQueryClient();

  const [goal, setGoal] = useState("");
  const [showLimitModal, setShowLimitModal] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const isWeb = Platform.OS === "web";

  const usageParams = guestSessionId && !isSignedIn ? { guestSessionId } : undefined;
  const { data: usage } = useGetUsage(usageParams);

  const {
    data: plans,
    refetch: refetchPlans,
    isLoading: plansLoading,
  } = useListPlans({ query: { enabled: !!isSignedIn } });

  const generatePlan = useGeneratePlan({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListPlansQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetUsageQueryKey() });
        setGoal("");
        inputRef.current?.blur();
        router.push(`/plan/${data.id}`);
      },
      onError: (err: unknown) => {
        const status = (err as { status?: number })?.status;
        if (status === 429) {
          if (isSignedIn) {
            // Signed-in free user hit the plan limit → show paywall
            router.push("/paywall");
          } else {
            // Guest user hit the limit → show sign-up prompt
            setShowLimitModal(true);
          }
        }
      },
    },
  });

  const deletePlan = useDeletePlan();

  const handleGenerate = () => {
    if (!goal.trim()) return;
    // Show limit modal immediately when guest has hit the limit
    if (!isSignedIn && usage && !usage.canGenerate) {
      setShowLimitModal(true);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    generatePlan.mutate({
      data: {
        goal: goal.trim(),
        ...(guestSessionId && !isSignedIn ? { guestSessionId } : {}),
      },
    });
  };

  const handleDeletePlan = (planId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    deletePlan.mutate(
      { id: planId },
      {
        onSuccess: () =>
          queryClient.invalidateQueries({ queryKey: getListPlansQueryKey() }),
      },
    );
  };

  const isGenerating = generatePlan.isPending;
  const hasPlans = isSignedIn && plans && plans.length > 0;
  const planCount = usage?.planCount ?? 0;
  const planLimit = usage?.limit ?? 3;

  const s = makeStyles(colors, insets);

  // ── Header / input section ──────────────────────────────────────────────
  const InputSection = (
    <View style={[s.inputSection, hasPlans && s.inputSectionCompact]}>
      {!hasPlans && (
        <View style={s.heroSection}>
          <View style={s.logoMark}>
            <Feather name="target" size={32} color={colors.primaryForeground} />
          </View>
          <Text style={s.heroTitle}>GoalGetter</Text>
          <Text style={s.heroSubtitle}>Turn any goal into a step-by-step action plan</Text>
        </View>
      )}

      {/* Usage bar — guests only */}
      {!isSignedIn && usage && (
        <View style={s.usageRow}>
          <View style={s.usageBarTrack}>
            <View
              style={[
                s.usageBarFill,
                {
                  width: `${Math.min((planCount / planLimit) * 100, 100)}%` as `${number}%`,
                  backgroundColor:
                    planCount >= planLimit ? colors.destructive : colors.primary,
                },
              ]}
            />
          </View>
          <Text style={s.usageLabel}>
            {planCount} / {planLimit} free plans
          </Text>
        </View>
      )}

      {/* Goal input label */}
      <Text style={s.inputLabel}>What is your goal?</Text>

      {/* Goal input */}
      <View style={s.searchRow}>
        <View style={s.searchContainer}>
          <Feather
            name="search"
            size={18}
            color={colors.mutedForeground}
            style={s.searchIcon}
          />
          <TextInput
            ref={inputRef}
            style={s.searchInput}
            value={goal}
            onChangeText={setGoal}
            placeholder="What's your goal?"
            placeholderTextColor={colors.mutedForeground}
            multiline={false}
            returnKeyType="go"
            onSubmitEditing={handleGenerate}
            editable={!isGenerating}
          />
          {goal.length > 0 && (
            <Pressable onPress={() => setGoal("")} hitSlop={8}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
        <Pressable
          style={({ pressed }) => [
            s.generateBtn,
            (!goal.trim() || isGenerating) && s.generateBtnDisabled,
            pressed && s.generateBtnPressed,
          ]}
          onPress={handleGenerate}
          disabled={!goal.trim() || isGenerating}
          testID="generate-plan-button"
        >
          {isGenerating ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <Feather
              name="zap"
              size={20}
              color={!goal.trim() ? colors.mutedForeground : colors.primaryForeground}
            />
          )}
        </Pressable>
      </View>

      {generatePlan.isError && !showLimitModal && (
        <Text style={s.errorText}>Could not generate plan. Try again.</Text>
      )}
    </View>
  );

  // ── Empty state (signed-in, no plans yet) ───────────────────────────────
  const EmptyState = isSignedIn ? (
    <View style={s.emptyState}>
      <Feather name="clipboard" size={36} color={colors.mutedForeground} />
      <Text style={s.emptyTitle}>No plans yet</Text>
      <Text style={s.emptySubtitle}>Enter a goal above and tap the lightning button</Text>
    </View>
  ) : null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={s.container}
    >
      <FlatList<Plan>
        data={isSignedIn ? (plans ?? []) : []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[
          s.listContent,
          !hasPlans && s.listContentCentered,
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!hasPlans}
        onRefresh={isSignedIn ? refetchPlans : undefined}
        refreshing={plansLoading}
        ListHeaderComponent={InputSection}
        ListEmptyComponent={EmptyState}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [s.planCard, pressed && s.planCardPressed]}
            onPress={() => router.push(`/plan/${item.id}`)}
          >
            <View style={s.planCardIcon}>
              <Feather name="target" size={16} color={colors.primary} />
            </View>
            <View style={s.planCardBody}>
              <Text style={s.planCardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={s.planCardGoal} numberOfLines={1}>
                {item.goal}
              </Text>
              <Text style={s.planCardDate}>
                {new Date(item.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>
            <Pressable
              onPress={() => handleDeletePlan(item.id)}
              hitSlop={8}
              style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
            >
              <Feather name="trash-2" size={15} color={colors.mutedForeground} />
            </Pressable>
          </Pressable>
        )}
        ListFooterComponent={
          isSignedIn && !hasPlans ? null : (
            <View style={{ height: isWeb ? 34 : insets.bottom + 16 }} />
          )
        }
      />

      {/* ── Guest limit modal ─────────────────────────────────────────── */}
      <Modal
        visible={showLimitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLimitModal(false)}
      >
        <Pressable
          style={s.modalOverlay}
          onPress={() => setShowLimitModal(false)}
        >
          <Pressable style={s.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={s.modalIcon}>
              <Feather name="lock" size={28} color={colors.primary} />
            </View>
            <Text style={s.modalTitle}>Free plan limit reached</Text>
            <Text style={s.modalBody}>
              You&apos;ve used all {planLimit} free plans. Create a free account
              to generate unlimited plans and save them across devices.
            </Text>
            <Pressable
              style={({ pressed }) => [s.modalPrimary, pressed && { opacity: 0.85 }]}
              onPress={() => {
                setShowLimitModal(false);
                router.push("/(auth)/sign-up");
              }}
            >
              <Text style={s.modalPrimaryText}>Create Free Account</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [s.modalSecondary, pressed && { opacity: 0.7 }]}
              onPress={() => {
                setShowLimitModal(false);
                router.push("/(auth)/sign-in");
              }}
            >
              <Text style={s.modalSecondaryText}>Sign In</Text>
            </Pressable>
            <Pressable
              style={s.modalDismiss}
              onPress={() => setShowLimitModal(false)}
            >
              <Text style={s.modalDismissText}>Not Now</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function makeStyles(
  colors: ReturnType<typeof useColors>,
  insets: ReturnType<typeof useSafeAreaInsets>,
) {
  const isWeb = Platform.OS === "web";
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    listContent: {
      paddingHorizontal: 20,
      paddingTop: isWeb ? 8 : 4,
    },
    listContentCentered: {
      flexGrow: 1,
      justifyContent: "center",
    },
    inputSection: {
      paddingTop: 8,
      gap: 16,
      marginBottom: 24,
    },
    inputSectionCompact: {
      paddingTop: 4,
      gap: 10,
      marginBottom: 16,
    },
    heroSection: {
      alignItems: "center",
      paddingTop: 16,
      paddingBottom: 8,
      gap: 10,
    },
    logoMark: {
      width: 72,
      height: 72,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    heroTitle: {
      fontSize: 32,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
      letterSpacing: -0.5,
    },
    heroSubtitle: {
      fontSize: 15,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      lineHeight: 22,
      paddingHorizontal: 12,
    },
    usageRow: {
      gap: 6,
    },
    usageBarTrack: {
      height: 4,
      backgroundColor: colors.muted,
      borderRadius: 2,
      overflow: "hidden",
    },
    usageBarFill: {
      height: 4,
      borderRadius: 2,
    },
    usageLabel: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_500Medium",
      textAlign: "right",
    },
    inputLabel: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
      marginBottom: 2,
    },
    searchRow: {
      flexDirection: "row",
      gap: 10,
      alignItems: "center",
    },
    searchContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 50,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 10,
    },
    searchIcon: { flexShrink: 0 },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
      padding: 0,
      margin: 0,
    },
    generateBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    generateBtnDisabled: { backgroundColor: colors.muted },
    generateBtnPressed: { opacity: 0.85 },
    errorText: {
      fontSize: 13,
      color: colors.destructive,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
    },
    planCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      padding: 14,
      marginBottom: 8,
    },
    planCardPressed: { opacity: 0.7 },
    planCardIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    planCardBody: { flex: 1, gap: 2 },
    planCardTitle: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    planCardGoal: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    planCardDate: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 2,
    },
    emptyState: {
      alignItems: "center",
      paddingTop: 24,
      gap: 10,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "600" as const,
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      lineHeight: 20,
    },
    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalCard: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 28,
      paddingTop: 28,
      paddingBottom: insets.bottom + 24,
      gap: 0,
    },
    modalIcon: {
      width: 60,
      height: 60,
      borderRadius: 16,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
      alignSelf: "center",
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
      textAlign: "center",
      marginBottom: 10,
    },
    modalBody: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 24,
    },
    modalPrimary: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 15,
      alignItems: "center",
      marginBottom: 10,
    },
    modalPrimaryText: {
      color: colors.primaryForeground,
      fontSize: 16,
      fontWeight: "600" as const,
      fontFamily: "Inter_600SemiBold",
    },
    modalSecondary: {
      backgroundColor: colors.secondary,
      borderRadius: colors.radius,
      paddingVertical: 15,
      alignItems: "center",
      marginBottom: 10,
    },
    modalSecondaryText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: "600" as const,
      fontFamily: "Inter_600SemiBold",
    },
    modalDismiss: {
      alignItems: "center",
      paddingVertical: 10,
    },
    modalDismissText: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
  });
}
