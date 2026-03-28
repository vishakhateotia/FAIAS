"use client"

import { useState, useMemo } from "react"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

type WeeklyData = {
  day: string
  intrusions: number
  authorized: number
  denied: number
}

type Props = {
  data: WeeklyData[]
}

export function IntrusionChart({ data }: Props) {
  const [isHovered, setIsHovered] = useState(false)

  // Convert SQLite weekday number → actual weekday name
  const formattedData = useMemo(() => {
    const daysMap: Record<string, string> = {
      "0": "Sun",
      "1": "Mon",
      "2": "Tue",
      "3": "Wed",
      "4": "Thu",
      "5": "Fri",
      "6": "Sat",
    }

    // Full 7-day structure
    const fullWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
      (d) => ({
        day: d,
        intrusions: 0,
        authorized: 0,
        denied: 0,
      })
    )

    data.forEach((item) => {
      const dayName = daysMap[item.day]
      const index = fullWeek.findIndex((d) => d.day === dayName)

      if (index !== -1) {
        fullWeek[index].intrusions = item.intrusions || 0
        fullWeek[index].authorized = item.authorized || 0
        fullWeek[index].denied = item.denied || 0
      }
    })

    return fullWeek
  }, [data])

  return (
    <div
      className={cn(
        "pastel-card rounded-2xl p-6 transition-all duration-300",
        isHovered && "shadow-xl"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-sky">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Weekly Activity
          </h3>
          <p className="text-sm text-muted-foreground">
            Last 7 days breakdown
          </p>
        </div>
      </div>

      <ChartContainer
        config={{
          intrusions: {
            label: "Intrusions",
            color: "oklch(0.72 0.14 20)",
          },
          authorized: {
            label: "Authorized",
            color: "oklch(0.75 0.14 160)",
          },
          denied: {
            label: "Denied",
            color: "oklch(0.82 0.12 80)",
          },
        }}
        className="h-[300px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={formattedData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id="intrusionGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="oklch(0.72 0.14 20)"
                  stopOpacity={0.6}
                />
                <stop
                  offset="100%"
                  stopColor="oklch(0.72 0.14 20)"
                  stopOpacity={0.1}
                />
              </linearGradient>

              <linearGradient
                id="authorizedGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="oklch(0.75 0.14 160)"
                  stopOpacity={0.6}
                />
                <stop
                  offset="100%"
                  stopColor="oklch(0.75 0.14 160)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.92 0.01 280)"
              vertical={false}
            />

            <XAxis
              dataKey="day"
              stroke="oklch(0.5 0.02 280)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />

            <YAxis
              stroke="oklch(0.5 0.02 280)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />

            <ChartTooltip content={<ChartTooltipContent />} />

            {/* AUTHORIZED */}
            <Area
              type="monotone"
              dataKey="authorized"
              stroke="oklch(0.75 0.14 160)"
              strokeWidth={2}
              fill="url(#authorizedGradient)"
            />

            {/* INTRUSIONS */}
            <Area
              type="monotone"
              dataKey="intrusions"
              stroke="oklch(0.72 0.14 20)"
              strokeWidth={2}
              fill="url(#intrusionGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  )
}