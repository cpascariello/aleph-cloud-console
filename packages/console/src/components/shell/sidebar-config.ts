import type { NavItem } from "@dt/types/nav";
import {
  LayoutDashboard,
  Activity,
  Server,
  Key,
  HardDrive,
  Globe,
  FileCode,
  Store,
  Package,
  User,
  CreditCard,
} from "lucide-react";
import { createElement } from "react";

function icon(component: typeof LayoutDashboard): React.ReactNode {
  return createElement(component, { size: 18 });
}

export const sidebarItems: NavItem[] = [
  {
    id: "overview",
    label: "Overview",
    children: [
      {
        id: "dashboard",
        label: "Dashboard",
        href: "/dashboard",
        icon: icon(LayoutDashboard),
      },
      {
        id: "monitoring",
        label: "Monitoring",
        href: "/monitoring",
        icon: icon(Activity),
        disabled: true,
      },
    ],
  },
  {
    id: "compute",
    label: "Compute",
    children: [
      {
        id: "compute-resources",
        label: "Compute",
        href: "/compute",
        icon: icon(Server),
      },
      {
        id: "ssh-keys",
        label: "SSH Keys",
        href: "/compute/ssh-keys",
        icon: icon(Key),
      },
    ],
  },
  {
    id: "infrastructure",
    label: "Infrastructure",
    children: [
      {
        id: "volumes",
        label: "Volumes",
        href: "/infrastructure/volumes",
        icon: icon(HardDrive),
      },
      {
        id: "domains",
        label: "Domains",
        href: "/infrastructure/domains",
        icon: icon(Globe),
      },
      {
        id: "websites",
        label: "Websites",
        href: "/infrastructure/websites",
        icon: icon(FileCode),
      },
    ],
  },
  {
    id: "marketplace",
    label: "Marketplace",
    children: [
      {
        id: "templates",
        label: "Templates",
        href: "/marketplace/templates",
        icon: icon(Store),
        disabled: true,
      },
      {
        id: "images",
        label: "Community Images",
        href: "/marketplace/images",
        icon: icon(Package),
        disabled: true,
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    children: [
      {
        id: "account",
        label: "Account",
        href: "/settings/account",
        icon: icon(User),
        disabled: true,
      },
      {
        id: "billing",
        label: "Billing",
        href: "/settings/billing",
        icon: icon(CreditCard),
        disabled: true,
      },
    ],
  },
];

export function findActiveId(pathname: string): string {
  for (const group of sidebarItems) {
    if (!group.children) continue;
    for (const item of group.children) {
      if (!item.href) continue;
      if (item.href === pathname || pathname.startsWith(`${item.href}/`)) {
        return item.id;
      }
    }
  }
  return "dashboard";
}
