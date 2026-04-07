"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  ShieldCheck,
  MessageSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Logo } from "./logo"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { useUser } from "@/lib/user-context"

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    color: "bg-lavender",
    activeColor: "text-primary",
    adminOnly: false,
  },
  {
    href: "/dashboard/analytics",
    label: "Analytics",
    icon: BarChart3,
    color: "bg-sky",
    activeColor: "text-primary",
    adminOnly: false,
  },
  {
    href: "/dashboard/users",
    label: "Authorized Users",
    icon: Users,
    color: "bg-mint",
    activeColor: "text-success",
    adminOnly: true,
  },
  {
    href: "/dashboard/logs",
    label: "Logs & Reports",
    icon: FileText,
    color: "bg-peach",
    activeColor: "text-warning",
    adminOnly: false,   // ✅ changed from true → both admin and user can see logs
  },
  {
    href: "/dashboard/feedback",
    label: "Feedback",
    icon: MessageSquare,
    color: "bg-sky",
    activeColor: "text-primary",
    adminOnly: false,
  },
  {
    href: "/dashboard/settings",
    label: "System Settings",
    icon: Settings,
    color: "bg-lilac",
    activeColor: "text-primary",
    adminOnly: false,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, isAdmin } = useUser()
  const [collapsed, setCollapsed] = useState(false)

  const filteredNavItems = navItems.filter((item) => !item.adminOnly || isAdmin)

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen flex flex-col transition-all duration-200 z-50",
        "bg-card border-r border-border",
        collapsed ? "w-20" : "w-64",
      )}
    >
      <div className="h-1 bg-gradient-to-r from-lavender via-mint to-peach" />

      <div
        className={cn(
          "p-5 border-b border-border flex items-center",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        <Logo size="sm" showText={!collapsed} />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-muted-foreground hover:text-foreground hover:bg-muted hidden lg:flex rounded-lg"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {!collapsed && user && (
        <div className="px-4 py-3 border-b border-border">
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium",
              isAdmin ? "bg-lavender/50 text-primary" : "bg-mint/50 text-foreground",
            )}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {isAdmin
                ? "Administrator"
                : user.role === "guest"
                ? "Guest User"
                : "Registered User"}
            </span>
          </div>
        </div>
      )}

      <nav className="flex-1 p-3 space-y-1">
        {filteredNavItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
                collapsed && "justify-center px-2",
              )}
            >
              <div
                className={cn(
                  "p-2 rounded-lg transition-colors duration-150",
                  isActive ? item.color : "bg-muted",
                )}
              >
                <item.icon
                  className={cn(
                    "w-4 h-4",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                />
              </div>

              {!collapsed && <span className="text-sm">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground transition-colors duration-150",
            "hover:text-danger hover:bg-blush/30",
            collapsed && "justify-center px-2",
          )}
        >
          <div className="p-2 rounded-lg bg-muted">
            <LogOut className="w-4 h-4" />
          </div>
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </Link>
      </div>
    </aside>
  )
}
