"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Mic, MicOff, ArrowRight } from "lucide-react"
import { useParams, useRouter } from "next/navigation"

export default function PrepareSession() {
  const params = useParams()
  const router = useRouter()
  const [permission, setPermission] = useState<"prompt" | "granted" | "denied">("prompt")
  const [isReady, setIsReady] = useState(false)
  const [volume, setVolume] = useState(0)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  const requestMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      setPermission("granted")
      
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const analyser = audioContext.createAnalyser()
      analyserRef.current = analyser
      const microphone = audioContext.createMediaStreamSource(stream)
      microphone.connect(analyser)
      analyser.fftSize = 256
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      const updateVolume = () => {
        analyser.getByteFrequencyData(dataArray)
        let sum = 0
        for(let i = 0; i < bufferLength; i++) {
          sum += dataArray[i]
        }
        const average = sum / bufferLength
        setVolume(average)
        animationFrameRef.current = requestAnimationFrame(updateVolume)
      }

      updateVolume()
      setIsReady(true)
    } catch (err) {
      console.error("Error accessing microphone:", err)
      setPermission("denied")
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
       <Card className="w-[500px]">
         <CardHeader>
           <CardTitle>Prepare for Session</CardTitle>
           <CardDescription>Check your microphone before starting.</CardDescription>
         </CardHeader>
         <CardContent className="space-y-6">
           <div className="flex flex-col items-center justify-center space-y-4 py-8">
             {permission === "prompt" && (
               <div className="text-center space-y-4">
                 <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                   <Mic className="h-10 w-10 text-muted-foreground" />
                 </div>
                 <p className="text-sm text-muted-foreground">
                   We need access to your microphone for the role-play session.
                 </p>
                 <Button onClick={requestMicrophone}>Enable Microphone</Button>
               </div>
             )}

             {permission === "granted" && (
               <div className="text-center space-y-4 w-full">
                 <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                   <Mic className="h-10 w-10 text-green-600 dark:text-green-400" />
                 </div>
                 <div className="space-y-2">
                    <p className="text-sm font-medium">Microphone Active</p>
                    <div className="h-2 w-full max-w-[200px] mx-auto rounded-full bg-muted overflow-hidden">
                        <div 
                            className="h-full bg-green-500 transition-all duration-75"
                            style={{ width: `${Math.min(100, (volume / 128) * 100)}%` }}
                        />
                    </div>
                 </div>
                 <p className="text-xs text-muted-foreground">Try speaking to test the input level.</p>
               </div>
             )}

             {permission === "denied" && (
               <div className="text-center space-y-4">
                 <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                   <MicOff className="h-10 w-10 text-red-600 dark:text-red-400" />
                 </div>
                 <p className="text-sm text-muted-foreground">
                   Microphone access was denied. Please check your browser settings.
                 </p>
                 <Button variant="outline" onClick={requestMicrophone}>Try Again</Button>
               </div>
             )}
           </div>
         </CardContent>
         <CardFooter className="flex justify-between">
           <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
           <Button disabled={!isReady} onClick={() => router.push(`/employee/session/${params.sessionId}`)}>
             Start Session <ArrowRight className="ml-2 h-4 w-4" />
           </Button>
         </CardFooter>
       </Card>
    </div>
  )
}
