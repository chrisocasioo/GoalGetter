import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
} from "@workspace/api-client-react";
import type { Step, StepWithChildren } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetPlanQueryKey } from "@workspace/api-client-react";

type FlatStep = Step & {
  depth: number;
  hasChildren: boolean;
  children?: Step[];
};

function flattenSteps(steps: StepWithChildren[]): FlatStep[] {
  const flat: FlatStep[] = [];
  for (const step of steps) {
    flat.push({
      ...step,
      depth: step.depth,
      hasChildren: step.children.length > 0,
      children: step.children,
    });
    for (const child of step.children) {
      flat.push({
        ...child,
        depth: child.depth,
        hasChildren: false,
        children: [],
      });
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
  const queryClient = useQueryClient();

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

  const handleExpand = async (stepId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandingIds((prev) => new Set(prev).add(stepId));
    try {
      await expandStep.mutateAsync({ id: stepId });
      queryClient.invalidateQueries({ queryKey: getGetPlanQueryKey({ id: planId }) });
    } finally {
      setExpandingIds((prev) => {
        const next = new Set(prev);
        next.delete(stepId);
        return next;
      });
    }
  };

  const handleStartEdit = (step: FlatStep) => {
    setEditingId(step.id);
    setEditText(step.text);
  };

  const handleSaveEdit = async () => {
    if (editingId === null) return;
    const text = editText.trim();
    if (!text) {
      setEditingId(null);
      return;
    }
    try {
      await updateStep.mutateAsync({ id: editingId, data: { text } });
      queryClient.invalidateQueries({ queryKey: getGetPlanQueryKey({ id: planId }) });
    } finally {
      setEditingId(null);
    }
  };

  const handleMoveStep = async (stepId: number, direction: "up" | "down") => {
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

    await reorderSteps.mutateAsync({
      id: planId,
      data: { stepOrders: newOrder },
    });
    queryClient.invalidateQueries({ queryKey: getGetPlanQueryKey({ id: planId }) });
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

  const renderStep = ({ item, index }: { item: FlatStep; index: number }) => {
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
                item.hasChildren && { backgroundColor: colors.primary },
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
                <Text style={[s.stepText, item.hasChildren && s.stepTextExpanded]}>
                  {item.text}
                </Text>
              </Pressable>
            )}
          </View>
          <View style={s.stepActions}>
            {!item.hasChildren && !isEditing && (
              <Pressable
                style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.5 }]}
                onPress={() => handleExpand(item.id)}
                disabled={isExpanding}
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
        keyExtractor={(item) => String(item.id)}
        renderItem={renderStep}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={s.header}>
            <Text style={s.goalLabel}>Goal</Text>
            <Text style={s.goalText}>{plan.goal}</Text>
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
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    listContent: {
      paddingHorizontal: 0,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: 8,
    },
    goalLabel: {
      fontSize: 11,
      fontWeight: "600" as const,
      color: colors.mutedForeground,
      fontFamily: "Inter_600SemiBold",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    goalText: {
      fontSize: 16,
      color: colors.foreground,
      fontFamily: "Inter_500Medium",
      lineHeight: 22,
    },
    stepRow: {
      paddingRight: 16,
      paddingVertical: 0,
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
      paddingTop: 4,
    },
    bullet: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.border,
      borderWidth: 1,
      borderColor: colors.mutedForeground,
    },
    stepBody: {
      flex: 1,
    },
    stepText: {
      fontSize: 15,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
      lineHeight: 22,
    },
    stepTextExpanded: {
      fontFamily: "Inter_600SemiBold",
      fontWeight: "600" as const,
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
    iconBtnDisabled: {
      opacity: 0.3,
    },
    errorText: {
      fontSize: 15,
      color: colors.destructive,
      fontFamily: "Inter_400Regular",
    },
  });
}
