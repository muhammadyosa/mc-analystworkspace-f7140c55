import { useEffect, useMemo, useState } from "react";
import { useDataStore } from "@/lib/store";
import { summarizeActions } from "@/lib/action-plan-summary";

export function useClusterActions(cluster: string) {
  const plans = useDataStore((s) => s.actionPlans);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return useMemo(() => summarizeActions(plans, cluster, now), [plans, cluster, now]);
}
