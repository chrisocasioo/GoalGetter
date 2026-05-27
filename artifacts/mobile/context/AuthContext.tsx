import { useAuth, useUser } from "@clerk/expo";
import { setAuthTokenGetter, syncUser } from "@workspace/api-client-react";
import * as SecureStore from "expo-secure-store";
import React, { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { REFERRAL_CODE_KEY } from "@/app/ref/[code]";

export function AuthSync() {
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const queryClient = useQueryClient();

  useEffect(() => {
    setAuthTokenGetter(async () => {
      if (!isSignedIn) return null;
      return getToken();
    });
    if (!isSignedIn) {
      queryClient.invalidateQueries();
    }
  }, [isSignedIn, getToken, queryClient]);

  useEffect(() => {
    if (isSignedIn && user?.id && user?.primaryEmailAddress?.emailAddress) {
      (async () => {
        let referralCode: string | undefined;
        try {
          const stored = await SecureStore.getItemAsync(REFERRAL_CODE_KEY);
          if (stored) {
            referralCode = stored;
          }
        } catch {
        }

        try {
          await syncUser({
            clerkUserId: user.id,
            email: user.primaryEmailAddress!.emailAddress,
            ...(referralCode ? { referralCode } : {}),
          });
          // Only clear the stored code after a successful sync so the referral
          // is not lost if the network request fails on first sign-in
          if (referralCode) {
            try {
              await SecureStore.deleteItemAsync(REFERRAL_CODE_KEY);
            } catch {
            }
          }
        } catch {
          // syncUser failed — keep the referral code in SecureStore
          // so it will be tried again on next sign-in
        }
      })();
    }
  }, [isSignedIn, user?.id]);

  return null;
}
