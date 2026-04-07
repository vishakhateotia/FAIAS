"use client"

import { useState } from "react"
import { MapPin, Camera, Clock, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Intruder } from "@/app/dashboard/logs/page"

interface Props extends Intruder {}

export function IntruderCard({
  id,
  timestamp,
  location,
  cameraId,
  imageQuery,
}: Props) {
  const [showDetail, setShowDetail] = useState(false)

  return (
    <>
      <div
        className={cn(
          "pastel-card rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer",
          "hover:shadow-lg hover:-translate-y-0.5 border-border"
        )}
      >
        {/* Image */}
        <div className="relative h-48 bg-muted overflow-hidden">
          {imageQuery ? (
            <img
              src={imageQuery}
              alt={`Intruder #${id}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none"
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted/60">
              <Camera className="w-12 h-12 text-muted-foreground/40" />
            </div>
          )}

          {/* ID badge only */}
          <div className="absolute top-3 right-3">
            <span className="px-2 py-1 rounded-lg text-xs font-mono bg-black/50 text-white">
              #{id}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="p-4 space-y-2">
          <p className="font-semibold text-foreground">Unknown Subject</p>

          <div className="space-y-1.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{timestamp}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-green-500" />
              <span>{location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Camera className="w-3.5 h-3.5 shrink-0 text-blue-400" />
              <span>{cameraId}</span>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="w-full mt-3 rounded-xl border-pink-200 text-pink-600 hover:bg-pink-50"
            onClick={() => setShowDetail(true)}
          >
            <Eye className="w-4 h-4 mr-2" />
            Review Incident
          </Button>
        </div>
      </div>

      {/* Detail modal */}
      {showDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowDetail(false)}
        >
          <div
            className="bg-background rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal image */}
            <div className="relative h-64 bg-muted">
              {imageQuery ? (
                <img
                  src={imageQuery}
                  alt={`Intruder #${id}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Camera className="w-16 h-16 text-muted-foreground/40" />
                </div>
              )}
            </div>

            {/* Modal info */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Incident #{id}</h3>
                <span className="text-xs text-muted-foreground font-mono">{cameraId}</span>
              </div>

              <div className="space-y-2 text-sm">
                {[
                  { icon: Clock,  label: "Time",     value: timestamp, color: "text-foreground" },
                  { icon: MapPin, label: "Location",  value: location,  color: "text-green-600" },
                  { icon: Camera, label: "Camera",    value: cameraId,  color: "text-blue-500"  },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="flex justify-between py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Icon className={cn("w-4 h-4", color)} />
                      {label}
                    </div>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>

              <Button className="w-full rounded-xl" onClick={() => setShowDetail(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}