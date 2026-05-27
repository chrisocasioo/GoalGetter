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
      <View style={s.header}>
        <Pressable
          style={({ pressed }) => [s.backButton, pressed && { opacity: 0.6 }]}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={s.headerTitle}>Privacy Policy</Text>
        <View style={s.backButton} />
      </View>

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

        <Text style={s.heading}>1. Information We Collect</Text>
        <Text style={s.body}>
          We collect the following information when you use GoalGetter:
        </Text>
        <Text style={s.bullet}>• Email address used to create your account</Text>
        <Text style={s.bullet}>• Goals and AI-generated plans you create</Text>
        <Text style={s.bullet}>• Usage count and subscription status</Text>
        <Text style={s.bullet}>• Device type and OS version for analytics</Text>
        <Text style={s.bullet}>• Referral codes used during sign-up</Text>

        <Text style={s.heading}>2. How We Use Your Information</Text>
        <Text style={s.body}>
          Your information is used to provide and improve the GoalGetter service —
          generating AI-powered plans from your goals, syncing your data across devices,
          and managing your subscription. We send transactional emails related to your
          account and subscription. We do not sell your data to third parties or use it
          for advertising purposes.
        </Text>

        <Text style={s.heading}>3. Third-Party Services</Text>
        <Text style={s.body}>
          We use the following third-party services, each of which has its own privacy
          policy:
        </Text>
        <Text style={s.bullet}>
          • <Text style={s.bold}>Clerk</Text> — handles authentication. Clerk stores your
          email address and manages secure login sessions.
        </Text>
        <Text style={s.bullet}>
          • <Text style={s.bold}>RevenueCat</Text> — manages in-app subscriptions and
          purchase history on iOS and Android.
        </Text>
        <Text style={s.bullet}>
          • <Text style={s.bold}>OpenAI</Text> — powers AI plan generation. The goal text
          you enter is sent to OpenAI to generate step-by-step plans. Do not include
          sensitive personal information in your goals.
        </Text>

        <Text style={s.heading}>4. Data Storage and Security</Text>
        <Text style={s.body}>
          Your data is stored on servers in the United States. We use industry-standard
          encryption in transit (TLS) and at rest. Access to your data is restricted to
          authorised personnel only.
        </Text>

        <Text style={s.heading}>5. Data Retention</Text>
        <Text style={s.body}>
          Your data is retained as long as your account is active. You can delete your
          account at any time from the Profile screen, which will permanently remove all
          your data within 30 days.
        </Text>

        <Text style={s.heading}>6. Your Rights (GDPR &amp; CCPA)</Text>
        <Text style={s.body}>
          Depending on your location, you may have the following rights:
        </Text>
        <Text style={s.bullet}>
          • Right to access, correct, or delete your personal data
        </Text>
        <Text style={s.bullet}>• Right to data portability</Text>
        <Text style={s.bullet}>
          • Right to opt out of the sale of personal information (we do not sell data)
        </Text>
        <Text style={s.bullet}>
          • GDPR: you may lodge a complaint with your national data protection authority
        </Text>
        <Text style={s.bullet}>
          • CCPA: California residents may contact us to exercise their privacy rights
        </Text>

        <Text style={s.heading}>7. Children&apos;s Privacy</Text>
        <Text style={s.body}>
          GoalGetter is not intended for users under the age of 13. We do not knowingly
          collect personal information from children under 13.
        </Text>

        <Text style={s.heading}>8. Changes to This Policy</Text>
        <Text style={s.body}>
          We may update this privacy policy from time to time. We will notify you of
          material changes via in-app notice or email before they take effect.
        </Text>

        <Text style={s.heading}>9. Contact Us</Text>
        <Text style={s.body}>
          For privacy questions or to exercise your rights, contact us at:
          privacy@goalgetter.app
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
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: insets.top + 8,
      paddingBottom: 12,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    content: {
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: insets.bottom + 48,
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
      color: colors.foreground,
      fontFamily: "Inter_600SemiBold",
      marginTop: 24,
      marginBottom: 8,
    },
    body: {
      fontSize: 14,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
      lineHeight: 22,
      marginBottom: 8,
    },
    bullet: {
      fontSize: 14,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
      lineHeight: 22,
      paddingLeft: 8,
      marginBottom: 4,
    },
    bold: {
      fontFamily: "Inter_600SemiBold",
    },
  });
}
