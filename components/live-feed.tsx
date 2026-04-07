"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Circle, Maximize2, Volume2, VolumeX, Settings, VideoOff, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useUser } from "@/lib/user-context"

interface LiveFeedProps {
  cameraId:   string
  cameraName: string
  location:   string
}

interface FaceBox {
  name:   string
  status: "AUTHORIZED" | "UNAUTHORIZED"
  box: {
    top:    number
    right:  number
    bottom: number
    left:   number
  }
}

export function LiveFeed({ cameraId, cameraName, location }: LiveFeedProps) {
  const { email } = useUser() as any   // logged-in user's email from context

  const [isMuted,     setIsMuted]     = useState(true)
  const [currentTime, setCurrentTime] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [faces,       setFaces]       = useState<FaceBox[]>([])
  const [videoSize,   setVideoSize]   = useState({ w: 0, h: 0 })

  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // ── Clock ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => setCurrentTime(new Date().toLocaleTimeString())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // ── Track displayed video size for accurate box scaling ────────────────────
  useEffect(() => {
    if (!videoRef.current) return
    const ro = new ResizeObserver(() => {
      if (videoRef.current) {
        setVideoSize({
          w: videoRef.current.clientWidth,
          h: videoRef.current.clientHeight,
        })
      }
    })
    ro.observe(videoRef.current)
    return () => ro.disconnect()
  }, [isStreaming])

  // ── Start camera ───────────────────────────────────────────────────────────
  const startWebcam = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
          setIsStreaming(true)
          setVideoSize({
            w: videoRef.current!.clientWidth,
            h: videoRef.current!.clientHeight,
          })
        }
        streamRef.current = stream
      }
    } catch (err) {
      console.error(err)
      setError("Unable to access camera. Check browser permissions.")
    }
  }

  // ── Stop camera ────────────────────────────────────────────────────────────
  const stopWebcam = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setFaces([])
    setIsStreaming(false)
  }

  const toggleMute = () => {
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = isMuted))
    setIsMuted((m) => !m)
  }

  const toggleFullscreen = () => videoRef.current?.requestFullscreen()

  // ── Send frame + logged-in user email to backend every second ─────────────
  const sendFrame = useCallback(async () => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.videoWidth === 0) return

    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext("2d")?.drawImage(video, 0, 0)

    const image = canvas.toDataURL("image/jpeg", 0.8)

    try {
      const res  = await fetch("http://localhost:8000/recognize", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          image,
          user_email: email || "",   // ← send logged-in user's email
        }),
      })
      const data = await res.json()
      setFaces(data.faces || [])
    } catch {
      // silently ignore network blips
    }
  }, [email])

  useEffect(() => {
    if (!isStreaming) return
    const id = setInterval(sendFrame, 1000)
    return () => clearInterval(id)
  }, [isStreaming, sendFrame])

  // ── Scale: video natural resolution → displayed px size ───────────────────
  const getScale = () => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0 || videoSize.w === 0) return { sx: 1, sy: 1 }
    return {
      sx: videoSize.w  / video.videoWidth,
      sy: videoSize.h / video.videoHeight,
    }
  }

  return (
    <div className="bg-card border rounded-xl overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Circle
            className={cn(
              "w-2.5 h-2.5",
              isStreaming
                ? "fill-green-500 text-green-500"
                : "fill-muted-foreground text-muted-foreground"
            )}
          />
          <span className="text-sm font-medium">{isStreaming ? "LIVE" : "OFFLINE"}</span>
          <span className="px-2 py-1 bg-muted rounded-md text-sm font-mono">{cameraId}</span>
        </div>

        <div className="flex gap-1">
          <Button
            size="icon" variant="ghost"
            onClick={isStreaming ? stopWebcam : startWebcam}
            title={isStreaming ? "Stop feed" : "Start feed"}
          >
            {isStreaming ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
          </Button>
          <Button size="icon" variant="ghost" onClick={toggleMute} disabled={!isStreaming}>
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
          <Button size="icon" variant="ghost"><Settings className="w-4 h-4" /></Button>
          <Button size="icon" variant="ghost" onClick={toggleFullscreen} disabled={!isStreaming}>
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Video area */}
      <div className="relative aspect-video bg-muted">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMuted}
          className="absolute inset-0 w-full h-full object-cover"
        />

        <canvas ref={canvasRef} className="hidden" />

        {/* Bounding boxes */}
        {isStreaming && faces.map((face, i) => {
          const { sx, sy } = getScale()
          const top    = face.box.top    * sy
          const left   = face.box.left   * sx
          const width  = (face.box.right  - face.box.left) * sx
          const height = (face.box.bottom - face.box.top)  * sy
          const isAuth = face.status === "AUTHORIZED"

          return (
            <div
              key={i}
              className="absolute pointer-events-none"
              style={{ top, left, width, height }}
            >
              <div className={cn(
                "absolute inset-0 rounded border-2",
                isAuth ? "border-green-400" : "border-red-500"
              )} />
              <div className={cn(
                "absolute -top-6 left-0 px-2 py-0.5 text-xs font-bold text-white rounded whitespace-nowrap",
                isAuth ? "bg-green-500" : "bg-red-500"
              )}>
                {isAuth ? face.name : "UNAUTHORIZED"}
              </div>
            </div>
          )
        })}

        {/* Status badges top-right */}
        {isStreaming && faces.length > 0 && (
          <div className="absolute top-3 right-3 flex flex-col gap-1.5">
            {faces.filter(f => f.status === "AUTHORIZED").length > 0 && (
              <span className="px-2.5 py-1 bg-green-500/90 text-white text-xs font-semibold rounded-lg backdrop-blur-sm">
                ✓ {faces.filter(f => f.status === "AUTHORIZED").map(f => f.name).join(", ")}
              </span>
            )}
            {faces.filter(f => f.status === "UNAUTHORIZED").length > 0 && (
              <span className="px-2.5 py-1 bg-red-500/90 text-white text-xs font-semibold rounded-lg backdrop-blur-sm">
                ⚠ {faces.filter(f => f.status === "UNAUTHORIZED").length} Unauthorized
              </span>
            )}
          </div>
        )}

        {/* Camera info footer */}
        <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-black/70 to-transparent text-white pointer-events-none">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="font-medium text-sm">{cameraName}</h3>
              <p className="text-xs opacity-75">{location}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm">{currentTime}</p>
              <p className="text-xs opacity-75">{isStreaming ? "1080p • 30fps" : "No Signal"}</p>
            </div>
          </div>
        </div>

        {/* Start button when offline */}
        {!isStreaming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            {error && (
              <p className="text-sm text-red-400 bg-black/50 px-3 py-1.5 rounded-lg">{error}</p>
            )}
            <Button onClick={startWebcam} className="rounded-xl">
              Start Live Feed
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
