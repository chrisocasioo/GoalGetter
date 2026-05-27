import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import {
  useGetPlan,
  useExpandStep,
  useUpdateStep,
  useReorderSteps,
  getGetPlanQueryKey,
} from "@workspace/api-client-react";
import type { PlanWithSteps, Step, StepWithChildren } from "@workspace/api-client-react";

// ─── Helpers ──────────────────────────────────────────────────────────────

function getChildren(
  stepId: number,
  planStep: StepWithChildren | undefined,
  expandedMap: Map<number, Step[]>,
): Step[] {
  if (expandedMap.has(stepId)) return expandedMap.get(stepId)!;
  if (planStep) return planStep.children;
  return [];
}

// ─── Main Component ───────────────────────────────────────────────────────

export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const planId = Number(id);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isSignedIn } = useAuth();

  const { data: plan, isLoading, error } = useGetPlan(planId);

  // Keep a ref for PanResponder closures (avoids stale state)
  const planRef = useRef<PlanWithSteps | undefined>(undefined);
  useEffect(() => { planRef.current = plan; }, [plan]);

  const expandStep = useExpandStep();
  const updateStep = useUpdateStep();
  const reorderSteps = useReorderSteps();

  // Infinite depth: stepId → dynamically loaded children
  const [expandedMap, setExpandedMap] = useState<Map<number, Step[]>>(new Map());
  const [expandingIds, setExpandingIds] = useState<Set<number>>(new Set());

  // Inline editing
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  // ─── Drag-to-reorder state ────────────────────────────────────────────
  const [isDragging, setIsDragging] = useState(false);
  const [dragSourceIdx, setDragSourceIdx] = useState<number | null>(null);
  const [dragTargetIdx, setDragTargetIdx] = useState<number | null>(null);

  // Refs to avoid stale closures inside PanResponder
  const isDraggingRef = useRef(false);
  const dragSourceRef = useRef<number | null>(null);
  const dragTargetRef = useRef<number | null>(null);
  const activatedByHandleRef = useRef(false);
  const itemLayouts = useRef<Array<{ y: number; height: number }>>([]);
  const dragY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => activatedByHandleRef.current,
      onMoveShouldSetPanResponder: () => activatedByHandleRef.current,

      onPanResponderGrant: () => {
        if (!activatedByHandleRef.current || dragSourceRef.current === null) return;
        isDraggingRef.current = true;
        dragY.setValue(0);
        dragTargetRef.current = dragSourceRef.current;
        setIsDragging(true);
        setDragTargetIdx(dragSourceRef.current);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      },

      onPanResponderMove: (_, gesture) => {
        if (!isDraggingRef.current || dragSourceRef.current === null) return;
        dragY.setValue(gesture.dy);

        const srcLayout = itemLayouts.current[dragSourceRef.current];
        if (!srcLayout) return;
        const ghostCenterY = srcLayout.y + srcLayout.height / 2 + gesture.dy;

        let target = dragSourceRef.current;
        const layouts = itemLayouts.current;
        for (let i = 0; i < layouts.length; i++) {
          const l = layouts[i];
          if (!l) continue;
          if (ghostCenterY < l.y + l.height / 2) {
            target = i;
            break;
          }
          target = i;
        }

        if (target !== dragTargetRef.current) {
          dragTargetRef.current = target;
          setDragTargetIdx(target);
          if (target !== dragSourceRef.current) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }
      },

      onPanResponderRelease: () => {
        const from = dragSourceRef.current;
        const to = dragTargetRef.current;
        isDraggingRef.current = false;
        activatedByHandleRef.current = false;
        dragY.setValue(0);
        setIsDragging(false);
        setDragSourceIdx(null);
        setDragTargetIdx(null);
        dragSourceRef.current = null;
        dragTargetRef.current = null;
        if (from !== null && to !== null && from !== to) doReorder(from, to);
      },

      onPanResponderTerminate: () => {
        isDraggingRef.current = false;
        activatedByHandleRef.current = false;
        dragY.setValue(0);
        setIsDragging(false);
        setDragSourceIdx(null);
        setDragTargetIdx(null);
        dragSourceRef.current = null;
        dragTargetRef.current = null;
      },
    }),
  ).current;

  useLayoutEffect(() => {
    if (plan?.title) navigation.setOptions({ title: plan.title });
  }, [plan?.title, navigation]);

  // ─── Auth gate ────────────────────────────────────────────────────────

  const withAuth = (action: () => void) => {
    if (!isSignedIn) {
      Alert.alert(
        "Sign In Required",
        "Create a free account to edit and expand your plan steps.",
        [
          { text: "Not Now", style: "cancel" },
          { text: "Sign In", onPress: () => router.push("/(auth)/sign-in") },
        ],
      );
      return;
    }
    action();
  };

  // ─── Handlers ─────────────────────────────────────────────────────────

  const handleExpand = (stepId: number) => {
    withAuth(async () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setExpandingIds((p) => new Set(p).add(stepId));
      try {
        const result = await expandStep.mutateAsync({ id: stepId });
        setExpandedMap((p) => new Map(p).set(stepId, result.children));
        queryClient.invalidateQueries({ queryKey: getGetPlanQueryKey(planId) });
      } catch {
        Alert.alert("Error", "Could not expand this step. Please try again.");
      } finally {
        setExpandingIds((p) => {
          const n = new Set(p);
          n.delete(stepId);
          return n;
        });
      }
    });
  };

  const handleStartEdit = (stepId: number, text: string) => {
    withAuth(() => {
      setEditingId(stepId);
      setEditText(text);
    });
  };

  const handleSaveEdit = async () => {
    if (editingId === null) return;
    const savedId = editingId;
    const text = editText.trim();
    setEditingId(null);
    if (!text) return;
    try {
      await updateStep.mutateAsync({ id: savedId, data: { text } });
      queryClient.invalidateQueries({ queryKey: getGetPlanQueryKey(planId) });
    } catch {
      Alert.alert("Error", "Could not save your edit. Please try again.");
    }
  };

  const doReorder = async (from: number, to: number) => {
    const steps = planRef.current?.steps;
    if (!steps) return;
    const reordered = [...steps];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    const stepOrders = reordered.map((s, i) => ({ id: s.id, sortOrder: i }));
    try {
      await reorderSteps.mutateAsync({ id: planId, data: { stepOrders } });
      queryClient.invalidateQueries({ queryKey: getGetPlanQueryKey(planId) });
    } catch {
      Alert.alert("Error", "Could not reorder steps. Please try again.");
    }
  };

  // ─── Recursive step renderer ──────────────────────────────────────────

  const renderStep = (
    step: StepWithChildren | Step,
    topIdx: number | null,  // null = not a top-level step
    depth: number,
    planTopStep?: StepWithChildren,
  ): React.ReactNode => {
    const children = getChildren(step.id, planTopStep, expandedMap);
    const hasChildren = children.length > 0;
    const isExpanding = expandingIds.has(step.id);
    const isEditing = editingId === step.id;
    const isTopLevel = depth === 0 && topIdx !== null;
    const isDragSrc = isTopLevel && dragSourceIdx === topIdx;
    const isDragTgt = isTopLevel && dragTargetIdx === topIdx && dragSourceIdx !== topIdx;

    return (
      <View key={`step-${step.id}`}>
        {/* Drop target indicator */}
        {isDragTgt && <View style={s.dropIndicator} />}

        <View
          style={[
            s.stepRow,
            { paddingLeft: 16 + depth * 20 },
            isDragSrc && s.stepRowDragging,
          ]}
          onLayout={
            isTopLevel && topIdx !== null
              ? (e) => {
                  itemLayouts.current[topIdx] = {
                    y: e.nativeEvent.layout.y,
                    height: e.nativeEvent.layout.height,
                  };
                }
              : undefined
          }
        >
          {depth > 0 && <View style={s.depthLine} />}

          {/* Drag handle — top-level, auth only */}
          {isTopLevel && isSignedIn && (
            <Pressable
              style={s.dragHandle}
              onPressIn={() => {
                if (isDraggingRef.current) return;
                activatedByHandleRef.current = true;
                dragSourceRef.current = topIdx!;
                setDragSourceIdx(topIdx!);
              }}
              onPressOut={() => {
                if (!isDraggingRef.current) {
                  activatedByHandleRef.current = false;
                  dragSourceRef.current = null;
                  setDragSourceIdx(null);
                }
              }}
              hitSlop={8}
            >
              <Feather name="menu" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}

          {/* Bullet */}
          <View style={s.bulletWrap}>
            <View
              style={[
                s.bullet,
                hasChildren && {
                  backgroundColor: colors.primary,
                  borderColor: colors.primary,
                },
              ]}
            />
          </View>

          {/* Text / Edit input */}
          <View style={s.stepBody}>
            {isEditing ? (
              <TextInput
                style={s.editInput}
                value={editText}
                onChangeText={setEditText}
                multiline
                autoFocus
                onBlur={handleSaveEdit}
                onSubmitEditing={handleSaveEdit}
              />
            ) : (
              <Pressable onLongPress={() => handleStartEdit(step.id, step.text)}>
                <Text style={[s.stepText, hasChildren && s.stepTextExpanded]}>
                  {step.text}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Expand button */}
          {!hasChildren && !isEditing && (
            <Pressable
              style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.5 }]}
              onPress={() => handleExpand(step.id)}
              disabled={isExpanding}
              testID={`expand-${step.id}`}
            >
              {isExpanding ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Feather name="git-branch" size={15} color={colors.primary} />
              )}
            </Pressable>
          )}
        </View>

        {/* Recursively render children (infinite depth) */}
        {hasChildren &&
          children.map((child) => renderStep(child, null, depth + 1))}
      </View>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────

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

  const floatingStep =
    dragSourceIdx !== null ? plan.steps[dragSourceIdx] : null;

  return (
    <View style={s.container}>
      <ScrollView
        scrollEnabled={!isDragging}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* Plan header */}
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
                Sign in to edit, expand, and drag-to-reorder steps
              </Text>
              <Feather name="chevron-right" size={13} color={colors.primary} />
            </Pressable>
          )}
        </View>

        {/* Steps container with PanResponder for drag */}
        <View {...panResponder.panHandlers} style={s.stepsContainer}>
          {plan.steps.map((step, index) =>
            renderStep(step, index, 0, step),
          )}

          {/* Floating ghost item while dragging */}
          {isDragging && floatingStep && (
            <Animated.View
              style={[
                { pointerEvents: "none" as const },
                s.floatingGhost,
                {
                  top: itemLayouts.current[dragSourceIdx!]?.y ?? 0,
                  transform: [{ translateY: dragY }],
                },
              ]}
            >
              <Feather name="menu" size={14} color={colors.mutedForeground} />
              <Text style={s.floatingGhostText} numberOfLines={2}>
                {floatingStep.text}
              </Text>
            </Animated.View>
          )}
        </View>
      </ScrollView>
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
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 6,
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
    },
    signInBannerText: {
      flex: 1,
      fontSize: 12,
      color: colors.primary,
      fontFamily: "Inter_500Medium",
    },
    stepsContainer: {
      position: "relative",
      marginTop: 4,
    },
    dropIndicator: {
      height: 2,
      backgroundColor: colors.primary,
      marginHorizontal: 16,
      borderRadius: 1,
    },
    stepRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingRight: 12,
      paddingVertical: 10,
      position: "relative",
    },
    stepRowDragging: {
      opacity: 0.35,
    },
    depthLine: {
      position: "absolute",
      left: 29,
      top: 0,
      bottom: 0,
      width: 1,
      backgroundColor: colors.border,
    },
    dragHandle: {
      width: 24,
      height: 24,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 2,
      marginTop: 1,
      flexShrink: 0,
    },
    bulletWrap: {
      width: 20,
      alignItems: "center",
      paddingTop: 6,
      flexShrink: 0,
    },
    bullet: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.border,
      borderWidth: 1,
      borderColor: colors.mutedForeground,
    },
    stepBody: { flex: 1, paddingLeft: 6 },
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
    editInput: {
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
    iconBtn: {
      width: 30,
      height: 30,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 6,
      flexShrink: 0,
    },
    floatingGhost: {
      position: "absolute",
      left: 16,
      right: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: colors.radius,
      paddingHorizontal: 14,
      paddingVertical: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
    floatingGhostText: {
      flex: 1,
      fontSize: 14,
      color: colors.foreground,
      fontFamily: "Inter_500Medium",
    },
    errorText: {
      fontSize: 15,
      color: colors.destructive,
      fontFamily: "Inter_400Regular",
    },
  });
}
