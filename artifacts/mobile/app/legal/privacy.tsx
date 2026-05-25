import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function PrivacyPolicyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const s = makeStyles(colors, insets);

  return (
    <View style={s.container}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.lastUpdated}>Last updated: May 2026</Text>

        <Text style={s.intro}>
          GoalGetter (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to
          protecting your privacy. This policy explains what information we collect, how we
          use it, and the choices you have.
        </Text>

        <Text style={s.heading}>Information We Collect</Text>
        <Text style={s.body}>
          We collect the email address you use to create your account. We also store the
          goals and plans you generate using the app, along with your usage count and
          subscription status.
        </Text>

        <Text style={s.heading}>How We Use Your Information</Text>
        <Text style={s.body}>
          Your information is used solely to provide the GoalGetter service — generating
          AI-powered plans, syncing your data across devices, and managing your subscription.
          We do not sell or share your data with third parties for advertising purposes.
        </Text>

        <Text style={s.heading}>AI Plan Generation</Text>
        <Text style={s.body}>
          Your goals are sent to an AI service to generate step-by-step plans. Do not
          include sensitive personal information in your goals.
        </Text>

        <Text style={s.heading}>Data Retention</Text>
        <Text style={s.body}>
          Your data is retained as long as your account is active. You can delete your
          account at any time from the Profile screen, which will permanently remove all
          your data.
        </Text>

        <Text style={s.heading}>Contact Us</Text>
        <Text style={s.body}>
          If you have questions about this privacy policy, please contact us at
          privacy@goalgetter.app.
        </Text>
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
    content: {
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: insets.bottom + 40,
      gap: 0,
    },
    lastUpdated: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginBottom: 16,
    },
    intro: {
      fontSize: 15,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
      lineHeight: 24,
      marginBottom: 24,
    },
    heading: {
      fontSize: 16,
      fontWeight: "600" as const,
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
      marginTop: 20,
      marginBottom: 8,
    },
    body: {
      fontSize: 14,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
      lineHeight: 22,
      marginBottom: 4,
    },
  });
}
