import type { QueryClient } from "@tanstack/react-query";

type Search = Record<string, unknown>;
const memories = new WeakMap<QueryClient, Map<string, Search>>();

/** Per workspace session, bounded and never shared between SSR requests. */
export function navigationMemory(client: QueryClient) {
  let memory = memories.get(client);
  if (!memory) {
    memory = new Map();
    memories.set(client, memory);
  }
  return {
    read: (path: string): Search => memory.get(path) ?? {},
    save: (path: string, search: Search) => {
      memory.delete(path);
      memory.set(path, { ...search });
      if (memory.size > 20) {
        const oldest = memory.keys().next().value;
        if (oldest !== undefined) memory.delete(oldest);
      }
    },
    clear: () => memory.clear(),
  };
}

export function validateMenuSearch(search: Search): Search {
  // Keep URL values serializable; controls apply their existing value restrictions.
  return Object.fromEntries(
    Object.entries(search).filter(
      ([, value]) =>
        typeof value === "string" ||
        typeof value === "number" ||
        value === null ||
        (Array.isArray(value) && value.every((v) => typeof v === "number")),
    ),
  );
}
