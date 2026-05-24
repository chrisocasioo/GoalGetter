import { useAuth, useSSO, useSignUp } from "@clerk/expo";
import { type Href, Link, useRouter } from "expo-router";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";

WebBrowser.maybeCompleteAuthSession();

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

export default function SignUpScreen() {
  useWarmUpBrowser();
  const { signUp, errors, fetchStatus } = useSignUp();
  const { startSSOFlow } = useSSO();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");

  const isLoading = fetchStatus === "fetching";

  const handleOAuth = useCallback(
    async (strategy: "oauth_google" | "oauth_apple") => {
      try {
        const { createdSessionId, setActive } = await startSSOFlow({
          strategy,
          redirectUrl: AuthSession.makeRedirectUri(),
        });
        if (createdSessionId && setActive) {
          await setActive({
            session: createdSessionId,
            navigate: async ({ session, decorateUrl }) => {
              if (session?.currentTask) return;
              router.replace(decorateUrl("/") as Href);
            },
          });
        }
      } catch (err) {
        console.error(JSON.stringify(err, null, 2));
      }
    },
    [startSSOFlow, router],
  );

  const handleSubmit = async () => {
    const { error } = await signUp.password({ emailAddress, password });
    if (error) return;
    if (!error) await signUp.verifications.sendEmailCode();
  };

  const handleVerify = async () => {
    await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === "complete") {
      await signUp.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return;
          const url = decorateUrl("/");
          if (!url.startsWith("http")) router.replace(url as Href);
        },
      });
    }
  };

  if (signUp.status === "complete" || isSignedIn) return null;

  const s = makeStyles(colors, insets);

  if (
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0
  ) {
    return (
      <View style={s.container}>
        <View style={s.content}>
          <Text style={s.title}>Verify your email</Text>
          <Text style={s.subtitle}>We sent a code to {emailAddress}</Text>
          <TextInput
            style={s.input}
            value={code}
            placeholder="6-digit code"
            placeholderTextColor={colors.mutedForeground}
            onChangeText={setCode}
            keyboardType="numeric"
            autoFocus
          />
          {errors?.fields?.code && (
            <Text style={s.errorText}>{errors.fields.code.message}</Text>
          )}
          <Pressable
            style={({ pressed }) => [
              s.button,
              (isLoading || !code) && s.buttonDisabled,
              pressed && s.buttonPressed,
            ]}
            onPress={handleVerify}
            disabled={isLoading || !code}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={s.buttonText}>Verify</Text>
            )}
          </Pressable>
          <Pressable
            style={s.linkButton}
            onPress={() => signUp.verifications.sendEmailCode()}
          >
            <Text style={s.linkText}>Resend code</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={s.container}
    >
      <View style={s.content}>
        <View style={s.logoRow}>
          <View style={s.logoIcon} />
          <Text style={s.logoText}>GoalGetter</Text>
        </View>
        <Text style={s.title}>Create account</Text>
        <Text style={s.subtitle}>Start turning goals into action plans</Text>

        {/* OAuth buttons */}
        <View style={s.oauthGroup}>
          <Pressable
            style={({ pressed }) => [s.oauthButton, pressed && s.buttonPressed]}
            onPress={() => handleOAuth("oauth_google")}
          >
            <Feather name="globe" size={18} color={colors.foreground} />
            <Text style={s.oauthText}>Continue with Google</Text>
          </Pressable>
          {Platform.OS === "ios" && (
            <Pressable
              style={({ pressed }) => [s.oauthButton, pressed && s.buttonPressed]}
              onPress={() => handleOAuth("oauth_apple")}
            >
              <Feather name="smartphone" size={18} color={colors.foreground} />
              <Text style={s.oauthText}>Continue with Apple</Text>
            </Pressable>
          )}
        </View>

        <View style={s.dividerRow}>
          <View style={s.divider} />
          <Text style={s.dividerText}>or</Text>
          <View style={s.divider} />
        </View>

        {/* Email/password form */}
        <View style={s.form}>
          <TextInput
            style={s.input}
            autoCapitalize="none"
            value={emailAddress}
            placeholder="Email address"
            placeholderTextColor={colors.mutedForeground}
            onChangeText={setEmailAddress}
            keyboardType="email-address"
            autoComplete="email"
          />
          {errors?.fields?.emailAddress && (
            <Text style={s.errorText}>{errors.fields.emailAddress.message}</Text>
          )}
          <TextInput
            style={s.input}
            value={password}
            placeholder="Password"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            onChangeText={setPassword}
            autoComplete="new-password"
          />
          {errors?.fields?.password && (
            <Text style={s.errorText}>{errors.fields.password.message}</Text>
          )}
          <Pressable
            style={({ pressed }) => [
              s.button,
              (!emailAddress || !password || isLoading) && s.buttonDisabled,
              pressed && s.buttonPressed,
            ]}
            onPress={handleSubmit}
            disabled={!emailAddress || !password || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={s.buttonText}>Create account</Text>
            )}
          </Pressable>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>Already have an account? </Text>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable>
              <Text style={s.footerLink}>Sign in</Text>
            </Pressable>
          </Link>
        </View>

        <View nativeID="clerk-captcha" />
      </View>
    </KeyboardAvoidingView>
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
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
    },
    content: {
      flex: 1,
      paddingHorizontal: 28,
      justifyContent: "center",
    },
    logoRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 32,
    },
    logoIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.primary,
      marginRight: 10,
    },
    logoText: {
      fontSize: 22,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
    },
    title: {
      fontSize: 28,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontFamily: "Inter_700Bold",
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 15,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginBottom: 24,
    },
    oauthGroup: {
      gap: 10,
      marginBottom: 20,
    },
    oauthButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      paddingVertical: 13,
      backgroundColor: colors.card,
    },
    oauthText: {
      fontSize: 15,
      color: colors.foreground,
      fontFamily: "Inter_500Medium",
    },
    dividerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 20,
      gap: 12,
    },
    divider: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerText: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    form: {
      gap: 12,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.foreground,
      backgroundColor: colors.card,
      fontFamily: "Inter_400Regular",
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 15,
      alignItems: "center" as const,
      marginTop: 4,
    },
    buttonDisabled: { opacity: 0.5 },
    buttonPressed: { opacity: 0.85 },
    buttonText: {
      color: colors.primaryForeground,
      fontSize: 16,
      fontWeight: "600" as const,
      fontFamily: "Inter_600SemiBold",
    },
    linkButton: {
      alignItems: "center" as const,
      paddingVertical: 10,
    },
    linkText: {
      color: colors.primary,
      fontSize: 14,
      fontFamily: "Inter_500Medium",
    },
    footer: {
      flexDirection: "row" as const,
      justifyContent: "center" as const,
      marginTop: 28,
    },
    footerText: {
      color: colors.mutedForeground,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
    },
    footerLink: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "600" as const,
      fontFamily: "Inter_600SemiBold",
    },
    errorText: {
      color: colors.destructive,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
    },
  });
}
