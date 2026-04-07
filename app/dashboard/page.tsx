"use client"

import { useEffect, useState } from "react"
import { StatCard } from "@/components/stat-card"
import { LiveFeed } from "@/components/live-feed"
import { ActivityList } from "@/components/activity-list"

export default function DashboardPage() {
  const [totalScans, setTotalScans] = useState<number>(0)
  const [authorized, setAuthorized] = useState<number>(0)
  const [intrusions, setIntrusions] = useState<number>(0)
  const [uptime,     setUptime]     = useState<number>(100)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // ── Authorized persons count → FastAPI port 8000 ──────────────────────
        const authRes  = await fetch("http://localhost:8000/api/authorized")
        const authData = await authRes.json()
        setAuthorized(Array.isArray(authData) ? authData.length : 0)

        // ── Cumulative totals → Flask port 5001 analytics ─────────────────────
        // Uses total_alerts (all scans ever) and detection_ratio.intrusions
        const analyticsRes  = await fetch("http://localhost:5001/api/analytics")
        const analyticsData = await analyticsRes.json()

        setTotalScans(analyticsData.total_alerts        ?? 0)
        setIntrusions(analyticsData.detection_ratio?.intrusions ?? 0)

      } catch (err) {
        console.error("Dashboard stats error:", err)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-semibold">
          Monitoring Control Center
        </h1>
        <p className="text-muted-foreground mt-1">
          Real-time surveillance and access control
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Scans" value={totalScans} icon="scan"     />
        <StatCard title="Authorized"  value={authorized} icon="user"     />
        <StatCard title="Intrusions"  value={intrusions} icon="alert"    />
        <StatCard title="System Uptime" value={`${uptime}%`} icon="activity" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LiveFeed
            cameraId="CAM_01"
            cameraName="Front Door"
            location="Main Entrance - Building A"
          />
        </div>
        <div className="lg:col-span-1">
          <ActivityList activities={[]} />
        </div>
      </div>
    </div>
  )
}
