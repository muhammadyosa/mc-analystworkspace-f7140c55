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

    async function beat() {
      if (!userId || document.visibilityState === "hidden") return;
      await supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", userId)
        .then(() => undefined);
    }

    async function start(uid: string) {
      userId = uid;
      await beat();
      timer = setInterval(beat, HEARTBEAT_MS);
    }

    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled && data.user) void start(data.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user && session.user.id !== userId) void start(session.user.id);
      if (!session?.user) userId = null;
    });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      sub.subscription.unsubscribe();
    };
  }, []);
}
