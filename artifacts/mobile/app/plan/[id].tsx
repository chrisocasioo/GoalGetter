import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  useGetPlan,
  useExpandStep,
  useUpdateStep,
  useReorderSteps,
  getGetPlanQueryKey,
} from "@workspace/api-client-react";
import type { Step, StepWithChildren } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

type FlatStep = Step & {
  hasChildren: boolean;
  children: Step[];
};

function flattenSteps(steps: StepWithChildren[]): FlatStep[] {
  const flat: FlatStep[] = [];
  for (const step of steps) {
    flat.push({ ...step, hasChildren: step.children.length > 0, children: step.children });
    for (const child of step.children) {
      flat.push({ ...child, hasChildren: false, children: [] });
    }
  }
  return flat;
}

export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const planId = Number(id);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isSignedIn } = useAuth();

  const { data: plan, isLoading, error } = useGetPlan({ id: planId });

  const expandStep = useExpandStep();
  const updateStep = useUpdateStep();
  const reorderSteps = useReorderSteps();

  const [expandingIds, setExpandingIds] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  useLayoutEffect(() => {
    if (plan?.title) {
      navigation.setOptions({ title: plan.title });
    }
  }, [plan?.title, navigation]);

  // Auth gate: prompt sign-in if guest tries a protected action
  const withAuth = (action: () => void) => {
    if (!isSignedIn) {
      Alert.alert(
        "Sign In Required",
        "Create a free account to edit and expand your plan steps.",
        [
          { text: "Not Now", style: "cancel" },
          {
            text: "Sign In",
            onPress: () => router.push("/(auth)/sign-in"),
          },
        ],
      );
      return;
    }
    action();
  };

  const handleExpand = (stepId: number) => {
    withAuth(async () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setExpandingIds((prev) => new Set(prev).add(stepId));
      try {
        await expandStep.mutateAsync({ id: stepId });
        queryClient.invalidateQueries({ queryKey: getGetPlanQueryKey({ id: planId }) });
      } catch {
        Alert.alert("Error", "Could not expand this step. Please try again.");
      } finally {
        setExpandingIds((prev) => {
          const next = new Set(prev);
          next.delete(stepId);
          return next;
        });
      }
    });
  };

  const handleStartEdit = (step: FlatStep) => {
    withAuth(() => {
      setEditingId(step.id);
      setEditText(step.text);
    });
  };

  const handleSaveEdit = async () => {
    if (editingId === null) return;
    const text = editText.trim();
    setEditingId(null);
    if (!text) return;
    try {
      await updateStep.mutateAsync({ id: editingId, data: { text } });
      queryClient.invalidateQueries({ queryKey: getGetPlanQueryKey({ id: planId }) });
    } catch {
      Alert.alert("Error", "Could not save your edit. Please try again.");
    }
  };

  const handleMoveStep = (stepId: number, direction: "up" | "down") => {
    withAuth(async () => {
      if (!plan) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const topSteps = plan.steps;
      const idx = topSteps.findIndex((s) => s.id === stepId);
      if (idx < 0) return;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= topSteps.length) return;

      const newOrder = topSteps.map((s, i) => {
        if (i === idx) return { id: s.id, sortOrder: topSteps[targetIdx].sortOrder };
        if (i === targetIdx) return { id: s.id, sortOrder: topSteps[idx].sortOrder };
        return { id: s.id, sortOrder: s.sortOrder };
      });

      try {
        await reorderSteps.mutateAsync({ id: planId, data: { stepOrders: newOrder } });
        queryClient.invalidateQueries({ queryKey: getGetPlanQueryKey({ id: planId }) });
      } catch {
        Alert.alert("Error", "Could not reorder steps. Please try again.");
      }
    });
  };

  const s = makeStyles(colors, insets);

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !plan) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>Could not load plan</Text>
      </View>
    );
  }

  const flatSteps = flattenSteps(plan.steps);
  const topLevelIds = plan.steps.map((s) => s.id);

  const renderStep = ({ item }: { item: FlatStep }) => {
    const isEditing = editingId === item.id;
    const isExpanding = expandingIds.has(item.id);
    const isTopLevel = item.depth === 0;
    const topIdx = isTopLevel ? topLevelIds.indexOf(item.id) : -1;

    return (
      <View style={[s.stepRow, { paddingLeft: 20 + item.depth * 20 }]}>
        {item.depth > 0 && <View style={s.depthLine} />}
        <View style={s.stepContent}>
          <View style={s.stepBullet}>
            <View
              style={[
                s.bullet,
                item.hasChildren && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
            />
          </View>
          <View style={s.stepBody}>
            {isEditing ? (
              <TextInput
                style={s.stepEditInput}
                value={editText}
                onChangeText={setEditText}
                multiline
                autoFocus
                onBlur={handleSaveEdit}
                onSubmitEditing={handleSaveEdit}
              />
            ) : (
              <Pressable onLongPress={() => handleStartEdit(item)}>
                <Text style={[s.stepText, item.hasChildren && s.stepTextParent]}>
                  {item.text}
                </Text>
                {!isSignedIn && (
                  <Text style={s.guestHint}>Long-press to edit · Sign in required</Text>
                )}
              </Pressable>
            )}
          </View>
          <View style={s.stepActions}>
            {!item.hasChildren && !isEditing && (
              <Pressable
                style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.5 }]}
                onPress={() => handleExpand(item.id)}
                disabled={isExpanding}
                testID={`expand-step-${item.id}`}
              >
                {isExpanding ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Feather name="git-branch" size={15} color={colors.primary} />
                )}
              </Pressable>
            )}
            {isTopLevel && !isEditing && (
              <>
                <Pressable
                  style={({ pressed }) => [
                    s.iconBtn,
                    pressed && { opacity: 0.5 },
                    topIdx === 0 && s.iconBtnDisabled,
                  ]}
                  onPress={() => handleMoveStep(item.id, "up")}
                  disabled={topIdx === 0}
                >
                  <Feather
                    name="arrow-up"
                    size={14}
                    color={topIdx === 0 ? colors.mutedForeground : colors.foreground}
                  />
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    s.iconBtn,
                    pressed && { opacity: 0.5 },
                    topIdx === topLevelIds.length - 1 && s.iconBtnDisabled,
                  ]}
                  onPress={() => handleMoveStep(item.id, "down")}
                  disabled={topIdx === topLevelIds.length - 1}
                >
                  <Feather
                    name="arrow-down"
                    size={14}
                    color={
                      topIdx === topLevelIds.length - 1
                        ? colors.mutedForeground
                        : colors.foreground
                    }
                  />
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>
      <FlatList<FlatStep>
        data={flatSteps}
        keyExtractor={(item) => `${item.id}-${item.depth}`}
        renderItem={renderStep}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={s.header}>
            <Text style={s.goalLabel}>Goal</Text>
            <Text style={s.goalText}>{plan.goal}</Text>
            {!isSignedIn && (
              <Pressable
                style={s.signInBanner}
                onPress={() => router.push("/(auth)/sign-in")}
              >
                <Feather name="lock" size={13} color={colors.primary} />
                <Text style={s.signInBannerText}>
                  Sign in to edit, expand, and reorder steps
                </Text>
                <Feather name="chevron-right" size={13} color={colors.primary} />
              </Pressable>
            )}
          </View>
        }
        ListFooterComponent={<View style={{ height: insets.bottom + 24 }} />}
      />
    </View>
  );
}

