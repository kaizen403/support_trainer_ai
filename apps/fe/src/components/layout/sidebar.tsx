"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, GraduationCap, Settings, BarChart2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className={cn("pb-12 h-screen border-r", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Sales Training
          </h2>
          <div className="space-y-1">
            <Link href="/dashboard" passHref>
              <Button
                variant={pathname === "/dashboard" ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/trainings" passHref>
              <Button
                variant={pathname.startsWith("/trainings") ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                <GraduationCap className="mr-2 h-4 w-4" />
                Training
              </Button>
            </Link>
            <Link href="/admin/analytics" passHref>
              <Button
                variant={pathname.startsWith("/admin/analytics") ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                <BarChart2 className="mr-2 h-4 w-4" />
                Analytics
              </Button>
            </Link>
            <Link href="/settings/team" passHref>
              <Button
                variant={pathname.startsWith("/settings/team") ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                <Users className="mr-2 h-4 w-4" />
                Team
              </Button>
            </Link>
            <Link href="/settings/org" passHref>
              <Button
                variant={pathname.startsWith("/settings/org") ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
