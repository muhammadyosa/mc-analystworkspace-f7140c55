import { useEffect, useMemo, useState } from "react";
import { useDataStore } from "@/lib/store";
import { summarizeActions } from "@/lib/action-plan-summary";

export function useClusterActions(cluster: string) {
  const plans = useDataStore((s) => s.actionPlans);
  const [day, setDay] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setDay((d) => d + 1), 60_000);
    return () => clearInterval(timer);
  }, []);
  return useMemo(() => summarizeActions(plans, cluster, new Date(Date.now() + day * 0)), [plans, cluster, day]);
}