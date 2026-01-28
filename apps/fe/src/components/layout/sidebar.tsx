"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  LayoutDashboard,
  GraduationCap,
  BarChart2,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  ChevronDown,
  LogOut,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  subItems?: { label: string; href: string }[]
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Trainings",
    href: "/trainings",
    icon: GraduationCap,
    subItems: [
      { label: "All Trainings", href: "/trainings" },
      { label: "My Sessions", href: "/employee" },
    ],
  },
  {
    label: "Analytics",
    href: "/admin/analytics",
    icon: BarChart2,
  },
]

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [expandedItem, setExpandedItem] = useState<string | null>("Trainings")
  const [searchQuery, setSearchQuery] = useState("")

  const toggleExpanded = (label: string) => {
    setExpandedItem(expandedItem === label ? null : label)
  }

  const handleLogout = async () => {
    await authClient.signOut()
    window.location.href = "/login"
  }

  return (
    <div
      className={cn(
        "relative flex flex-col h-screen backdrop-blur-xl border-r border-white/5 transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        "bg-black",
        className
      )}
    >
      {/* Collapse Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 z-50 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 shadow-lg hover:bg-zinc-700 transition-all"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>

      {/* Logo Section */}
      <div className="relative flex items-center gap-3 px-4 py-5 border-b border-white/5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-800 shadow-lg">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">AI Training</span>
            <span className="text-sm font-bold text-white tracking-tight">Sales Coach</span>
          </div>
        )}
      </div>

      {/* Search Bar */}
      {!collapsed && (
        <div className="relative px-3 py-4">
          <Search className="absolute left-6 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 border-0 bg-zinc-900/50 pl-9 text-sm text-zinc-300 placeholder:text-zinc-600 focus-visible:ring-2 focus-visible:ring-zinc-700 rounded-lg"
          />
        </div>
      )}

      {/* Main Navigation */}
      <div className="relative flex-1 overflow-y-auto px-2 py-2">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            const isExpanded = expandedItem === item.label && !collapsed
            const Icon = item.icon

            return (
              <div key={item.label}>
                <Link href={item.href} passHref>
                  <Button
                    variant="ghost"
                    onClick={(e) => {
                      if (item.subItems) {
                        e.preventDefault()
                        toggleExpanded(item.label)
                      }
                    }}
                    className={cn(
                      "w-full justify-start gap-3 px-3 py-2 h-10 text-sm font-medium transition-all rounded-lg",
                      isActive
                        ? "bg-zinc-800 text-white hover:bg-zinc-700"
                        : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200",
                      collapsed && "justify-center px-2"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-white")} />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.subItems && (
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 shrink-0 text-zinc-600 transition-transform duration-200",
                              isExpanded && "rotate-180"
                            )}
                          />
                        )}
                      </>
                    )}
                  </Button>
                </Link>

                {/* Sub Items */}
                {!collapsed && isExpanded && item.subItems && (
                  <div className="relative mt-1 space-y-1 border-l-2 border-zinc-800 ml-5 pl-4">
                    {item.subItems.map((subItem) => {
                      const isSubActive = pathname === subItem.href
                      return (
                        <Link key={subItem.label} href={subItem.href} passHref>
                          <Button
                            variant="ghost"
                            className={cn(
                              "w-full justify-start py-1.5 h-8 text-sm transition-all rounded-md",
                              isSubActive
                                ? "text-white bg-zinc-800"
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                            )}
                          >
                            {subItem.label}
                          </Button>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </div>

      {/* Bottom Actions */}
      <div className="relative p-3 border-t border-white/5 space-y-2">
        <Button
          onClick={() => window.location.href = "/trainings"}
          className={cn(
            "w-full bg-zinc-800 hover:bg-zinc-700 text-white shadow-lg transition-all border-0 rounded-lg",
            collapsed && "h-10 w-10 p-0"
          )}
        >
          <Plus className="h-4 w-4" />
          {!collapsed && <span className="ml-2 font-medium">New Training</span>}
        </Button>
        
        <Button
          onClick={handleLogout}
          variant="ghost"
          className={cn(
            "w-full text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-all rounded-lg",
            collapsed && "h-10 w-10 p-0"
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Logout</span>}
        </Button>
      </div>
    </div>
  )
}
