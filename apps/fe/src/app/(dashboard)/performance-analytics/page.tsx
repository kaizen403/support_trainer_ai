"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Loader2, Play, Pause, Volume2, FileText, Quote, Lightbulb, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface TrainingSession {
  id: string;
  trainingId: string;
  training: { name: string };
  userId: string;
  avatarName: string;
  status: string;
  startedAt: string;
  endedAt?: string;
  recordingUrl?: string;
  assessment?: Assessment;
}

interface Assessment {
  id: string;
  score: number;
  overallScore?: number;
  clarityScore?: number;
  protocolAdherenceScore?: number;
  empathyScore?: number;
  conversionPotentialScore?: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  categories?: Record<string, { score: number; notes: string }>;
  highlights?: Array<{
    quote: string;
    type: "positive" | "negative";
    note: string;
  }>;
  coachingReport?: {
    summary: string;
    keyTakeaways: string[];
    actionItems: string[];
  };
  citations?: Array<{
    documentId: string;
    chunkContent: string;
    deviation: string;
    recommendation: string;
  }>;
  createdAt: string;
}

interface TranscriptMessage {
  role: "user" | "ai";
  text: string;
  timestamp: number;
  duration?: number;
}

interface TranscriptData {
  messages: TranscriptMessage[];
  metadata: {
    totalDuration: number;
    turnCount: number;
    endReason: string;
  };
}

