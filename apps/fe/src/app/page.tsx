import { AppShell } from "@/components/layout/app-shell"

export default function Home() {
  return (
    <AppShell>
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Dashboard content will go here */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Total Employees</h3>
          </div>
          <div className="text-2xl font-bold">0</div>
        </div>
      </div>
    </AppShell>
  )
}
