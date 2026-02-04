"use client"

import { useEffect, useRef, useState } from "react"

interface VoiceVisualizerProps {
  isActive: boolean
  audioStream?: MediaStream
  barCount?: number
  className?: string
}

export function VoiceVisualizer({ 
  isActive, 
  audioStream, 
  barCount = 20,
  className = ""
}: VoiceVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const animationRef = useRef<number | null>(null)
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(barCount))

  useEffect(() => {
    if (!isActive || !audioStream) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close()
      }
      audioContextRef.current = null
      analyserRef.current = null
      sourceRef.current = null
      return
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 64
    analyser.smoothingTimeConstant = 0.8

    const source = audioContext.createMediaStreamSource(audioStream)
    source.connect(analyser)

    audioContextRef.current = audioContext
    analyserRef.current = analyser
    sourceRef.current = source

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      if (!analyserRef.current || !canvasRef.current) return

      analyserRef.current.getByteFrequencyData(dataArray)
      
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const width = canvas.width
      const height = canvas.height

      ctx.clearRect(0, 0, width, height)

      const barWidth = (width / barCount) * 0.8
      const gap = (width / barCount) * 0.2

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * bufferLength)
        const value = dataArray[dataIndex]
        const percent = value / 255
        const barHeight = percent * height * 0.9

        const x = i * (barWidth + gap) + gap / 2
        const y = (height - barHeight) / 2

        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight)
        gradient.addColorStop(0, "hsl(var(--primary))")
        gradient.addColorStop(1, "hsl(var(--primary) / 0.3)")

        ctx.fillStyle = gradient
        ctx.roundRect(x, y, barWidth, barHeight, 4)
        ctx.fill()
      }

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close()
      }
    }
  }, [isActive, audioStream, barCount])

  if (!isActive) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="flex items-center gap-1">
          {Array.from({ length: barCount }).map((_, i) => (
            <div
              key={i}
              className="w-1 bg-muted rounded-full"
              style={{ 
                height: "20%",
                animation: "none"
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={100}
      className={`w-full h-full ${className}`}
    />
  )
}
