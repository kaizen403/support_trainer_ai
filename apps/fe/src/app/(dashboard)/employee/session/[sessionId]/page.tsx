"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { LiveKitRoom, RoomAudioRenderer, useRoomContext, useConnectionState, useLocalParticipant } from "@livekit/components-react"
import { RoomEvent, ConnectionState, DataPacket_Kind } from "livekit-client"
import { Loader2, Mic, MicOff, PhoneOff, User, Bot, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import "@livekit/components-styles"

interface TranscriptItem {
  id: string
  sender: string
  role: "user" | "ai"
  text: string
  timestamp: number
  isBot: boolean
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
    // fall through to raw
  }

  return { sender: "unknown", text: raw }
}

export default function SessionPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const { data: session } = useSession()
  const [token, setToken] = useState("")

  useEffect(() => {
    if (!session?.user) return;
    (async () => {
        try {
            const resp = await fetch(`/api/tokens/livekit?room=${sessionId}&username=${session.user.email}`)
            const data = await resp.json()
            setToken(data.token)
        } catch (e) {
            console.error(e)
        }
    })()
  }, [session, sessionId])

  if (!token) return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>

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
        <ActiveSession sessionId={sessionId} />
        <RoomAudioRenderer />
    </LiveKitRoom>
  )
}

function ActiveSession({ sessionId }: { sessionId: string }) {
  const room = useRoomContext()
  const connectionState = useConnectionState()
  const { isMicrophoneEnabled, localParticipant } = useLocalParticipant()
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([])
  const [elapsed, setElapsed] = useState(0)
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)

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

    const onData = (payload: Uint8Array, participant: any, kind: any) => {
        if (kind === DataPacket_Kind.RELIABLE) {
            const decoder = new TextDecoder()
            const str = decoder.decode(payload)
            try {
                const data = parseTranscriptPayload(str)
                const sender = data.sender || 'unknown'
                const text = data.text || str

                const isBot = ['bot', 'agent', 'assistant', 'ai'].includes(sender.toLowerCase())
                setTranscripts(prev => [...prev, {
                    id: Math.random().toString(36).substring(7),
                    sender,
                    role: isBot ? "ai" : "user",
                    text,
                    timestamp: Date.now(),
                    isBot
                }])
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

  const handleDisconnect = async (reason: "completed" | "timeout" | "user_ended" = "user_ended") => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const transcriptData = {
        messages: transcripts,
        metadata: {
          totalDuration: elapsed,
          turnCount: transcripts.length,
          endReason: reason
        }
      };
      await fetch(`${API_URL}/api/sessions/${sessionId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: transcriptData }),
        credentials: 'include'
      });
    } catch (e) {
      console.error("Failed to save transcript", e);
    }
    room.disconnect()
    router.push('/employee')
  }

  const toggleMic = () => {
    if (localParticipant) {
        localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
    }
  }

  return (
    <div className="flex h-full gap-4 p-4">
        <div className="flex-1 flex flex-col gap-4">
            <Card>
                <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                        <Badge variant={connectionState === ConnectionState.Connected ? "default" : "secondary"}>
                            {connectionState === ConnectionState.Connected ? "Live" : connectionState}
                        </Badge>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>{formatTime(elapsed)}</span>
                        </div>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => handleDisconnect("user_ended")}>
                        <PhoneOff className="mr-2 h-4 w-4" />
                        End Session
                    </Button>
                </CardContent>
            </Card>

            <div className="flex-1 flex items-center justify-center bg-muted/30 rounded-lg border-2 border-dashed">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                        <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                            <AvatarImage src="/bot-avatar.png" />
                            <AvatarFallback className="bg-primary/10 text-primary text-4xl">
                                <Bot className="h-16 w-16" />
                            </AvatarFallback>
                        </Avatar>
                        {connectionState === ConnectionState.Connected && (
                            <div className="absolute bottom-0 right-0 h-8 w-8 bg-green-500 rounded-full border-4 border-background animate-pulse" />
                        )}
                    </div>
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold">AI Trainer</h2>
                        <p className="text-muted-foreground">Listening...</p>
                    </div>
                </div>
            </div>

            <Card>
                <CardContent className="p-4 flex justify-center">
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

        <Card className="w-1/3 flex flex-col h-full max-h-[calc(100vh-2rem)]">
            <CardHeader>
                <CardTitle className="text-lg">Transcript</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0 relative">
                <div ref={scrollRef} className="absolute inset-0 overflow-y-auto p-4 space-y-4">
                    {transcripts.length === 0 && (
                        <div className="text-center text-muted-foreground mt-10">
                            Transcript will appear here...
                        </div>
                    )}
                    {transcripts.map((t) => (
                        <div key={t.id} className={`flex gap-3 ${t.isBot ? 'flex-row' : 'flex-row-reverse'}`}>
                            <Avatar className="h-8 w-8">
                                <AvatarFallback className={t.isBot ? 'bg-primary/10 text-primary' : 'bg-secondary'}>
                                    {t.isBot ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                                </AvatarFallback>
                            </Avatar>
                            <div className={`rounded-lg p-3 max-w-[80%] text-sm ${
                                t.isBot 
                                    ? 'bg-muted text-foreground' 
                                    : 'bg-primary text-primary-foreground'
                            }`}>
                                {t.text}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    </div>
  )
}
