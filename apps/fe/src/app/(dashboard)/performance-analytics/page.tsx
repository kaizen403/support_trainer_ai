import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function PerformanceAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Performance Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Track skill progression, replay sessions, and review automated coaching reports.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Skill Radar</CardTitle>
            <CardDescription>Product knowledge, empathy, objections, closing, compliance.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Radar visualization will render here with accessible summaries for each axis.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session Replay</CardTitle>
            <CardDescription>Audio playback with synced transcript navigation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="h-10 rounded-md border" />
            <div className="flex items-center justify-between">
              <span>Transcript Sync</span>
              <Badge variant="secondary">Ready</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Automated Coaching Report</CardTitle>
          <CardDescription>Highlights and citations from training materials.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Reports will cite specific documentation to reinforce protocol adherence.
        </CardContent>
      </Card>
    </div>
  )
}
