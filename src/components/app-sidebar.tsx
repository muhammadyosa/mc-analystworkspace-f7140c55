import { Link, useRouterState } from "@tanstack/react-router";
import {
  Check,
  LayoutDashboard,
  Database,
  Moon,
  Palette,
  Sun,
  Target,
  ListTodo,
  Users,
  FileText,
  UserSearch,
  Settings,
  Radar,
} from "lucide-react";
import iconnetLogo from "@/assets/iconnet-logo.png.asset.json";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type ColorTheme, useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

const nav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Master Cluster", url: "/master", icon: Database },
  { title: "Analyst Market", url: "/analyst", icon: UserSearch },
  { title: "Priority Engine", url: "/priority", icon: Target },
  { title: "Action Plan", url: "/action-plan", icon: ListTodo },
  { title: "Customer Loyalty", url: "/loyalty", icon: Users },
  { title: "Competitor Intelligence", url: "/competitor-intel", icon: Radar },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Settings", url: "/settings", icon: Settings },
];

const colorThemes: { id: ColorTheme; label: string; swatch: string }[] = [
  { id: "slate", label: "Slate Professional", swatch: "theme-swatch-slate" },
  { id: "cyber", label: "Cyber Ocean", swatch: "theme-swatch-cyber" },
  { id: "emerald", label: "Emerald Forest", swatch: "theme-swatch-emerald" },
  { id: "amethyst", label: "Royal Amethyst", swatch: "theme-swatch-amethyst" },
  { id: "crimson", label: "Charcoal Crimson", swatch: "theme-swatch-crimson" },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { theme, colorTheme, toggle, setColorTheme } = useTheme();
  const isActive = (p: string) => (p === "/" ? pathname === "/" : pathname.startsWith(p));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-3 py-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-3">
          <img
            src={iconnetLogo.url}
            alt="Iconnet"
            className="h-9 w-9 object-contain group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8"
          />
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="truncate font-display text-sm font-bold leading-tight">Iconnet</div>
            <div className="truncate text-[10px] text-muted-foreground">MCA Workspace</div>
          </div>
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
                    className="justify-start group-data-[collapsible=icon]:justify-center"
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
      <SidebarFooter className="border-t border-sidebar-border p-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
        <Button
          type="button"
          variant="ghost"
          onClick={toggle}
          className="w-full justify-start gap-3 px-2 text-sidebar-foreground group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          aria-label={theme === "dark" ? "Aktifkan Light Mode" : "Aktifkan Dark Mode"}
        >
          {theme === "dark" ? <Sun className="h-4 w-4 text-warning" /> : <Moon className="h-4 w-4 text-warning" />}
          <span className="group-data-[collapsible=icon]:hidden">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start gap-3 px-2 text-sidebar-foreground group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
              aria-label="Pilih tema warna"
            >
              <span className={cn("theme-swatch", colorThemes.find((item) => item.id === colorTheme)?.swatch)} aria-hidden="true" />
              <span className="truncate group-data-[collapsible=icon]:hidden">
                {colorThemes.find((item) => item.id === colorTheme)?.label}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent side="right" align="end" className="w-52 p-2">
            <div className="mb-1 flex items-center gap-2 px-2 py-1.5 text-xs font-semibold">
              <Palette className="h-3.5 w-3.5 text-primary" /> Tema Warna
            </div>
            <div className="space-y-0.5">
              {colorThemes.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant="ghost"
                  onClick={() => setColorTheme(item.id)}
                  className="h-8 w-full justify-start gap-2 px-2 text-xs font-normal"
                >
                  <span className={cn("theme-swatch", item.swatch)} aria-hidden="true" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {colorTheme === item.id && <Check className="h-3.5 w-3.5" />}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <p className="pt-2 text-center text-[9px] text-sidebar-foreground/45 group-data-[collapsible=icon]:hidden">
          © RZ Corp. All Rights Reserved
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
