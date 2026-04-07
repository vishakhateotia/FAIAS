"use client"

import { useEffect, useState } from "react"
import { IntrusionChart } from "@/components/charts/intrusion-chart"
import { TrendingUp, TrendingDown, Shield, Clock, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

export default function AnalyticsPage() {
  const [hoveredStat,   setHoveredStat]   = useState<number | null>(null)
  const [hoveredMetric, setHoveredMetric] = useState<number | null>(null)
  const [analytics,     setAnalytics]     = useState<any>(null)
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    fetch("http://127.0.0.1:5001/api/analytics")
      .then((res) => res.json())
      .then((data) => { setAnalytics(data); setLoading(false) })
      .catch((err) => { console.error("Analytics fetch error:", err); setLoading(false) })
  }, [])

  if (loading) return <p className="p-6 text-muted-foreground">Loading analytics…</p>
  if (!analytics) return <p className="p-6 text-muted-foreground">No analytics data available.</p>

  const quickStats = [
    {
      label:     "Total Alerts",
      value:     analytics.total_alerts,
      change:    "All detections",
      icon:      TrendingUp,
      color:     "bg-mint",
      textColor: "text-success",
    },
    {
      label:     "False Positives",
      value:     analytics.false_positives,
      change:    "Confidence < 0.5",
      icon:      TrendingDown,
      color:     "bg-blush",
      textColor: "text-danger",
    },
    {
      label:     "Authorized Users",
      value:     analytics.total_authorized,
      change:    "Registered persons",
      icon:      Shield,
      color:     "bg-lavender",
      textColor: "text-primary",
    },
    {
      label:     "High Confidence",
      value:     analytics.detection_ratio?.high ?? "—",
      change:    "Confidence ≥ 0.8",
      icon:      Clock,
      color:     "bg-peach",
      textColor: "text-warning",
    },
  ]

  const performanceMetrics = [
    { label: "CPU Usage", value: 45, color: "bg-mint"    },
    { label: "Memory",    value: 62, color: "bg-lavender" },
    { label: "Storage",   value: 78, color: "bg-peach"   },
    { label: "Network",   value: 23, color: "bg-sky"     },
  ]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
          System Intelligence Dashboard
          <Sparkles className="w-6 h-6 text-primary animate-pulse-soft" />
        </h1>
        <p className="text-muted-foreground mt-1">Real-time analytics from database</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <div
            key={stat.label}
            className={cn(
              "pastel-card rounded-2xl p-5 cursor-pointer transition-all duration-300",
              hoveredStat === index && "shadow-lg -translate-y-1"
            )}
            onMouseEnter={() => setHoveredStat(index)}
            onMouseLeave={() => setHoveredStat(null)}
          >
            <div className={cn(
              "flex items-center gap-2 mb-3 transition-transform duration-300",
              hoveredStat === index && "scale-105"
            )}>
              <div className={cn("p-2 rounded-xl", stat.color)}>
                <stat.icon className={cn("w-4 h-4", stat.textColor)} />
              </div>
              <span className={cn("text-sm font-medium", stat.textColor)}>{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Chart — self-fetching, no props needed */}
      <IntrusionChart />

      {/* System Performance */}
      <div className="pastel-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
          <div className="p-2 rounded-xl bg-lavender">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          System Performance
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {performanceMetrics.map((metric, index) => (
            <div
              key={metric.label}
              className="group cursor-pointer"
              onMouseEnter={() => setHoveredMetric(index)}
              onMouseLeave={() => setHoveredMetric(null)}
            >
              <p className="text-sm text-muted-foreground mb-3">{metric.label}</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      metric.color,
                      hoveredMetric === index && "shadow-lg"
                    )}
                    style={{
                      width: hoveredMetric === index
                        ? `${Math.min(metric.value + 5, 100)}%`
                        : `${metric.value}%`,
                    }}
                  />
                </div>
                <span className={cn(
                  "text-sm font-medium text-foreground tabular-nums transition-all duration-300",
                  hoveredMetric === index && "scale-110 text-primary"
                )}>
                  {metric.value}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
