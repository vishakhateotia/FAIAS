"use client"

import { useState, useMemo } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { PieChartIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type RatioData = {
  high: number
  medium: number
  low: number
}

type Props = {
  data: RatioData
}

export function DetectionRatioChart({ data }: Props) {
  const [isHovered, setIsHovered] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<number | null>(null)

  const formattedData = useMemo(() => {
    return [
      {
        name: "Authorized",
        value: data?.high || 0,
        color: "oklch(0.75 0.14 160)",
      },
      {
        name: "Denied",
        value: data?.medium || 0,
        color: "oklch(0.82 0.12 80)",
      },
      {
        name: "Intrusions",
        value: data?.low || 0,
        color: "oklch(0.72 0.14 20)",
      },
    ]
  }, [data])

  const total = formattedData.reduce((acc, item) => acc + item.value, 0)

  return (
    <div
      className={cn("pastel-card rounded-2xl p-6 transition-all duration-300", isHovered && "shadow-xl")}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-lavender">
          <PieChartIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Detection Ratio</h3>
          <p className="text-sm text-muted-foreground">Access classification breakdown</p>
        </div>
      </div>

      <ChartContainer
        config={{
          authorized: { label: "Authorized", color: "oklch(0.75 0.14 160)" },
          denied: { label: "Denied", color: "oklch(0.82 0.12 80)" },
          intrusions: { label: "Intrusions", color: "oklch(0.72 0.14 20)" },
        }}
        className="h-[300px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={formattedData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={4}
              dataKey="value"
              strokeWidth={0}
            >
              {formattedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ResponsiveContainer>
      </ChartContainer>

      <div className="mt-4 space-y-3">
        {formattedData.map((item, index) => (
          <div
            key={item.name}
            className={cn(
              "flex items-center justify-between text-sm p-2 rounded-xl transition-all duration-300 cursor-pointer",
              hoveredItem === index ? "bg-muted/50 scale-[1.02]" : "hover:bg-muted/30",
            )}
            onMouseEnter={() => setHoveredItem(index)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-4 h-4 rounded-lg transition-transform duration-300",
                  hoveredItem === index && "scale-125",
                )}
                style={{ backgroundColor: item.color }}
              />
              <span className="text-muted-foreground">{item.name}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{item.value}</span>
              <span className="text-muted-foreground">
                {total > 0 ? `(${((item.value / total) * 100).toFixed(1)}%)` : "(0%)"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}