import { useCallback, type Dispatch, type SetStateAction } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { navigationMemory } from "@/lib/navigation-state";

/** URL state survives unmounts; only small search values are kept, never hidden pages. */
export function useMenuState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const router = useRouter();
  const client = useQueryClient();
  const value = useRouterState({
    select: (state) => state.location.search[key],
  });
  const current = value === undefined ? initial : value as T;
  const setValue = useCallback<Dispatch<SetStateAction<T>>>((update) => {
    const location = router.state.location;
    const previous = location.search[key] === undefined ? initial : location.search[key] as T;
    const next = typeof update === "function"
      ? (update as (value: T) => T)(previous)
      : update;
    const search = { ...location.search, [key]: next };
    navigationMemory(client).save(location.pathname, search);
    void router.navigate({ to: location.pathname, search, replace: true, resetScroll: false });
  }, [client, initial, key, router]);
  return [current, setValue];
}

export function useMenuSearch() {
  const client = useQueryClient();
  return (path: string) => navigationMemory(client).read(path);
}