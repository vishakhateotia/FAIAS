"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import {
  XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Area, AreaChart, Tooltip,
} from "recharts"
import { BarChart3, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

type WeeklyData = {
  day:        string
  intrusions: number
  authorized: number
  denied:     number
}

type Props = {
  /** Pass initial data from parent; chart will self-refresh every 60s */
  initialData?: WeeklyData[]
}

const DAYS_MAP: Record<string, string> = {
  "0": "Sun", "1": "Mon", "2": "Tue",
  "3": "Wed", "4": "Thu", "5": "Fri", "6": "Sat",
}

// Only authorized + intrusions — denied removed everywhere
const SERIES = [
  { key: "authorized" as const, label: "Authorized", stroke: "#22c55e" },
  { key: "intrusions" as const, label: "Intrusions",  stroke: "#ef4444" },
]

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  // Only show authorized + intrusions in tooltip
  const filtered = payload.filter((p: any) =>
    p.dataKey === "authorized" || p.dataKey === "intrusions"
  )
  return (
    <div className="bg-background border rounded-xl shadow-lg px-4 py-3 text-sm space-y-1.5">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {filtered.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground capitalize">{p.dataKey}:</span>
          <span className="font-semibold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export function IntrusionChart({ initialData = [] }: Props) {
  const [isHovered,   setIsHovered]   = useState(false)
  const [rawData,     setRawData]     = useState<WeeklyData[]>(initialData)
  const [totals,      setTotals]      = useState({ authorized: 0, intrusions: 0 })
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [refreshing,  setRefreshing]  = useState(false)

  // ── Fetch fresh data from Flask analytics endpoint ──────────────────────────
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const res  = await fetch("http://127.0.0.1:5001/api/analytics")
      const json = await res.json()

      // weekly_data comes as [{day:"0", authorized:N, intrusions:N, denied:N}, ...]
      if (json.weekly_data) setRawData(json.weekly_data)

      // detection_ratio has cumulative totals
      if (json.detection_ratio) {
        setTotals({
          authorized: json.detection_ratio.authorized ?? 0,
          intrusions: json.detection_ratio.intrusions ?? 0,
        })
      }

      setLastUpdated(new Date())
    } catch (e) {
      console.error("[IntrusionChart] fetch error:", e)
    } finally {
      setRefreshing(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => { fetchData() }, [fetchData])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const id = setInterval(() => fetchData(true), 60_000)
    return () => clearInterval(id)
  }, [fetchData])

  // Build full 7-day array with zeros for missing days
  const formattedData = useMemo(() => {
    const fullWeek = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => ({
      day: d, intrusions: 0, authorized: 0,
    }))
    rawData?.forEach((item) => {
      const dayName = DAYS_MAP[item.day] ?? item.day
      const idx     = fullWeek.findIndex((d) => d.day === dayName)
      if (idx !== -1) {
        fullWeek[idx].intrusions = item.intrusions || 0
        fullWeek[idx].authorized = item.authorized || 0
      }
    })
    return fullWeek
  }, [rawData])

  const grandTotal = Math.max(totals.authorized + totals.intrusions, 1)

  return (
    <div
      className={cn(
        "pastel-card rounded-2xl p-6 transition-all duration-300",
        isHovered && "shadow-xl"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Weekly Activity</h3>
            <p className="text-sm text-muted-foreground">Last 7 days breakdown</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Legend pills — authorized + intrusions ONLY */}
          {SERIES.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.stroke }} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <span className="text-xs font-bold text-foreground">{totals[s.key]}</span>
              <span className="text-xs text-muted-foreground">
                ({Math.round((totals[s.key] / grandTotal) * 100)}%)
              </span>
            </div>
          ))}

          {/* Refresh button */}
          <button
            onClick={() => fetchData()}
            disabled={refreshing}
            title="Refresh now"
            className="p-1.5 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* ── Chart ── */}
      <div className="w-full" style={{ height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={formattedData}
            margin={{ top: 10, right: 30, left: -10, bottom: 0 }}
          >
            <defs>
              {SERIES.map((s) => (
                <linearGradient key={s.key} id={`grad_${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={s.stroke} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={s.stroke} stopOpacity={0.03} />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.92 0.01 280)"
              vertical={false}
            />

            <XAxis
              dataKey="day"
              stroke="oklch(0.6 0.02 280)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              padding={{ left: 10, right: 10 }}
            />

            <YAxis
              stroke="oklch(0.6 0.02 280)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={40}
            />

            <Tooltip content={<CustomTooltip />} />

            {SERIES.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.stroke}
                strokeWidth={2.5}
                fill={`url(#grad_${s.key})`}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0, fill: s.stroke }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Summary row — authorized + intrusions ONLY ── */}
      <div className="mt-6 grid grid-cols-2 gap-4 pt-5 border-t">
        {SERIES.map((s) => (
          <div key={s.key} className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.stroke }} />
              <span className="text-sm text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{totals[s.key]}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {Math.round((totals[s.key] / grandTotal) * 100)}% of total
            </p>
          </div>
        ))}
      </div>

      {/* Last updated timestamp */}
      {lastUpdated && (
        <p className="text-center text-xs text-muted-foreground/60 mt-3">
          Last updated: {lastUpdated.toLocaleTimeString()} · Auto-refreshes every 60s
        </p>
      )}
    </div>
  )
}
