"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { LiveKitRoom, RoomAudioRenderer, useRoomContext, useConnectionState, useLocalParticipant } from "@livekit/components-react"
import { RoomEvent, ConnectionState, DataPacket_Kind } from "livekit-client"
import { 
  Loader2, 
  Mic, 
  MicOff, 
  PhoneOff, 
  User, 
  Bot, 
  Clock, 
  Pause, 
  Play, 
  HelpCircle,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Lightbulb
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { VoiceVisualizer } from "@/components/training/voice-visualizer"
import { useTrainingWebSocket, TranscriptEntry, CoachingHint } from "@/hooks/use-training-websocket"
import { toast } from "sonner"
import "@livekit/components-styles"

interface SessionData {
  id: string
  training: {
    name: string
    description?: string
  }
  avatarName: string
  avatarPersona: string
  status: string
  startedAt: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

const parseTranscriptPayload = (raw: string) => {
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === "string") {
      return { sender: "unknown", text: parsed }
    }
    if (parsed && typeof parsed === "object") {
      const sender =
        typeof parsed.sender === "string"
          ? parsed.sender
          : typeof parsed.role === "string"
            ? parsed.role
            : typeof parsed.from === "string"
              ? parsed.from
              : "unknown"
      const text =
        typeof parsed.text === "string"
          ? parsed.text
          : typeof parsed.transcript === "string"
            ? parsed.transcript
            : typeof parsed.message === "string"
              ? parsed.message
              : typeof parsed.content === "string"
                ? parsed.content
                : raw
      return { sender, text }
    }
  } catch {
    return { sender: "unknown", text: raw }
  }
  return { sender: "unknown", text: raw }
}

export default function ActiveTrainingPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const { data: session } = useSession()
  const [token, setToken] = useState("")
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)

  useEffect(() => {
    if (!sessionId) return
    
    const fetchSession = async () => {
      try {
        const response = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
          credentials: "include"
        })
        if (response.ok) {
          const data = await response.json()
          setSessionData(data)
        } else {
          toast.error("Failed to load session data")
        }
      } catch (error) {
        console.error("Error fetching session:", error)
        toast.error("Failed to load session data")
      } finally {
        setIsLoadingSession(false)
      }
    }

    fetchSession()
  }, [sessionId])

  useEffect(() => {
    if (!session?.user || !sessionId) return
    
    (async () => {
      try {
        const resp = await fetch(`/api/tokens/livekit?room=${sessionId}&username=${session.user.email}`)
        const data = await resp.json()
        setToken(data.token)
      } catch (e) {
        console.error("Failed to get LiveKit token:", e)
        toast.error("Failed to connect to audio")
      }
    })()
  }, [session, sessionId])

  if (isLoadingSession) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!token) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Connecting to audio...</p>
        </div>
      </div>
    )
  }

  return (
    <LiveKitRoom
      video={false}
      audio={true}
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      data-lk-theme="default"
      style={{ height: 'calc(100vh - 4rem)' }}
      className="flex flex-col"
    >
      <ActiveTrainingSession 
        sessionId={sessionId} 
        sessionData={sessionData}
      />
      <RoomAudioRenderer />
    </LiveKitRoom>
  )
}

interface ActiveTrainingSessionProps {
  sessionId: string
  sessionData: SessionData | null
}

