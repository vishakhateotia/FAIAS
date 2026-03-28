"use client"

import { useState } from "react"
import { AlertTriangle, Calendar, MapPin, Camera, MoreVertical, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface IntruderCardProps {
  id: string
  timestamp: string
  location: string
  cameraId: string
  threatLevel: "low" | "medium" | "high"
  imageQuery: string   // this is now the IMAGE URL
}

export function IntruderCard({
  id,
  timestamp,
  location,
  cameraId,
  threatLevel,
  imageQuery,
}: IntruderCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const threatColors = {
    low: "bg-peach text-warning",
    medium: "bg-peach text-warning",
    high: "bg-blush text-danger",
  }

  const threatBorderColors = {
    low: "border-peach",
    medium: "border-peach",
    high: "border-blush",
  }

  return (
    <div
      className={cn(
        "pastel-card rounded-2xl overflow-hidden group cursor-pointer",
        isHovered && "shadow-xl"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* IMAGE SECTION */}
      <div className="relative aspect-[4/3] overflow-hidden">

        <img
          src={imageQuery}
          alt="Intruder snapshot"
          className={cn(
            "w-full h-full object-cover transition-transform duration-500",
            isHovered && "scale-110"
          )}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-card/95 via-card/30 to-transparent" />

        {/* Threat Badge */}
        <div
          className={cn(
            "absolute top-3 left-3 px-3 py-1.5 rounded-xl text-xs font-medium transition-transform duration-300",
            threatColors[threatLevel],
            isHovered && "scale-110"
          )}
        >
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            {threatLevel.toUpperCase()}
          </div>
        </div>

        {/* Actions Menu */}
        <div
          className={cn(
            "absolute top-3 right-3 transition-all duration-300",
            isHovered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="bg-card/90 hover:bg-card rounded-xl backdrop-blur-sm"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem className="rounded-lg">View Details</DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg">Export Image</DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg">Add to Watchlist</DropdownMenuItem>
              <DropdownMenuItem className="text-danger rounded-lg">
                Report False Positive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Detection Box Overlay */}
        <div
          className={cn(
            "absolute bottom-16 left-1/2 -translate-x-1/2 w-24 h-32 border-2 rounded-lg animate-pulse-soft transition-all duration-300",
            threatBorderColors[threatLevel],
            isHovered && "scale-105"
          )}
        >
          <div className={cn("absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2", threatBorderColors[threatLevel])} />
          <div className={cn("absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2", threatBorderColors[threatLevel])} />
          <div className={cn("absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2", threatBorderColors[threatLevel])} />
          <div className={cn("absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2", threatBorderColors[threatLevel])} />
        </div>

      </div>

      {/* INFO SECTION */}
      <div className="p-5 space-y-4">

        <div className="flex items-center justify-between">
          <h4
            className={cn(
              "font-semibold text-foreground transition-colors",
              isHovered && "text-primary"
            )}
          >
            Unknown Subject
          </h4>

          <span className="text-xs font-mono text-muted-foreground px-2 py-1 bg-muted/50 rounded-lg">
            #{id}
          </span>
        </div>

        <div className="space-y-2 text-sm">

          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="p-1.5 rounded-lg bg-lavender/50">
              <Calendar className="w-3.5 h-3.5 text-primary" />
            </div>
            <span>{timestamp}</span>
          </div>

          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="p-1.5 rounded-lg bg-mint/50">
              <MapPin className="w-3.5 h-3.5 text-success" />
            </div>
            <span>{location}</span>
          </div>

          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="p-1.5 rounded-lg bg-sky/50">
              <Camera className="w-3.5 h-3.5 text-primary" />
            </div>
            <span>{cameraId}</span>
          </div>

        </div>

        <Button
          className={cn(
            "w-full rounded-xl bg-blush text-danger hover:bg-blush/80 transition-all duration-300",
            isHovered && "shadow-lg -translate-y-0.5"
          )}
        >
          <Eye className="w-4 h-4 mr-2" />
          Review Incident
        </Button>

      </div>
    </div>
  )
}
