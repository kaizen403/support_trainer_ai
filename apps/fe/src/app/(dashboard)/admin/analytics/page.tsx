"use client"

import { useState, useEffect } from "react"
import { BarChart3, TrendingUp, Users, Calendar, Loader2, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface AnalyticsData {
  overview: {
    totalSessions: number
    activeMembers: number
    averageScore: number
    completionRate: number
  }
  recentSessions: {
    id: string
    user: string
    training: string
    score: number
    date: string
    status: string
  }[]
  trainingPerformance: {
    name: string
    avgScore: number
    sessions: number
  }[]
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
        const res = await fetch(`${baseUrl}/api/sessions/analytics`, {
          credentials: 'include',
        })

        if (!res.ok) {
          throw new Error(`Error fetching analytics: ${res.statusText}`)
        }

        const jsonData = await res.json()
        setData(jsonData)
      } catch (err) {
        console.error("Failed to fetch analytics:", err)
        setError("Failed to load analytics data. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <div className="rounded-lg border border-destructive/50 p-4 text-destructive [&>svg]:text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <h5 className="font-medium leading-none tracking-tight">Error</h5>
          </div>
          <div className="mt-2 text-sm opacity-90">
            {error}
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of team performance and training metrics
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalSessions}</div>
            <p className="text-xs text-muted-foreground">
              Across all users
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.activeMembers}</div>
            <p className="text-xs text-muted-foreground">
              Participating in training
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(data.overview.averageScore)}%</div>
            <p className="text-xs text-muted-foreground">
              Overall performance
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(data.overview.completionRate)}%</div>
            <p className="text-xs text-muted-foreground">
              Session completion
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
            <CardDescription>
              Latest training sessions across your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Training</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentSessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">{session.user}</TableCell>
                    <TableCell>{session.training}</TableCell>
                    <TableCell>{new Date(session.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {session.score !== undefined && session.score !== null ? (
                        <span className={session.score >= 80 ? "text-green-600 font-bold" : session.score >= 60 ? "text-yellow-600 font-bold" : "text-red-600 font-bold"}>
                          {session.score}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={session.status === "COMPLETED" ? "default" : "secondary"}>
                        {session.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Training Performance</CardTitle>
            <CardDescription>
              Average scores by training scenario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {data.trainingPerformance.map((item) => (
                <div key={item.name} className="flex items-center">
                  <div className="space-y-1 w-full">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium leading-none">
                        {item.name}
                      </p>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(item.avgScore)}% avg
                      </span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${item.avgScore >= 80 ? 'bg-green-500' : item.avgScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                        style={{ width: `${item.avgScore}%` }} 
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.sessions} sessions
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
