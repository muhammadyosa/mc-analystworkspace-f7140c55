import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Upload,
  Database,
  Target,
  ListTodo,
  Users,
  Swords,
  FileText,
  UserSearch,
} from "lucide-react";
import iconnetLogo from "@/assets/iconnet-logo.png.asset.json";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const nav = [
  {
    label: "Analytics",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Master Cluster", url: "/master", icon: Database },
      { title: "Analyst Market", url: "/analyst", icon: UserSearch },
      { title: "Priority Engine", url: "/priority", icon: Target },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Action Plan", url: "/action-plan", icon: ListTodo },
      { title: "Customer Loyalty", url: "/loyalty", icon: Users },
      { title: "Competitor", url: "/competitor", icon: Swords },
    ],
  },
  {
    label: "Data & Reports",
    items: [
      { title: "Data Management", url: "/upload", icon: Upload },
      { title: "Reports", url: "/reports", icon: FileText },
    ],
  },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (p: string) => (p === "/" ? pathname === "/" : pathname.startsWith(p));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center">
            <img src={iconnetLogo.url} alt="Iconnet" className="h-9 w-9 object-contain" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="truncate font-display text-sm font-bold">MCA Workspace</div>
            <div className="truncate text-[10px] text-muted-foreground">Cluster Intelligence</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {nav.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="px-3 py-2 text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
          v1.0 • Enterprise Edition
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
