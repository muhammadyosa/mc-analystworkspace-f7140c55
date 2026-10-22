import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/")({
  head: () => ({
    meta: [
      { title: "Settings — MCA Analyst Workspace" },
      {
        name: "description",
        content: "Pengaturan data, pengguna, dan preferensi MCA Analyst Workspace.",
      },
      { property: "og:title", content: "Settings — MCA Analyst Workspace" },
      {
        property: "og:description",
        content: "Pengaturan data, pengguna, dan preferensi MCA Analyst Workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/settings/data" });
  },
});
