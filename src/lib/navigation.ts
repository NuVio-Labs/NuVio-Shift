import {
  CalendarIcon,
  ClockIcon,
  HomeIcon,
  LayoutTemplateIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  type LucideIcon,
} from "lucide-react";

import type { UserRole } from "@/types/domain";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/app",
    label: "Dashboard",
    icon: HomeIcon,
    roles: ["admin", "scheduler", "employee"],
  },
  {
    href: "/app/dienstplan",
    label: "Dienstplan",
    icon: CalendarIcon,
    roles: ["admin", "scheduler"],
  },
  {
    href: "/app/schichtvorlagen",
    label: "Schichtvorlagen",
    icon: LayoutTemplateIcon,
    roles: ["admin", "scheduler"],
  },
  {
    href: "/app/meine-schichten",
    label: "Meine Schichten",
    icon: ClockIcon,
    roles: ["admin", "scheduler", "employee"],
  },
  {
    href: "/app/admin",
    label: "Verwaltung",
    icon: ShieldCheckIcon,
    roles: ["admin"],
  },
  {
    href: "/app/admin/onboarding",
    label: "Onboarding",
    icon: UserPlusIcon,
    roles: ["admin"],
  },
  {
    href: "/app/einstellungen",
    label: "Einstellungen",
    icon: SettingsIcon,
    roles: ["admin", "scheduler", "employee"],
  },
];
