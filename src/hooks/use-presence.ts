import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const HEARTBEAT_MS = 60_000;

/**
 * Keeps profiles.last_seen_at fresh while the user is signed in,
 * so admins can see Online status and Last Action in User Management.
 */
export function usePresenceHeartbeat() {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    let userId: string | null = null;
    let cancelled = false;
    let beating = false;

    async function beat() {
      if (cancelled || beating || !userId || document.visibilityState === "hidden") return;
      beating = true;
      try {
        await supabase
          .from("profiles")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", userId)
          .then(() => undefined);
      } finally {
        beating = false;
      }
    }

    async function start(uid: string) {
      if (cancelled) return;
      if (timer) clearInterval(timer);
      userId = uid;
      void beat();
      timer = setInterval(beat, HEARTBEAT_MS);
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user && session.user.id !== userId) void start(session.user.id);
      if (!session?.user) {
        userId = null;
        if (timer) clearInterval(timer);
        timer = null;
      }
    });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      sub.subscription.unsubscribe();
    };
  }, []);
}
