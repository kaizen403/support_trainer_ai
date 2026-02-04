"use client"

import { useEffect, useRef, useState, useCallback } from "react"

export interface WebSocketMessage {
  type: string
  payload: any
  timestamp: number
}

export interface TranscriptEntry {
  id: string
  sender: string
  role: "user" | "ai"
  text: string
  timestamp: number
  category?: "good" | "opportunity" | "missed" | "neutral"
  feedback?: string
}

export interface CoachingHint {
  id: string
  type: "suggestion" | "warning" | "positive"
  message: string
  timestamp: number
  context?: string
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export function useTrainingWebSocket(sessionId: string) {
  const [isConnected, setIsConnected] = useState(false)
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([])
  const [coachingHints, setCoachingHints] = useState<CoachingHint[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001"
    const ws = new WebSocket(`${WS_URL}?sessionId=${sessionId}`)

    ws.onopen = () => {
      setIsConnected(true)
      ws.send(JSON.stringify({
        type: "subscribe",
        payload: { sessionId }
      }))
    }

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data)
        
        switch (message.type) {
          case "transcript":
            setTranscripts(prev => [...prev, {
              id: message.payload.id || generateId(),
              sender: message.payload.sender,
              role: message.payload.role,
              text: message.payload.text,
              timestamp: message.payload.timestamp || Date.now(),
              category: message.payload.category,
              feedback: message.payload.feedback
            }])
            break
            
          case "coaching_hint":
            setCoachingHints(prev => [...prev, {
              id: message.payload.id || generateId(),
              type: message.payload.type,
              message: message.payload.message,
              timestamp: message.payload.timestamp || Date.now(),
              context: message.payload.context
            }])
            break
            
          case "session_paused":
            setIsPaused(true)
            break
            
          case "session_resumed":
            setIsPaused(false)
            break
        }
      } catch (error) {
        console.error("[WebSocket] Failed to parse message:", error)
      }
    }

    ws.onclose = () => {
      setIsConnected(false)
      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, 3000)
    }

    ws.onerror = (error) => {
      console.error("[WebSocket] Error:", error)
    }

    wsRef.current = ws
  }, [sessionId])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  const sendMessage = useCallback((type: string, payload: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }))
    }
  }, [])

  const requestGuidance = useCallback(() => {
    sendMessage("request_guidance", { sessionId })
  }, [sendMessage, sessionId])

  const togglePause = useCallback(() => {
    const newPausedState = !isPaused
    sendMessage(newPausedState ? "pause_session" : "resume_session", { sessionId })
    setIsPaused(newPausedState)
  }, [isPaused, sendMessage, sessionId])

  useEffect(() => {
    connect()
    
    const heartbeat = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }))
      }
    }, 30000)

    return () => {
      clearInterval(heartbeat)
      disconnect()
    }
  }, [connect, disconnect])

  return {
    isConnected,
    transcripts,
    coachingHints,
    isPaused,
    requestGuidance,
    togglePause,
    sendMessage
  }
}
