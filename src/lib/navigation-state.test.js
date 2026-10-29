import { test, expect } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { navigationMemory, validateMenuSearch } from "./navigation-state.ts";

test("menu searches remain independent and preserve filter, page and tab values", () => {
  const memory = navigationMemory(new QueryClient());
  memory.save("/master", { q: "SUNGGUMINASA", risk: "Tinggi", page: 2 });
  memory.save("/reports", { tab: "monthly", mFrom: 8, mTo: 9 });
  expect(memory.read("/master")).toEqual({ q: "SUNGGUMINASA", risk: "Tinggi", page: 2 });
  expect(memory.read("/reports").tab).toBe("monthly");
});

test("navigation memory is bounded and isolated between users/SSR clients", () => {
  const first = navigationMemory(new QueryClient());
  const second = navigationMemory(new QueryClient());
  for (let i = 0; i < 21; i++) first.save(`/menu-${i}`, { page: i });
  expect(first.read("/menu-0")).toEqual({});
  expect(first.read("/menu-20")).toEqual({ page: 20 });
  expect(second.read("/menu-20")).toEqual({});
  first.clear();
  expect(first.read("/menu-20")).toEqual({});
});

test("search validation retains date ranges and comparison weeks, excluding nonserializable data", () => {
  expect(validateMenuSearch({ from: "2026-10-01", weeks: [1, 2], fn: () => {}, bad: [{}] }))
    .toEqual({ from: "2026-10-01", weeks: [1, 2] });
});