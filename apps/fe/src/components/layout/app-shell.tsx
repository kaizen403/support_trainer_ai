"use client"

import { Sidebar } from "./sidebar"

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen w-full bg-black">
      {/* Subtle gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-zinc-950 to-black pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900/20 via-transparent to-transparent pointer-events-none" />

      <div className="hidden lg:block fixed left-0 top-0 z-40">
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 lg:ml-64 relative">
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
