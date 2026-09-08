"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Drawer } from "@base-ui/react/drawer";
import {
  CalendarIcon,
  ChevronRightIcon,
  LogOutIcon,
  MenuIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserIcon,
} from "lucide-react";
import { cn } from "cn";

import { logout } from "@/lib/auth/actions";
import type { CurrentUserProfile } from "@/lib/auth/profile";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { NAV_ITEMS } from "@/lib/navigation";
import { useWeather } from "@/lib/useWeather";
import {
  DEFAULT_WEATHER_ICON,
  WEATHER_CODE_ICONS,
  describeWeatherCode,
  getWeatherGradient,
} from "@/lib/weather";
import { Button, LinkButton, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/**
 * Picks the single best-matching nav item for the current path, by longest
 * href match — otherwise a nested route like `/app/admin/onboarding` would
 * highlight both "Verwaltung" (`/app/admin`) and "Onboarding" at once.
 */
function findActiveHref(pathname: string, items: { href: string }[]): string | null {
  let best: string | null = null;
  for (const item of items) {
    const matches = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
    if (matches && (best === null || item.href.length > best.length)) {
      best = item.href;
    }
  }
  return best;
}

export function NavDrawer({
  profile,
  children,
}: {
  profile: CurrentUserProfile;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(profile.role));
  const activeHref = findActiveHref(pathname, items);
  const weather = useWeather();
  const today = dateFormatter.format(new Date());

  const WeatherIcon =
    weather.status === "ok"
      ? WEATHER_CODE_ICONS[weather.code] ?? DEFAULT_WEATHER_ICON
      : DEFAULT_WEATHER_ICON;
  const gradient =
    weather.status === "ok" ? getWeatherGradient(weather.code) : "from-slate-300 to-slate-400";

  return (
    <Drawer.Root open={open} onOpenChange={setOpen} swipeDirection="left">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background px-4">
        <Drawer.Trigger
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <MenuIcon />
          <span className="sr-only">Menü öffnen</span>
        </Drawer.Trigger>
        <span className="text-sm font-semibold text-foreground">
          NuVio Shift
        </span>
      </header>

      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-50 bg-black/40 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <Drawer.Viewport className="fixed inset-0 z-50 flex items-stretch justify-start">
          <Drawer.Popup className="flex w-72 max-w-[85vw] flex-col gap-6 overflow-y-auto bg-popover p-4 text-popover-foreground ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:slide-in-from-left data-closed:animate-out data-closed:slide-out-to-left">
            <div
              className={cn(
                "relative overflow-hidden rounded-xl bg-linear-to-br p-4 text-white shadow-sm transition-colors duration-500",
                gradient
              )}
            >
              <WeatherIcon className="pointer-events-none absolute -top-4 -right-4 size-24 text-white/25" />
              <div className="relative flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <UserIcon className="size-4 text-white/80" />
                  {profile.name}
                </div>
                <div className="flex items-center gap-2 text-sm text-white/90">
                  <ShieldCheckIcon className="size-4" />
                  {ROLE_LABELS[profile.role]}
                </div>
                <div className="flex items-center gap-2 text-sm text-white/90">
                  <CalendarIcon className="size-4" />
                  {today}
                </div>
                <div className="flex items-center gap-2 text-sm text-white/90">
                  <WeatherIcon className="size-4" />
                  {weather.status === "loading" && "Wetter wird geladen…"}
                  {weather.status === "unavailable" && "Wetter nicht verfügbar"}
                  {weather.status === "ok" &&
                    `${weather.temperatureC}°C, ${describeWeatherCode(weather.code)}`}
                </div>
              </div>
            </div>

            <Separator />

            <nav className="flex flex-col gap-1">
              {items.map((item) => {
                const active = item.href === activeHref;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                      active
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                );
              })}
            </nav>

            <LinkButton
              variant="outline"
              href="https://paypal.me/NuVioLabs?locale.x=de_DE&country.x=DE"
              target="_blank"
              rel="noopener noreferrer"
              className="justify-start gap-2"
            >
              <SparklesIcon className="size-4" />
              Pro
            </LinkButton>

            <Separator className="mt-auto" />

            <form action={logout}>
              <Button
                type="submit"
                variant="destructive"
                className="w-full justify-start gap-2"
              >
                <LogOutIcon className="size-4" />
                Abmelden
              </Button>
            </form>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Link
                href="/impressum"
                onClick={() => setOpen(false)}
                className="hover:text-foreground"
              >
                Impressum
              </Link>
              <span>|</span>
              <Link
                href="/datenschutz"
                onClick={() => setOpen(false)}
                className="hover:text-foreground"
              >
                Datenschutz
              </Link>
            </div>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>

      {children}
    </Drawer.Root>
  );
}
