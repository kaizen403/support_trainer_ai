"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Bot, User, Loader2, Calendar, Award, Clock } from "lucide-react"

interface TranscriptItem {
  id: string
  sender: string
  role: "user" | "ai"
  text: string
  timestamp: number
  isBot: boolean
}

interface TranscriptData {
  messages: TranscriptItem[];
  metadata?: {
    totalDuration: number;
    turnCount: number;
    endReason: string;
  };
}

interface SessionData {
  id: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  avatarName: string;
  avatarPersona: string;
  transcript: TranscriptData | TranscriptItem[] | null;
  training: {
    name: string;
    description: string;
  };
  assessment: {
    score: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
  } | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function TranscriptPage() {
  const { sessionId } = useParams();
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
          credentials: "include"
        });
        if (response.ok) {
          const data = await response.json();
          setSession(data);
        } else {
          console.error("Failed to fetch session");
        }
      } catch (error) {
        console.error("Error fetching session:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Session not found.</p>
        <Button variant="link" onClick={() => router.push('/employee')}>
          Go back to dashboard
        </Button>
      </div>
    );
  }

  const transcriptData = session.transcript;
  const messages = Array.isArray(transcriptData) 
    ? transcriptData 
    : (transcriptData?.messages || []);
  const metadata = Array.isArray(transcriptData) ? null : transcriptData?.metadata;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/employee')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{session.training.name}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(session.startedAt).toLocaleDateString()}
            </span>
            <Badge variant={session.status === "COMPLETED" ? "default" : "secondary"}>
              {session.status}
            </Badge>
            {metadata && (
              <>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {Math.floor(metadata.totalDuration / 60)}:{(metadata.totalDuration % 60).toString().padStart(2, '0')}
                </span>
                <span>{metadata.turnCount} turns</span>
              </>
            )}
          </div>
        </div>
      </div>

      {session.assessment && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Session Assessment
            </CardTitle>
            <CardDescription>Performance review and feedback</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-primary">{session.assessment.score}</span>
              <span className="text-muted-foreground pb-1">/ 100</span>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Feedback</p>
              <p className="text-sm text-muted-foreground">{session.assessment.feedback}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-1 text-green-600">Strengths</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside">
                  {session.assessment.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-medium mb-1 text-amber-600">Areas for Improvement</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside">
                  {session.assessment.improvements.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Conversation Transcript</CardTitle>
          <CardDescription>
            Session with {session.avatarName} ({session.avatarPersona})
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {messages.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No transcript available for this session.</p>
          ) : (
            <div className="space-y-4">
              {messages.map((item, index) => (
                <div key={index} className={`flex gap-3 ${item.isBot ? 'flex-row' : 'flex-row-reverse'}`}>
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className={item.isBot ? 'bg-primary/10 text-primary' : 'bg-secondary'}>
                      {item.isBot ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`rounded-lg p-3 max-w-[80%] text-sm ${
                    item.isBot 
                      ? 'bg-muted text-foreground' 
                      : 'bg-primary text-primary-foreground'
                  }`}>
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <span className="font-bold text-[10px] uppercase opacity-70">
                        {item.sender}
                      </span>
                      <span className="text-[10px] opacity-50">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {item.text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
