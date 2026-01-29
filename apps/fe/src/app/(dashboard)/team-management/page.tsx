import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const roster = [
  { name: "Alex Morgan", role: "Trainee", status: "Active" },
  { name: "Jordan Lee", role: "Trainee", status: "In Training" },
  { name: "Taylor Quinn", role: "Coach", status: "Available" },
]

export default function TeamManagementPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team Management</h1>
        <p className="text-sm text-muted-foreground">
          Track trainee progress, compare performance, and assign scenarios.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trainee Roster</CardTitle>
          <CardDescription>Skill progression and current training focus.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {roster.map((member) => (
            <div key={member.name} className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="font-medium text-foreground">{member.name}</p>
                <p className="text-xs text-muted-foreground">{member.role}</p>
              </div>
              <Badge variant="secondary">{member.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Comparative Performance</CardTitle>
            <CardDescription>Side-by-side skill trends and outcomes.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Comparative charts will visualize team progression and coaching impact.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scenario Assignments</CardTitle>
            <CardDescription>Assign specific training scenarios or documents.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Assignments will appear here with due dates and completion status.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
