import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useGuestSession } from "@/hooks/useGuestSession";
import {
  useGeneratePlan,
  useGetUsage,
  useListPlans,
  useDeletePlan,
} from "@workspace/api-client-react";
import type { Plan } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListPlansQueryKey, getGetUsageQueryKey } from "@workspace/api-client-react";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const guestSessionId = useGuestSession();
  const queryClient = useQueryClient();

  const [goal, setGoal] = useState("");
  const inputRef = useRef<TextInput>(null);

  const { data: usage } = useGetUsage({
    params: guestSessionId && !isSignedIn ? { guestSessionId } : undefined,
  });

  const { data: plans, refetch: refetchPlans, isLoading: plansLoading } = useListPlans({
    query: { enabled: !!isSignedIn },
  });

  const generatePlan = useGeneratePlan({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListPlansQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetUsageQueryKey() });
        setGoal("");
        inputRef.current?.blur();
        router.push(`/plan/${data.id}`);
      },
    },
  });

  const deletePlan = useDeletePlan();

  const handleGenerate = async () => {
    if (!goal.trim()) return;
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
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPlansQueryKey() });
        },
      },
    );
  };

  const isLimitReached = usage ? !usage.canGenerate : false;
  const isGenerating = generatePlan.isPending;

  const s = makeStyles(colors, insets);

  const renderPlanCard = ({ item }: { item: Plan }) => (
    <Pressable
      style={({ pressed }) => [s.planCard, pressed && s.planCardPressed]}
      onPress={() => router.push(`/plan/${item.id}`)}
    >
      <View style={s.planCardContent}>
        <View style={s.planIconWrap}>
          <Feather name="target" size={18} color={colors.primary} />
        </View>
        <View style={s.planInfo}>
          <Text style={s.planTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={s.planGoal} numberOfLines={2}>
            {item.goal}
          </Text>
          <Text style={s.planDate}>
            {new Date(item.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
        </View>
      </View>
      <Pressable
        style={({ pressed }) => [s.deleteButton, pressed && { opacity: 0.6 }]}
        onPress={() => handleDeletePlan(item.id)}
        hitSlop={8}
      >
        <Feather name="trash-2" size={16} color={colors.mutedForeground} />
      </Pressable>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={s.container}
    >
      <FlatList<Plan>
        data={isSignedIn ? (plans ?? []) : []}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderPlanCard}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!(isSignedIn && plans && plans.length > 0)}
        onRefresh={isSignedIn ? refetchPlans : undefined}
        refreshing={plansLoading}
        ListHeaderComponent={
          <View>
            <View style={s.inputSection}>
              {usage && !isSignedIn && (
                <View style={s.usageBanner}>
                  <Text style={s.usageText}>
                    {usage.planCount} of {usage.limit} free plans used
                  </Text>
                  {isLimitReached && (
                    <Text style={s.usageLimitText}>Sign up for unlimited plans</Text>
                  )}
                </View>
              )}
              <TextInput
                ref={inputRef}
                style={s.goalInput}
                value={goal}
                onChangeText={setGoal}
                placeholder="What's your goal?"
                placeholderTextColor={colors.mutedForeground}
                multiline
                maxLength={500}
                returnKeyType="default"
                editable={!isGenerating && !isLimitReached}
              />
              {generatePlan.isError && (
                <Text style={s.errorText}>
                  {(generatePlan.error as { message?: string })?.message === "429"
                    ? "Free plan limit reached. Sign up for more."
                    : "Could not generate plan. Try again."}
                </Text>
              )}
              <Pressable
                style={({ pressed }) => [
                  s.generateButton,
                  (!goal.trim() || isGenerating || isLimitReached) &&
                    s.generateButtonDisabled,
                  pressed && s.generateButtonPressed,
                ]}
                onPress={handleGenerate}
                disabled={!goal.trim() || isGenerating || isLimitReached}
              >
                {isGenerating ? (
                  <ActivityIndicator color={colors.primaryForeground} size="small" />
                ) : (
                  <>
                    <Feather
                      name="zap"
                      size={18}
                      color={
                        !goal.trim() || isLimitReached
                          ? colors.mutedForeground
                          : colors.primaryForeground
                      }
                    />
                    <Text
                      style={[
                        s.generateButtonText,
                        (!goal.trim() || isLimitReached) && s.generateButtonTextDisabled,
                      ]}
                    >
                      Generate Plan
                    </Text>
                  </>
                )}
              </Pressable>
            </View>

            {isSignedIn && plans && plans.length > 0 && (
              <Text style={s.sectionLabel}>Your Plans</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          isSignedIn ? (
            <View style={s.emptyState}>
              <Feather name="target" size={40} color={colors.mutedForeground} />
              <Text style={s.emptyTitle}>No plans yet</Text>
              <Text style={s.emptySubtitle}>
                Enter a goal above to generate your first plan
              </Text>
            </View>
          ) : null
        }
      />
    </KeyboardAvoidingView>
  );
}

function makeStyles(
  colors: ReturnType<typeof useColors>,
  insets: ReturnType<typeof useSafeAreaInsets>,
) {
  const isWeb = Platform.OS === "web";
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: insets.bottom + 24,
      paddingTop: isWeb ? 8 : 4,
      gap: 0,
    },
    inputSection: {
      marginBottom: 24,
      gap: 12,
    },
    usageBanner: {
      backgroundColor: colors.secondary,
      borderRadius: colors.radius,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    usageText: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_500Medium",
    },
    usageLimitText: {
      fontSize: 12,
      color: colors.primary,
      fontFamily: "Inter_600SemiBold",
      marginTop: 2,
    },
    goalInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.foreground,
      backgroundColor: colors.card,
      fontFamily: "Inter_400Regular",
      minHeight: 56,
      maxHeight: 120,
    },
    generateButton: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 15,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    generateButtonDisabled: {
      backgroundColor: colors.muted,
    },
    generateButtonPressed: {
      opacity: 0.85,
    },
    generateButtonText: {
      color: colors.primaryForeground,
      fontSize: 16,
      fontWeight: "600" as const,
      fontFamily: "Inter_600SemiBold",
    },
    generateButtonTextDisabled: {
      color: colors.mutedForeground,
    },
    errorText: {
      fontSize: 13,
      color: colors.destructive,
      fontFamily: "Inter_400Regular",
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "600" as const,
      color: colors.mutedForeground,
      fontFamily: "Inter_600SemiBold",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 12,
    },
    planCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    planCardPressed: {
      opacity: 0.75,
    },
    planCardContent: {
      flex: 1,
      flexDirection: "row",
      gap: 12,
      alignItems: "flex-start",
    },
    planIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    planInfo: {
      flex: 1,
      gap: 2,
    },
    planTitle: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
    },
    planGoal: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      lineHeight: 18,
    },
    planDate: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 4,
    },
    deleteButton: {
      padding: 4,
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: 48,
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
  });
}
