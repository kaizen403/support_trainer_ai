import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function ScenarioConfigurationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Scenario Configuration</h1>
        <p className="text-sm text-muted-foreground">
          Upload training materials and tune persona intensity for your call center scenarios.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Training Materials</CardTitle>
            <CardDescription>Product docs, scripts, and objection guides.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Drop PDF, TXT, DOCX, or MD files to update the training knowledge base.
            </div>
            <Button variant="secondary">Upload Documents</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Persona Adjustments</CardTitle>
            <CardDescription>Balance temperament, expertise, and scenario complexity.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Customer Temperament</span>
              <Badge variant="secondary">Firm</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Technical Expertise</span>
              <Badge variant="secondary">Advanced</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Scenario Complexity</span>
              <Badge variant="secondary">High</Badge>
            </div>
            <Button variant="outline">Save Scenario Settings</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Content Alignment</CardTitle>
          <CardDescription>Ensure training scenarios match uploaded materials.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Alignment checks will surface gaps between scenarios and supporting documentation.
        </CardContent>
      </Card>
    </div>
  )
}