export default function PerformanceAnalyticsPage() {
  const { data: session } = useSession();
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
  const [transcript, setTranscript] = useState<TranscriptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeMessageIndex, setActiveMessageIndex] = useState<number>(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      const session = sessions.find((s) => s.id === selectedSessionId);
      setSelectedSession(session || null);
      fetchTranscript(selectedSessionId);
    }
  }, [selectedSessionId, sessions]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && audioRef.current) {
      interval = setInterval(() => {
        const current = audioRef.current?.currentTime || 0;
        setCurrentTime(current);
        if (transcript?.messages) {
          const messageIndex = transcript.messages.findIndex((msg, idx) => {
            const msgTime = msg.timestamp / 1000;
            const nextMsg = transcript.messages[idx + 1];
            const nextTime = nextMsg ? nextMsg.timestamp / 1000 : duration;
            return current >= msgTime && current < nextTime;
          });
          if (messageIndex !== -1) {
            setActiveMessageIndex(messageIndex);
          }
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, transcript, duration]);

  const fetchSessions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/sessions`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        const completedSessions = data.filter(
          (s: TrainingSession) => s.status === "COMPLETED" && s.assessment
        );
        setSessions(completedSessions);
        if (completedSessions.length > 0 && !selectedSessionId) {
          setSelectedSessionId(completedSessions[0].id);
        }
      } else {
        toast.error("Failed to fetch sessions");
      }
    } catch (error) {
      toast.error("Failed to fetch sessions");
    } finally {
      setLoading(false);
    }
  };

  const fetchTranscript = async (sessionId: string) => {
    setLoadingTranscript(true);
    try {
      const response = await fetch(`${API_URL}/api/sessions/${sessionId}/transcript`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setTranscript(data.transcript);
        if (data.transcript?.metadata?.totalDuration) {
          setDuration(data.transcript.metadata.totalDuration);
        }
      }
    } catch (error) {
      console.error("Failed to fetch transcript:", error);
    } finally {
      setLoadingTranscript(false);
    }
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setActiveMessageIndex(-1);
  };

  const seekToMessage = (index: number) => {
    if (transcript?.messages[index] && audioRef.current) {
      const time = transcript.messages[index].timestamp / 1000;
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      setActiveMessageIndex(index);
      if (!isPlaying) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getRadarData = () => {
    if (!selectedSession?.assessment) return [];
    const a = selectedSession.assessment;
    return [
      { skill: "Overall", score: a.overallScore || a.score, fullMark: 100 },
      { skill: "Clarity", score: a.clarityScore || 0, fullMark: 100 },
      { skill: "Protocol", score: a.protocolAdherenceScore || 0, fullMark: 100 },
      { skill: "Empathy", score: a.empathyScore || 0, fullMark: 100 },
      { skill: "Conversion", score: a.conversionPotentialScore || 0, fullMark: 100 },
    ];
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Performance Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Track skill progression, replay sessions, and review automated coaching reports.
          </p>
        </div>
        <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select a completed session" />
          </SelectTrigger>
          <SelectContent>
            {sessions.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.training.name} - {new Date(s.startedAt).toLocaleDateString()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No completed sessions with assessments available yet.
              <br />
              Complete a training session to see performance analytics.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Skill Radar</CardTitle>
                <CardDescription>
                  Performance across key skill dimensions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedSession?.assessment ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={getRadarData()}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="skill" />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} />
                        <Radar
                          name="Score"
                          dataKey="score"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.3}
                        />
                        <Tooltip
                          formatter={(value) => [`${value}/100`, "Score"]}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No assessment data available
                  </div>
                )}
                
                {selectedSession?.assessment && (
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <span>Overall Score</span>
                      <Badge variant={selectedSession.assessment.score >= 80 ? "default" : "secondary"}>
                        {selectedSession.assessment.score}/100
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <span>Session Duration</span>
                      <Badge variant="outline">
                        {transcript?.metadata?.totalDuration
                          ? formatTime(transcript.metadata.totalDuration)
                          : "N/A"}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Session Replay</CardTitle>
                <CardDescription>
                  Audio playback with synced transcript navigation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedSession?.recordingUrl ? (
                  <>
                    <audio
                      ref={audioRef}
                      src={selectedSession.recordingUrl}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onEnded={handleEnded}
                      className="hidden"
                    />
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={togglePlayback}
                        className="h-10 w-10"
                      >
                        {isPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <div className="flex-1">
                        <Progress
                          value={(currentTime / duration) * 100 || 0}
                          className="h-2"
                        />
                        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                      </div>
                      <Volume2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                    <Volume2 className="h-4 w-4" />
                    <span>No audio recording available for this session</span>
                  </div>
                )}

                <div className="border rounded-lg">
                  <div className="p-3 border-b bg-muted/50">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">Transcript</span>
                      {loadingTranscript && (
                        <Loader2 className="h-3 w-3 animate-spin ml-auto" />
                      )}
                    </div>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto p-3 space-y-2">
                    {transcript?.messages?.length ? (
                      transcript.messages.map((msg, idx) => (
                        <div
                          key={idx}
                          onClick={() => seekToMessage(idx)}
                          className={`p-2 rounded cursor-pointer transition-colors ${
                            activeMessageIndex === idx
                              ? "bg-primary/10 border border-primary/30"
                              : "hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant={msg.role === "user" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {msg.role === "user" ? "You" : "AI"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(msg.timestamp / 1000)}
                            </span>
                          </div>
                          <p className="text-sm line-clamp-2">{msg.text}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No transcript available
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Automated Coaching Report</CardTitle>
              <CardDescription>
                AI-generated insights and recommendations based on your performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="feedback" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="feedback">Feedback</TabsTrigger>
                  <TabsTrigger value="highlights">Highlights</TabsTrigger>
                  <TabsTrigger value="coaching">Coaching</TabsTrigger>
                  <TabsTrigger value="citations">Citations</TabsTrigger>
                </TabsList>

                <TabsContent value="feedback" className="space-y-4 mt-4">
                  {selectedSession?.assessment ? (
                    <>
                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Lightbulb className="h-4 w-4" />
                          Overall Feedback
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {selectedSession.assessment.feedback}
                        </p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                          <h4 className="font-medium mb-2 flex items-center gap-2 text-green-700 dark:text-green-400">
                            <CheckCircle className="h-4 w-4" />
                            Strengths
                          </h4>
                          <ul className="space-y-1">
                            {selectedSession.assessment.strengths.map((strength, idx) => (
                              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-green-500 mt-1">•</span>
                                {strength}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
                          <h4 className="font-medium mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-400">
                            <AlertCircle className="h-4 w-4" />
                            Areas for Improvement
                          </h4>
                          <ul className="space-y-1">
                            {selectedSession.assessment.improvements.map((improvement, idx) => (
                              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-amber-500 mt-1">•</span>
                                {improvement}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {selectedSession.assessment.categories && (
                        <div className="p-4 bg-muted rounded-lg">
                          <h4 className="font-medium mb-3">Category Breakdown</h4>
                          <div className="grid gap-3">
                            {Object.entries(selectedSession.assessment.categories).map(([category, data]) => (
                              <div key={category} className="flex items-center gap-4">
                                <span className="text-sm w-32">{category}</span>
                                <Progress value={data.score} className="flex-1" />
                                <Badge variant={data.score >= 80 ? "default" : "secondary"}>
                                  {data.score}/100
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No assessment data available
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="highlights" className="space-y-4 mt-4">
                  {selectedSession?.assessment?.highlights?.length ? (
                    <div className="space-y-3">
                      {selectedSession.assessment.highlights.map((highlight, idx) => (
                        <div
                          key={idx}
                          className={`p-4 rounded-lg border ${
                            highlight.type === "positive"
                              ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                              : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Quote className={`h-4 w-4 mt-1 ${
                              highlight.type === "positive" ? "text-green-500" : "text-red-500"
                            }`} />
                            <div className="flex-1">
                              <p className="text-sm italic mb-2">&ldquo;{highlight.quote}&rdquo;</p>
                              <p className={`text-xs ${
                                highlight.type === "positive"
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}>
                                {highlight.note}
                              </p>
                            </div>
                            <Badge
                              variant={highlight.type === "positive" ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {highlight.type === "positive" ? "Good" : "Needs Work"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No conversation highlights available
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="coaching" className="space-y-4 mt-4">
                  {selectedSession?.assessment?.coachingReport ? (
                    <>
                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="font-medium mb-2">Executive Summary</h4>
                        <p className="text-sm text-muted-foreground">
                          {selectedSession.assessment.coachingReport.summary}
                        </p>
                      </div>

                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="font-medium mb-2">Key Takeaways</h4>
                        <ul className="space-y-2">
                          {selectedSession.assessment.coachingReport.keyTakeaways.map((takeaway, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                              <Lightbulb className="h-4 w-4 mt-0.5 text-primary" />
                              {takeaway}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <h4 className="font-medium mb-2 text-primary">Action Items</h4>
                        <ul className="space-y-2">
                          {selectedSession.assessment.coachingReport.actionItems.map((item, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary font-medium">{idx + 1}.</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No coaching report available
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="citations" className="space-y-4 mt-4">
                  {selectedSession?.assessment?.citations?.length ? (
                    <div className="space-y-4">
                      {selectedSession.assessment.citations.map((citation, idx) => (
                        <div key={idx} className="p-4 bg-muted rounded-lg border-l-4 border-l-primary">
                          <div className="flex items-start gap-3">
                            <FileText className="h-4 w-4 mt-1 text-muted-foreground" />
                            <div className="flex-1 space-y-2">
                              <div className="p-2 bg-background rounded text-sm italic text-muted-foreground">
                                &ldquo;{citation.chunkContent.substring(0, 200)}...&rdquo;
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm">
                                  <span className="font-medium text-red-600 dark:text-red-400">Deviation: </span>
                                  {citation.deviation}
                                </p>
                                <p className="text-sm">
                                  <span className="font-medium text-green-600 dark:text-green-400">Recommendation: </span>
                                  {citation.recommendation}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No citations from training materials available
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
