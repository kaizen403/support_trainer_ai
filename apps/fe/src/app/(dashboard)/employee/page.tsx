"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Play, FileText, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface TrainingSession {
  id: string;
  trainingId: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  training: {
    name: string;
  };
  assessment: {
    score: number;
    feedback: string;
  } | null;
}

interface TrainingModule {
  id: string;
  name: string;
  description: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function EmployeeDashboard() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [trainings, setTrainings] = useState<TrainingModule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sessionsRes, trainingsRes] = await Promise.all([
          fetch(`${API_URL}/api/sessions`, { credentials: "include" }),
          fetch(`${API_URL}/api/trainings`, { credentials: "include" })
        ]);

        if (sessionsRes.ok) {
          const sessionsData = await sessionsRes.json();
          setSessions(sessionsData);
        }
        
        if (trainingsRes.ok) {
          const trainingsData = await trainingsRes.json();
          setTrainings(trainingsData);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Employee Dashboard</h1>
        {trainings.length > 0 && (
          <Button asChild>
            <Link href={`/employee/session/${trainings[0].id}/prepare`}>Start New Session</Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Sessions Completed</CardTitle>
            <CardDescription>Total sessions completed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.filter(s => s.status === "COMPLETED").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Average Score</CardTitle>
            <CardDescription>Your performance average</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.filter(s => s.assessment).length > 0
                ? `${Math.round(sessions.reduce((acc, s) => acc + (s.assessment?.score || 0), 0) / sessions.filter(s => s.assessment).length)}%`
                : "N/A"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Latest Session</CardTitle>
            <CardDescription>Date of last training</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.length > 0 
                ? new Date(sessions[0].startedAt).toLocaleDateString()
                : "Never"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Available Training</CardTitle>
            <CardDescription>Modules available for you</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trainings.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No training modules available.</p>
              ) : (
                trainings.map((module) => (
                  <div key={module.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-1">
                      <p className="font-medium leading-none">{module.name}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">{module.description}</p>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/employee/session/${module.id}/prepare`}>
                        <Play className="mr-2 h-4 w-4" /> Start
                      </Link>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent History</CardTitle>
            <CardDescription>Your latest training sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No session history yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">{session.training.name}</TableCell>
                      <TableCell>{new Date(session.startedAt).toLocaleDateString()}</TableCell>
                      <TableCell>{session.assessment ? `${session.assessment.score}%` : "-"}</TableCell>
                      <TableCell>
                        <Badge variant={session.status === "COMPLETED" ? "default" : "secondary"}>
                          {session.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/employee/session/${session.id}/transcript`}>
                            <FileText className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
