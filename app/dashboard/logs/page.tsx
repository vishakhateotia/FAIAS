"use client"

import { useState, useEffect } from "react"
import { IntruderCard } from "@/components/intruder-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Filter, Download, Calendar, Sparkles, ShieldAlert } from "lucide-react"

export interface Intruder {
  id: string
  timestamp: string
  location: string
  cameraId: string
  threatLevel: "low" | "medium" | "high"
  imageQuery: string
}

export default function LogsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [threatFilter, setThreatFilter] = useState("all")
  const [intruders, setIntruders] = useState<Intruder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
  const loadIntruders = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/intruders")
      const data = await res.json()
      const intruderArray = data.logs

      console.log("RAW RESPONSE:", data)

      // get the array inside the object
      const list = data.intruders || data.data || data.results || []

      console.log("ARRAY USED BY UI:", list)

      const formatted: Intruder[] = intruderArray.map((item: any, index: number) => ({
        id: String(index + 1),
        timestamp: item.timestamp,
        location: "Main Entrance",
        cameraId: "CAM-01",
        threatLevel: item.type === "UNAUTHORIZED" ? "high" : "low",
        imageQuery: item.image
      }))

      console.log("FORMATTED INTRUDERS:", formatted)

      setIntruders(formatted)

    } catch (err) {
      console.error("Error fetching intruders:", err)
    } finally {
      setLoading(false)
    }
  }

  loadIntruders()
}, [])


  const filteredIntruders = intruders.filter((intruder) => {
    const matchesSearch =
      intruder.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      intruder.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      intruder.timestamp.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesThreat =
      threatFilter === "all" || intruder.threatLevel === threatFilter

    return matchesSearch && matchesThreat
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
            Intruder Gallery
            <Sparkles className="w-6 h-6 text-primary animate-pulse-soft" />
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and manage detected intrusions
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl bg-transparent"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Date Range
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="rounded-xl bg-transparent"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="pastel-card rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

            <Input
              placeholder="Search by ID, location, or date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-11 bg-muted/50 border-0 rounded-xl"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-xl bg-transparent"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>

            <select
              value={threatFilter}
              onChange={(e) => setThreatFilter(e.target.value)}
              className="px-4 py-2 bg-muted/50 border-0 rounded-xl text-sm"
            >
              <option value="all">All Threat Levels</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="text-center p-12 text-muted-foreground">
          Loading intruder records...
        </div>
      ) : filteredIntruders.length === 0 ? (
        <div className="pastel-card rounded-2xl p-12 text-center">
          <div className="p-4 rounded-2xl bg-mint/30 w-fit mx-auto mb-4">
            <ShieldAlert className="w-12 h-12 text-success" />
          </div>

          <h3 className="text-xl font-semibold text-foreground mb-2">
            No Intrusions Detected
          </h3>

          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Your facility is secure. Intrusion records will appear here when detected.
          </p>
        </div>
      ) : (
        <>
          {/* Intruder Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIntruders.map((intruder, index) => (
              <div
                key={intruder.id}
                className="animate-slide-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <IntruderCard {...intruder} />
              </div>
            ))}
          </div>

          {/* Load More */}
          <div className="text-center">
            <Button
              variant="outline"
              className="px-8 rounded-xl bg-transparent"
            >
              Load More Incidents
            </Button>
          </div>
        </>
      )}
    </div>
  )
}