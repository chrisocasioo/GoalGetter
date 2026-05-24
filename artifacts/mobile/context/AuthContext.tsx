import { useAuth, useUser } from "@clerk/expo";
import { setAuthTokenGetter, syncUser } from "@workspace/api-client-react";
import React, { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

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
      syncUser({
        clerkUserId: user.id,
        email: user.primaryEmailAddress.emailAddress,
      }).catch(() => {});
    }
  }, [isSignedIn, user?.id]);

  return null;
}
