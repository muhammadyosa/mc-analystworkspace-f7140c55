import { Link, useRouterState } from "@tanstack/react-router";
import {
  Check,
  ChevronLeft,
  Moon,
  Palette,
  Sun,
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type ColorTheme, useTheme } from "@/hooks/use-theme";
import { useRole } from "@/hooks/use-role";
import { cn } from "@/lib/utils";

const nav = [
  { title: "Dashboard", url: "/", emoji: "🖥️" },
  { title: "Master Cluster", url: "/master", emoji: "🗃️" },
  { title: "Analyst Market", url: "/analyst", emoji: "📊" },
  { title: "Priority Engine", url: "/priority", emoji: "📟" },
  { title: "Action Plan", url: "/action-plan", emoji: "📑" },
  { title: "Customer Loyalty", url: "/loyalty", emoji: "👥" },
  { title: "Competitor Intelligence", url: "/competitor-intel", emoji: "🛰️" },
  { title: "Reports", url: "/reports", emoji: "📝" },
  { title: "Settings", url: "/settings", emoji: "⚙️" },
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
  const { state, openMobile, isMobile, toggleSidebar, setOpenMobile } = useSidebar();
  const { isAdmin } = useRole();
  const items = nav.filter((item) => item.url !== "/settings" || isAdmin);
  const isActive = (p: string) => (p === "/" ? pathname === "/" : pathname.startsWith(p));
  const menuOpen = isMobile ? openMobile : state === "expanded";

  return (
    <Sidebar collapsible="icon">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={menuOpen}
            className="sidebar-toggle-float absolute -right-[22px] top-1/2 z-50 flex size-11 -translate-y-1/2 rounded-full p-0"
          >
            <span className="sidebar-toggle-face flex size-5 items-center justify-center rounded-full" aria-hidden="true">
            <ChevronLeft
              className={cn(
                "h-3 w-3 shrink-0 transition-transform duration-300 ease-out",
                !menuOpen && "rotate-180",
              )}
            />
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {menuOpen ? "Tutup menu" : "Buka menu"}
        </TooltipContent>
      </Tooltip>
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
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="h-11 justify-start gap-3 group-data-[collapsible=icon]:justify-center"
                  >
                    <Link to={item.url} onClick={() => setOpenMobile(false)} className="flex items-center gap-3">
                      <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center text-lg leading-none">{item.emoji}</span>
                      <span className="min-w-0 group-data-[collapsible=icon]:hidden">{item.title}</span>
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
