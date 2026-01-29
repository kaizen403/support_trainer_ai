import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function ActiveTrainingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Active Training Interface</h1>
        <p className="text-sm text-muted-foreground">
          Live coaching view with real-time conversation analysis and assistance controls.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="min-h-[420px]">
          <CardHeader>
            <CardTitle>Conversation Stream</CardTitle>
            <CardDescription>Color-coded techniques and missed opportunities.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-md border border-emerald-200 bg-emerald-50/50 p-3">
              <Badge className="mb-2" variant="default">Good Technique</Badge>
              <p>“I understand your concern. Let me walk you through the resolution steps.”</p>
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3">
              <Badge className="mb-2" variant="secondary">Opportunity</Badge>
              <p>Suggest confirming the customer’s priority before offering a solution.</p>
            </div>
            <div className="rounded-md border border-rose-200 bg-rose-50/50 p-3">
              <Badge className="mb-2" variant="destructive">Missed Protocol</Badge>
              <p>Policy reminder: collect account verification before discussing billing.</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Voice Visualizer</CardTitle>
              <CardDescription>Live activity and coaching hints.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="h-28 rounded-md border border-dashed" />
              <p>Coaching hints will surface here as the conversation unfolds.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assistance Controls</CardTitle>
              <CardDescription>Pause or request targeted guidance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="secondary">Pause for Coaching</Button>
              <Button className="w-full" variant="outline">Request Guidance</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
