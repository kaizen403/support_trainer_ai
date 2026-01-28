import { Sidebar } from "./sidebar"
import { Header } from "./header"

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen w-full">
      <div className="hidden border-r bg-background lg:block lg:w-60">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 p-8 pt-6">
          {children}
        </main>
      </div>
    </div>
  )
}
