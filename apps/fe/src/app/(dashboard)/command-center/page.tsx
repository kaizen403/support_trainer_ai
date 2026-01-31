"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Play, Users, Clock, TrendingUp, Activity } from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface Training {
  id: string;
  name: string;
  description: string;
  mode: string;
}

interface TrainingSession {
  id: string;
  trainingId: string;
  avatarName: string;
  mode: string;
  status: "active" | "completed" | "abandoned";
  startedAt: string;
  endedAt?: string;
  training?: {
    name: string;
  };
  assessment?: {
    score: number;
  } | null;
}

interface SessionAnalytics {
  overview: {
    totalSessions: number;
    activeMembers: number;
    averageScore: number;
    completionRate: number;
  };
  recentSessions: Array<{
    id: string;
    user: string;
    training: string;
    score: number | null;
    date: string;
    status: string;
  }>;
}

const quickStartTemplates = [
  {
    title: "Angry Customer Simulation",
    detail: "High-pressure escalation flow",
    mode: "simulation",
    temperament: "aggressive",
    expertise: "intermediate",
  },
  {
    title: "Technical Troubleshooting",
    detail: "Complex product issue walkthrough",
    mode: "simulation",
    temperament: "firm",
    expertise: "expert",
  },
  {
    title: "Decision Maker Interview",
    detail: "Pricing + compliance objections",
    mode: "guided_interview",
    temperament: "neutral",
    expertise: "advanced",
  },
];

export default function CommandCenterPage() {
  const { data: session } = useSession();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [activeSessions, setActiveSessions] = useState<TrainingSession[]>([]);
  const [recentSessions, setRecentSessions] = useState<SessionAnalytics["recentSessions"]>([]);
  const [analytics, setAnalytics] = useState<SessionAnalytics["overview"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingSession, setStartingSession] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [trainingsRes, sessionsRes, analyticsRes] = await Promise.all([
        fetch(`${API_URL}/api/trainings`, { credentials: "include" }),
        fetch(`${API_URL}/api/sessions`, { credentials: "include" }),
        fetch(`${API_URL}/api/sessions/analytics`, { credentials: "include" }),
      ]);

      if (trainingsRes.ok) {
        const trainingsData = await trainingsRes.json();
        setTrainings(trainingsData);
      }

      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setActiveSessions(sessionsData.filter((s: TrainingSession) => s.status === "active"));
      }

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData.overview);
        setRecentSessions(analyticsData.recentSessions.slice(0, 5));
      }
    } catch {
      toast.error("Failed to fetch command center data");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStart = async (template: typeof quickStartTemplates[0]) => {
    if (trainings.length === 0) {
      toast.error("No training scenarios available");
      return;
    }

    setStartingSession(template.title);

    try {
      const training = trainings[0];
      const response = await fetch(`${API_URL}/api/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          trainingId: training.id,
          mode: template.mode,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Session started: ${template.title}`);
        fetchData();
        window.open(`/employee/session/${result.sessionId}/prepare`, "_blank");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to start session");
      }
    } catch {
      toast.error("Failed to start session");
    } finally {
      setStartingSession(null);
    }
  };

  const handleStartTraining = async (trainingId: string) => {
    setStartingSession(trainingId);

    try {
      const response = await fetch(`${API_URL}/api/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          trainingId,
          mode: "simulation",
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success("Training session started");
        fetchData();
        window.open(`/employee/session/${result.sessionId}/prepare`, "_blank");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to start session");
      }
    } catch {
      toast.error("Failed to start session");
    } finally {
      setStartingSession(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-500">
            <Activity className="mr-1 h-3 w-3" />
            Active
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="secondary">
            <CheckCircle className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        );
      case "abandoned":
        return (
          <Badge variant="outline">
            <XCircle className="mr-1 h-3 w-3" />
            Abandoned
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Training Command Center</h1>
        <p className="text-sm text-muted-foreground">
          Monitor live training activity and launch new simulations or interviews.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalSessions || 0}</div>
            <p className="text-xs text-muted-foreground">All time training sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.activeMembers || 0}</div>
            <p className="text-xs text-muted-foreground">Unique participants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.averageScore ? Math.round(analytics.averageScore) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Across all sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.completionRate || 0}%</div>
            <p className="text-xs text-muted-foreground">Sessions completed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Live Session Status</CardTitle>
            <CardDescription>Real-time readiness for training sessions.</CardDescription>
          </div>
          <Badge variant={activeSessions.length > 0 ? "default" : "secondary"} className={activeSessions.length > 0 ? "bg-green-500" : ""}>
            {activeSessions.length > 0 ? `${activeSessions.length} Active` : "Idle"}
          </Badge>
        </CardHeader>
        <CardContent>
          {activeSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active sessions right now. Launch a simulation or schedule a guided interview.
            </p>
          ) : (
            <div className="space-y-2">
              {activeSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <div>
                      <p className="text-sm font-medium">{session.training?.name || "Training"}</p>
                      <p className="text-xs text-muted-foreground">
                        Avatar: {session.avatarName} • Mode: {session.mode}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{session.mode}</Badge>
                    <Button size="sm" asChild>
                      <Link href={`/employee/session/${session.id}`}>Join</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {quickStartTemplates.map((template) => (
          <Card key={template.title}>
            <CardHeader>
              <CardTitle className="text-base">{template.title}</CardTitle>
              <CardDescription>{template.detail}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => handleQuickStart(template)}
                disabled={startingSession === template.title || trainings.length === 0}
              >
                {startingSession === template.title ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Quick Start
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Available Trainings</CardTitle>
            <CardDescription>Start a session from your training library.</CardDescription>
          </CardHeader>
          <CardContent>
            {trainings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No training scenarios available. Create one first.
              </p>
            ) : (
              <div className="space-y-2">
                {trainings.slice(0, 5).map((training) => (
                  <div
                    key={training.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{training.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {training.description}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleStartTraining(training.id)}
                      disabled={startingSession === training.id}
                    >
                      {startingSession === training.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="mr-2 h-4 w-4" />
                      )}
                      Start
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Training History</CardTitle>
            <CardDescription>Latest sessions and performance trends.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No sessions completed yet. Start training to see history.
              </p>
            ) : (
              <div className="space-y-2">
                {recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{session.training}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.user} • {new Date(session.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {session.score !== null && (
                        <Badge variant={session.score >= 70 ? "default" : "secondary"}>
                          {session.score}%
                        </Badge>
                      )}
                      <Badge variant="outline">{session.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { CheckCircle, XCircle } from "lucide-react";