function ActiveTrainingSession({ sessionId, sessionData }: ActiveTrainingSessionProps) {
  const room = useRoomContext()
  const connectionState = useConnectionState()
  const { isMicrophoneEnabled, localParticipant } = useLocalParticipant()
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const hintsScrollRef = useRef<HTMLDivElement>(null)
  
  const { 
    isConnected: wsConnected, 
    transcripts: wsTranscripts, 
    coachingHints, 
    isPaused, 
    requestGuidance, 
    togglePause 
  } = useTrainingWebSocket(sessionId)
  
  const [elapsed, setElapsed] = useState(0)
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([])
  const [audioStream, setAudioStream] = useState<MediaStream | undefined>(undefined)
  const [isEnding, setIsEnding] = useState(false)

  useEffect(() => {
    if (wsTranscripts.length > 0) {
      setTranscripts(wsTranscripts)
    }
  }, [wsTranscripts])

  useEffect(() => {
    const setupAudio = async () => {
      if (isMicrophoneEnabled) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          setAudioStream(stream)
        } catch (err) {
          console.error("Failed to get audio stream:", err)
        }
      } else {
        if (audioStream) {
          audioStream.getTracks().forEach(track => track.stop())
          setAudioStream(undefined)
        }
      }
    }

    setupAudio()

    return () => {
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [isMicrophoneEnabled])

  useEffect(() => {
    const timer = setInterval(() => {
      if (connectionState === ConnectionState.Connected && !isPaused) {
        setElapsed(e => e + 1)
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [connectionState, isPaused])

  useEffect(() => {
    if (!room) return

    const onData = (payload: Uint8Array, participant: any, kind: any) => {
      if (kind === DataPacket_Kind.RELIABLE) {
        const decoder = new TextDecoder()
        const str = decoder.decode(payload)
        try {
          const data = parseTranscriptPayload(str)
          const sender = data.sender || 'unknown'
          const text = data.text || str
          const isBot = ['bot', 'agent', 'assistant', 'ai'].includes(sender.toLowerCase())
          
          const newEntry: TranscriptEntry = {
            id: Math.random().toString(36).substring(7),
            sender,
            role: isBot ? "ai" : "user",
            text,
            timestamp: Date.now(),
            category: isBot ? "neutral" : undefined
          }
          
          setTranscripts(prev => [...prev, newEntry])
        } catch (e) {
          console.error("Failed to parse transcript", e)
        }
      }
    }

    room.on(RoomEvent.DataReceived, onData)
    return () => {
      room.off(RoomEvent.DataReceived, onData)
    }
  }, [room])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcripts])

  useEffect(() => {
    if (hintsScrollRef.current) {
      hintsScrollRef.current.scrollTop = hintsScrollRef.current.scrollHeight
    }
  }, [coachingHints])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleEndSession = async (reason: "completed" | "timeout" | "user_ended" = "user_ended") => {
    if (isEnding) return
    setIsEnding(true)
    
    try {
      const transcriptData = {
        messages: transcripts,
        metadata: {
          totalDuration: elapsed,
          turnCount: transcripts.length,
          endReason: reason
        }
      }
      
      await fetch(`${API_URL}/api/sessions/${sessionId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: transcriptData }),
        credentials: 'include'
      })
      
      toast.success("Session ended successfully")
    } catch (e) {
      console.error("Failed to end session:", e)
      toast.error("Failed to end session properly")
    } finally {
      room.disconnect()
      router.push('/employee')
    }
  }

  const toggleMic = () => {
    if (localParticipant) {
      localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
    }
  }

  const handleRequestGuidance = () => {
    requestGuidance()
    toast.info("Guidance requested. AI coach will respond shortly.")
  }

  const getCategoryStyles = (category?: string) => {
    switch (category) {
      case "good":
        return {
          border: "border-emerald-200",
          bg: "bg-emerald-50/50",
          badge: "bg-emerald-500",
          icon: <CheckCircle2 className="h-3 w-3" />,
          label: "Good Technique"
        }
      case "opportunity":
        return {
          border: "border-amber-200",
          bg: "bg-amber-50/50",
          badge: "bg-amber-500",
          icon: <Lightbulb className="h-3 w-3" />,
          label: "Opportunity"
        }
      case "missed":
        return {
          border: "border-rose-200",
          bg: "bg-rose-50/50",
          badge: "bg-rose-500",
          icon: <AlertCircle className="h-3 w-3" />,
          label: "Missed Protocol"
        }
      default:
        return {
          border: "border-border",
          bg: "bg-muted/30",
          badge: "bg-secondary",
          icon: null,
          label: "Message"
        }
    }
  }

  const getHintStyles = (type: string) => {
    switch (type) {
      case "positive":
        return {
          border: "border-emerald-200",
          bg: "bg-emerald-50/50",
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        }
      case "warning":
        return {
          border: "border-amber-200",
          bg: "bg-amber-50/50",
          icon: <AlertCircle className="h-4 w-4 text-amber-500" />
        }
      case "suggestion":
      default:
        return {
          border: "border-blue-200",
          bg: "bg-blue-50/50",
          icon: <Sparkles className="h-4 w-4 text-blue-500" />
        }
    }
  }

  return (
    <div className="flex h-full gap-4 p-4">
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <Badge 
                variant={connectionState === ConnectionState.Connected ? "default" : "secondary"}
                className={connectionState === ConnectionState.Connected ? "bg-green-500" : ""}
              >
                {connectionState === ConnectionState.Connected ? "Live" : connectionState}
              </Badge>
              {wsConnected && (
                <Badge variant="outline" className="text-xs">
                  Coach Connected
                </Badge>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="font-mono">{formatTime(elapsed)}</span>
              </div>
              {isPaused && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                  <Pause className="h-3 w-3 mr-1" />
                  Paused
                </Badge>
              )}
            </div>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => handleEndSession("user_ended")}
              disabled={isEnding}
            >
              {isEnding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PhoneOff className="mr-2 h-4 w-4" />
              )}
              End Session
            </Button>
          </CardContent>
        </Card>

        {sessionData && (
          <Card className="bg-muted/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <Bot className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{sessionData.training.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    with {sessionData.avatarName} ({sessionData.avatarPersona})
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Conversation Stream</CardTitle>
            <CardDescription>Color-coded techniques and missed opportunities</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0 relative">
            <div 
              ref={scrollRef}
              className="absolute inset-0 overflow-y-auto p-4 space-y-3"
            >
              {transcripts.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p>Conversation will appear here...</p>
                  <p className="text-xs mt-2">Start speaking to begin the training session</p>
                </div>
              ) : (
                transcripts.map((entry) => {
                  const styles = getCategoryStyles(entry.category)
                  const isUser = entry.role === "user"
                  
                  return (
                    <div 
                      key={entry.id} 
                      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className={isUser ? 'bg-secondary' : 'bg-primary/10 text-primary'}>
                          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`max-w-[80%] space-y-1 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className={`rounded-lg p-3 text-sm ${
                          isUser 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}>
                          {entry.text}
                        </div>
                        {entry.category && entry.category !== "neutral" && (
                          <div className={`rounded-md border ${styles.border} ${styles.bg} p-2 text-xs`}>
                            <Badge className={`${styles.badge} text-white text-xs`}>
                              {styles.icon && <span className="mr-1">{styles.icon}</span>}
                              {styles.label}
                            </Badge>
                            {entry.feedback && (
                              <p className="mt-1 text-muted-foreground">{entry.feedback}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-4">
              <Button 
                variant={isMicrophoneEnabled ? "default" : "destructive"} 
                size="lg" 
                className="rounded-full h-14 w-14"
                onClick={toggleMic}
              >
                {isMicrophoneEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
              </Button>
              
              <div className="h-8 w-px bg-border mx-2" />
              
              <Button
                variant={isPaused ? "default" : "secondary"}
                size="lg"
                className="rounded-full h-14 w-14"
                onClick={togglePause}
              >
                {isPaused ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="rounded-full h-14 w-14"
                onClick={handleRequestGuidance}
              >
                <HelpCircle className="h-6 w-6" />
              </Button>
            </div>
            <div className="flex justify-center gap-8 mt-3 text-xs text-muted-foreground">
              <span>{isMicrophoneEnabled ? "Mute" : "Unmute"}</span>
              <span>{isPaused ? "Resume" : "Pause"}</span>
              <span>Guidance</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="w-80 flex flex-col gap-4 shrink-0">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">AI Voice Visualizer</CardTitle>
            <CardDescription>Live audio activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-24 rounded-lg border bg-muted/30 overflow-hidden">
              <VoiceVisualizer 
                isActive={connectionState === ConnectionState.Connected && isMicrophoneEnabled}
                audioStream={audioStream}
                barCount={24}
                className="w-full h-full"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Status:</span>
              <Badge variant={isMicrophoneEnabled ? "default" : "secondary"} className="text-xs">
                {isMicrophoneEnabled ? "Listening" : "Muted"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Coaching Hints
            </CardTitle>
            <CardDescription>Real-time guidance</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0 relative">
            <div 
              ref={hintsScrollRef}
              className="absolute inset-0 overflow-y-auto p-4 space-y-3"
            >
              {coachingHints.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Coaching hints will appear here</p>
                  <p className="text-xs mt-1">As the conversation unfolds, AI will provide tips</p>
                </div>
              ) : (
                coachingHints.map((hint) => {
                  const styles = getHintStyles(hint.type)
                  return (
                    <div 
                      key={hint.id}
                      className={`rounded-lg border ${styles.border} ${styles.bg} p-3 text-sm`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="shrink-0 mt-0.5">{styles.icon}</div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{hint.message}</p>
                          {hint.context && (
                            <p className="text-xs text-muted-foreground mt-1">{hint.context}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Assistance Controls</CardTitle>
            <CardDescription>Pause or request guidance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              className="w-full" 
              variant={isPaused ? "default" : "secondary"}
              onClick={togglePause}
            >
              {isPaused ? (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Resume Session
                </>
              ) : (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause for Coaching
                </>
              )}
            </Button>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={handleRequestGuidance}
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Request Guidance
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
