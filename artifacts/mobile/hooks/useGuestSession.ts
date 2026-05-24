import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { useEffect, useState } from "react";

const GUEST_SESSION_KEY = "goalgetter_guest_session_id";

export function useGuestSession() {
  const [guestSessionId, setGuestSessionId] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(GUEST_SESSION_KEY).then((existing) => {
      if (existing) {
        setGuestSessionId(existing);
      } else {
        const id = Crypto.randomUUID();
        AsyncStorage.setItem(GUEST_SESSION_KEY, id).catch(() => {});
        setGuestSessionId(id);
      }
    });
  }, []);

  return guestSessionId;
}
