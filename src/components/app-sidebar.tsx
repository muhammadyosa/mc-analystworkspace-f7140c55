import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Upload,
  Database,
  Target,
  ListTodo,
  Users,
  Wrench,
  FileText,
  UserSearch,
} from "lucide-react";
import iconnetLogo from "@/assets/iconnet-logo.png.asset.json";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const nav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Master Cluster", url: "/master", icon: Database },
  { title: "Analyst Market", url: "/analyst", icon: UserSearch },
  { title: "Priority Engine", url: "/priority", icon: Target },
  { title: "Action Plan", url: "/action-plan", icon: ListTodo },
  { title: "Customer Loyalty", url: "/loyalty", icon: Users },
  { title: "Competitor", url: "/competitor", icon: Wrench },
  { title: "Data Management", url: "/upload", icon: Upload },
  { title: "Reports", url: "/reports", icon: FileText },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (p: string) => (p === "/" ? pathname === "/" : pathname.startsWith(p));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-center px-2 py-3">
          <img src={iconnetLogo.url} alt="Iconnet" className="h-9 w-9 object-contain" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="py-2">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {nav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="justify-center group-data-[collapsible=icon]:px-2"
                  >
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
