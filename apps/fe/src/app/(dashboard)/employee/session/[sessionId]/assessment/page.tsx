"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle, XCircle, BarChart2, Lightbulb, Trophy, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Loader2 } from "lucide-react"

interface CategoryData {
  score: number
  notes: string
}

interface Highlight {
  quote: string
  type: "positive" | "negative"
  note: string
}

interface Assessment {
  id: string
  score: number
  feedback: string
  strengths: string[]
  improvements: string[]
  categories: Record<string, CategoryData>
  highlights: Highlight[]
  createdAt: string
}

export default function AssessmentPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
        const resp = await fetch(`${apiUrl}/api/sessions/${sessionId}/assessment`, {
          credentials: "include",
        })

        if (!resp.ok) {
          if (resp.status === 404) {
            setError("Assessment not found. It might be generating or the session was abandoned.")
          } else {
            setError("Failed to load assessment")
          }
          return
        }

        const data = await resp.json()
        setAssessment(data)
      } catch (e) {
        console.error(e)
        setError("Failed to load assessment")
      } finally {
        setLoading(false)
      }
    }

    fetchAssessment()
  }, [sessionId])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <div className="text-destructive font-medium">{error}</div>
        <Button variant="outline" onClick={() => router.push("/employee")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    )
  }

  if (!assessment) return null

  // Determine score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500"
    if (score >= 60) return "text-yellow-500"
    return "text-red-500"
  }

  const getProgressColor = (score: number) => {
      if (score >= 80) return "bg-green-500"
      if (score >= 60) return "bg-yellow-500"
      return "bg-red-500"
  }

  return (
    <div className="container mx-auto max-w-5xl py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/employee")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Session Assessment</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Overall Score</CardTitle>
            <CardDescription>Your performance summary</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <div className={`text-6xl font-bold ${getScoreColor(assessment.score)}`}>
              {assessment.score}
            </div>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              out of 100
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Feedback</CardTitle>
            <CardDescription>AI Trainer Analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="leading-relaxed text-muted-foreground">
              {assessment.feedback}
            </p>
          </CardContent>
        </Card>
      </div>

      {assessment.categories && Object.keys(assessment.categories).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5" />
              Category Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(assessment.categories).map(([name, data], i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium capitalize">{name}</div>
                  <div className="text-sm font-bold">{data.score}/100</div>
                </div>
                <Progress value={data.score} className="h-2" />
                <p className="text-sm text-muted-foreground">{data.notes}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <Trophy className="h-5 w-5" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {assessment.strengths.map((strength, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-sm">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <Lightbulb className="h-5 w-5" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {assessment.improvements.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-yellow-500 shrink-0" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {assessment.highlights && assessment.highlights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Conversation Highlights</CardTitle>
            <CardDescription>Key moments from your session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {assessment.highlights.map((highlight, i) => (
              <div key={i} className={`rounded-lg border p-4 ${highlight.type === 'positive' ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}>
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant={highlight.type === 'positive' ? 'default' : 'destructive'}>
                    {highlight.type === 'positive' ? 'Good' : 'Needs Work'}
                  </Badge>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Quote</span>
                </div>
                <blockquote className="mb-2 border-l-2 pl-4 italic text-muted-foreground">
                  "{highlight.quote}"
                </blockquote>
                <p className="text-sm">
                  {highlight.note}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
