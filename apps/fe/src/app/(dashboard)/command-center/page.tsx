import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function CommandCenterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Training Command Center</h1>
        <p className="text-sm text-muted-foreground">
          Monitor live training activity and launch new simulations or interviews.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Live Session Status</CardTitle>
            <CardDescription>Real-time readiness for training sessions.</CardDescription>
          </div>
          <Badge variant="secondary">Idle</Badge>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No active sessions right now. Launch a simulation or schedule a guided interview.
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { title: "Angry Customer Simulation", detail: "High-pressure escalation flow" },
          { title: "Technical Troubleshooting", detail: "Complex product issue walkthrough" },
          { title: "Decision Maker Interview", detail: "Pricing + compliance objections" },
        ].map((quickStart) => (
          <Card key={quickStart.title}>
            <CardHeader>
              <CardTitle className="text-base">{quickStart.title}</CardTitle>
              <CardDescription>{quickStart.detail}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="secondary">
                Quick Start
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Training History</CardTitle>
          <CardDescription>Latest sessions and performance trends.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Recent sessions and performance trends will appear here once training runs are completed.
        </CardContent>
      </Card>
    </div>
  )
}