function makeStyles(
  colors: ReturnType<typeof useColors>,
  insets: ReturnType<typeof useSafeAreaInsets>,
) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    listContent: { paddingHorizontal: 0 },
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: 8,
      gap: 8,
    },
    goalLabel: {
      fontSize: 11,
      fontWeight: "600" as const,
      color: colors.mutedForeground,
      fontFamily: "Inter_600SemiBold",
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    goalText: {
      fontSize: 16,
      color: colors.foreground,
      fontFamily: "Inter_500Medium",
      lineHeight: 22,
    },
    signInBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.secondary,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginTop: 4,
    },
    signInBannerText: {
      flex: 1,
      fontSize: 12,
      color: colors.primary,
      fontFamily: "Inter_500Medium",
    },
    stepRow: {
      paddingRight: 16,
      position: "relative",
    },
    depthLine: {
      position: "absolute",
      left: 27,
      top: 0,
      bottom: 0,
      width: 1,
      backgroundColor: colors.border,
    },
    stepContent: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: 10,
      gap: 8,
    },
    stepBullet: {
      width: 20,
      alignItems: "center",
      paddingTop: 6,
    },
    bullet: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.border,
      borderWidth: 1,
      borderColor: colors.mutedForeground,
    },
    stepBody: { flex: 1 },
    stepText: {
      fontSize: 15,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
      lineHeight: 22,
    },
    stepTextParent: {
      fontFamily: "Inter_600SemiBold",
      fontWeight: "600" as const,
    },
    guestHint: {
      fontSize: 10,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 2,
    },
    stepEditInput: {
      fontSize: 15,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
      lineHeight: 22,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: colors.card,
    },
    stepActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    iconBtn: {
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 6,
    },
    iconBtnDisabled: { opacity: 0.3 },
    errorText: {
      fontSize: 15,
      color: colors.destructive,
      fontFamily: "Inter_400Regular",
    },
  });
}
