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
  Play,
  AlertCircle,
  CheckCircle2,
  Target,
  FileText,
  Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import "@livekit/components-styles"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

interface Scenario {
  id: string
  name: string
  description: string
  personaPreset: string
  temperament: string
  expertise: string
  complexity: string
}

interface Training {
  id: string
  name: string
  description: string
  systemPrompt: string
  scenario?: Scenario
  shareToken: string
}

interface SessionResponse {
  sessionId: string
  roomName: string
  avatar: {
    name: string
    persona: string
    voiceId: string
  }
  recording: { egressId: string; status: string } | null
}

interface TranscriptEntry {
  id: string
  sender: string
  role: "user" | "ai"
  text: string
  timestamp: number
}

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

export default function ShareableTrainingPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  const { data: session, isPending: isSessionLoading } = useSession()
  
  const [training, setTraining] = useState<Training | null>(null)
  const [isLoadingTraining, setIsLoadingTraining] = useState(true)
  const [trainingError, setTrainingError] = useState<string | null>(null)
  
  const [sessionData, setSessionData] = useState<SessionResponse | null>(null)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [livekitToken, setLivekitToken] = useState("")

  useEffect(() => {
    if (!isSessionLoading && !session?.user) {
      router.push("/login")
    }
  }, [session, isSessionLoading, router])

  useEffect(() => {
    if (!token || !session?.user) return

    const fetchTraining = async () => {
      try {
        const response = await fetch(`${API_URL}/api/trainings/by-token/${token}`, {
          credentials: "include"
        })
        
        if (response.status === 401) {
          router.push("/login")
          return
        }
        
        if (!response.ok) {
          if (response.status === 404) {
            setTrainingError("Training not found. The link may be invalid or expired.")
          } else {
            setTrainingError("Failed to load training. Please try again.")
          }
          return
        }

        const data = await response.json()
        setTraining(data)
      } catch (error) {
        console.error("Error fetching training:", error)
        setTrainingError("Failed to load training. Please check your connection.")
      } finally {
        setIsLoadingTraining(false)
      }
    }

    fetchTraining()
  }, [token, session, router])

  useEffect(() => {
    if (!session?.user || !sessionData?.roomName) return

    const fetchLiveKitToken = async () => {
      try {
        const resp = await fetch(`/api/tokens/livekit?room=${sessionData.roomName}&username=${session.user.email}`)
        const data = await resp.json()
        setLivekitToken(data.token)
      } catch (e) {
        console.error("Failed to get LiveKit token:", e)
        toast.error("Failed to connect to audio")
      }
    }

    fetchLiveKitToken()
  }, [session, sessionData])

  const handleStartTraining = async () => {
    if (!training) return
    
    setIsCreatingSession(true)
    try {
      const response = await fetch(`${API_URL}/api/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          trainingId: training.id,
          mode: "voice"
        }),
        credentials: "include"
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login")
          return
        }
        throw new Error("Failed to create session")
      }

      const data: SessionResponse = await response.json()
      setSessionData(data)
      toast.success("Training session started!")
    } catch (error) {
      console.error("Error creating session:", error)
      toast.error("Failed to start training session")
    } finally {
      setIsCreatingSession(false)
    }
  }

  if (isSessionLoading || isLoadingTraining) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading training...</p>
        </div>
      </div>
    )
  }

  if (trainingError) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Unable to Load Training</h2>
            <p className="text-muted-foreground mb-4">{trainingError}</p>
            <Button onClick={() => router.push("/")}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">{training?.name}</CardTitle>
              {training?.scenario && (
                <Badge variant="secondary" className="mt-2">
                  {training.scenario.name}
                </Badge>
              )}
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Description</span>
                </div>
                <p className="text-sm text-foreground">{training?.description}</p>
              </div>

              {training?.scenario && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Scenario Details</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Persona:</span>
                      <p className="font-medium">{training.scenario.personaPreset}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Temperament:</span>
                      <p className="font-medium capitalize">{training.scenario.temperament}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Expertise:</span>
                      <p className="font-medium capitalize">{training.scenario.expertise}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Complexity:</span>
                      <p className="font-medium capitalize">{training.scenario.complexity}</p>
                    </div>
                  </div>
                  
                  {training.scenario.description && (
                    <p className="text-sm text-muted-foreground pt-2 border-t">
                      {training.scenario.description}
                    </p>
                  )}
                </div>
              )}

              <div className="border-t pt-6">
                <div className="text-center">
                  <Button 
                    size="lg" 
                    className="w-full md:w-auto min-w-[200px]"
                    onClick={handleStartTraining}
                    disabled={isCreatingSession}
                  >
                    {isCreatingSession ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Start Training
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-3">
                    Click to begin your voice training session with AI
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!livekitToken) {
    return (
      <div className="flex h-screen items-center justify-center">
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
      token={livekitToken}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      data-lk-theme="default"
      style={{ height: '100vh' }}
      className="flex flex-col"
    >
      <ActiveTrainingSession 
        sessionId={sessionData.sessionId}
        training={training}
        avatar={sessionData.avatar}
      />
      <RoomAudioRenderer />
    </LiveKitRoom>
  )
}

interface ActiveTrainingSessionProps {
  sessionId: string
  training: Training | null
  avatar: {
    name: string
    persona: string
    voiceId: string
  }
}

function ActiveTrainingSession({ sessionId, training, avatar }: ActiveTrainingSessionProps) {
  const room = useRoomContext()
  const connectionState = useConnectionState()
  const { isMicrophoneEnabled, localParticipant } = useLocalParticipant()
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  
  const [elapsed, setElapsed] = useState(0)
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([])
  const [isEnding, setIsEnding] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      if (connectionState === ConnectionState.Connected) {
        setElapsed(e => e + 1)
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [connectionState])

  useEffect(() => {
    if (!room) return

    const onData = (payload: Uint8Array, _participant: any, kind: any) => {
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
            timestamp: Date.now()
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

  const toggleMic = useCallback(() => {
    if (localParticipant) {
      localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
    }
  }, [localParticipant, isMicrophoneEnabled])

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
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="font-mono">{formatTime(elapsed)}</span>
              </div>
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

        {training && (
          <Card className="bg-muted/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <Bot className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{training.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    with {avatar.name} ({avatar.persona})
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex-1 flex items-center justify-center bg-muted/30 rounded-lg border-2 border-dashed">
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                <AvatarFallback className="bg-primary/10 text-primary text-4xl">
                  <Bot className="h-16 w-16" />
                </AvatarFallback>
              </Avatar>
              {connectionState === ConnectionState.Connected && (
                <div className="absolute bottom-0 right-0 h-8 w-8 bg-green-500 rounded-full border-4 border-background animate-pulse" />
              )}
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-semibold">{avatar.name}</h2>
              <p className="text-muted-foreground">{connectionState === ConnectionState.Connected ? "Listening..." : "Connecting..."}</p>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 flex justify-center gap-4">
            <Button 
              variant={isMicrophoneEnabled ? "default" : "destructive"} 
              size="lg" 
              className="rounded-full h-16 w-16"
              onClick={toggleMic}
            >
              {isMicrophoneEnabled ? <Mic className="h-8 w-8" /> : <MicOff className="h-8 w-8" />}
            </Button>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
