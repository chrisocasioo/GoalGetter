import { useSSO, useSignIn } from "@clerk/expo";
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

// Required: complete any pending auth sessions
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

export default function SignInScreen() {
  useWarmUpBrowser();
  const { signIn, errors, fetchStatus } = useSignIn();
  const { startSSOFlow } = useSSO();
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
    const { error } = await signIn.password({ emailAddress, password });
    if (error) return;
    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return;
          const url = decorateUrl("/");
          if (!url.startsWith("http")) router.replace(url as Href);
        },
      });
    }
  };

  const handleVerify = async () => {
    await signIn.mfa.verifyEmailCode({ code });
    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return;
          const url = decorateUrl("/");
          if (!url.startsWith("http")) router.replace(url as Href);
        },
      });
    }
  };

  const s = makeStyles(colors, insets);

  if (signIn.status === "needs_client_trust") {
    return (
      <View style={s.container}>
        <View style={s.content}>
          <Text style={s.title}>Check your email</Text>
          <Text style={s.subtitle}>Enter the verification code we sent you</Text>
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
          <Pressable style={s.linkButton} onPress={() => signIn.mfa.sendEmailCode()}>
            <Text style={s.linkText}>Resend code</Text>
          </Pressable>
          <Pressable style={s.linkButton} onPress={() => signIn.reset()}>
            <Text style={s.linkText}>Start over</Text>
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
        <Text style={s.title}>Welcome back</Text>
        <Text style={s.subtitle}>Sign in to your account</Text>

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
          {errors?.fields?.identifier && (
            <Text style={s.errorText}>{errors.fields.identifier.message}</Text>
          )}
          <TextInput
            style={s.input}
            value={password}
            placeholder="Password"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            onChangeText={setPassword}
            autoComplete="password"
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
              <Text style={s.buttonText}>Continue</Text>
            )}
          </Pressable>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>Don&apos;t have an account? </Text>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable>
              <Text style={s.footerLink}>Sign up</Text>
            </Pressable>
          </Link>
        </View>
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
